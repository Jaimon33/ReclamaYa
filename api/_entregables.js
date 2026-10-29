// Generación de los documentos que recibe el cliente, a partir de plantillas y de datos confirmados.
import fs from 'node:fs';
import { Maquetador, anadirAnexos, guardar, rellenarFormularioOaut, textoSeguro, COLORES } from './_pdf.js';
import { canalReclamacion, COMPROBADO_COMPANIAS } from './_companias.js';
import { IVA } from './_facturas.js';
import { MARCA, PRESTADOR, PRODUCTOS, formatearPrecio, VERSION_PLANTILLAS } from './_config.js';
import { FUENTES, VERSION_REGLAS, fechaLarga, fechaCorta, euros, nombreOperador, sumarMeses, hoy } from './_reglas.js';
import { TIPOS_DOCUMENTO, CANALES, SERVICIOS, SERVICIO_GENERICO } from './_expediente.js';
import { seccionesCondiciones, VERSION_CONDICIONES } from './_condiciones.js';

const FORMULARIO_OAUT = new URL('./_recursos/formulario-oaut.pdf', import.meta.url);

export const OAUT = {
  nombre: 'Oficina de Atención al Usuario de Telecomunicaciones',
  direccion: [
    'Oficina de Atención al Usuario de Telecomunicaciones',
    'Secretaría de Estado de Telecomunicaciones e Infraestructuras Digitales',
    'Ministerio para la Transformación Digital y de la Función Pública',
    'Paseo de la Castellana 162, 28071 Madrid'
  ],
  sedeNueva: 'https://teleco.serviciosmin.gob.es/ReclamacionesTELCO_Nueva/Default.aspx',
  registroGeneral: 'https://reg.redsara.es',
  informacion: 'https://usuariosteleco.digital.gob.es/reclamaciones/telefonia-e-internet',
  telefonos: '91 945 89 74 y 901 33 66 99',
  comprobado: '2026-10-28'
};

function nombreArchivo(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'documento';
}

function contexto(exp) {
  const r = exp.respuestas;
  const d = exp.datos;
  const ev = exp.evaluacion;
  const operador = nombreOperador(r);
  return {
    r, d, ev, operador,
    t: d.titular,
    calculo: exp.calculo,
    fechaHoy: exp.fechaDocumento || hoy(),
    servicio: SERVICIOS[d.servicio || r.servicio] || SERVICIO_GENERICO,
    lineas: d.lineas,
    empresa: r.tipoTitular === 'empresa',
    etiquetaDoc: r.tipoTitular === 'empresa' ? 'CIF' : 'DNI/NIE',
    anexoDe: (tipoDoc) => exp.documentos.map((doc, i) => ({ doc, n: i + 1 })).filter(x => x.doc.tipoDoc === tipoDoc).map(x => x.n),
    anexoDeDocumento: (id) => exp.documentos.findIndex(doc => doc.id === id) + 1
  };
}

function listaAnexos(nums) {
  if (!nums.length) return '';
  return nums.length === 1 ? `anexo ${nums[0]}` : `anexos ${nums.slice(0, -1).join(', ')} y ${nums.at(-1)}`;
}

function hechoBaja(c) {
  const { r, d, ev, servicio } = c;
  const lineas = c.lineas ? `, asociado a ${c.lineas.includes(',') ? 'las líneas' : 'la línea'} ${c.lineas}` : '';
  const ref = d.bajaReferencia ? `, con número de referencia ${d.bajaReferencia}` : '';
  const deseada = r.fechaDeseada && r.fechaDeseada === ev.fechas.efectiva ? `, indicando que fuera efectiva el ${fechaLarga(r.fechaDeseada)}` : '';
  const prueba = c.anexoDe('prueba_baja');
  const acredita = prueba.length ? ` Lo acredito con el ${listaAnexos(prueba)}.` : '';
  const canal = CANALES[d.canalBaja] ? `, a través de ${CANALES[d.canalBaja]}` : '';
  return `El ${fechaLarga(r.fechaSolicitud)} solicité la baja del servicio de ${servicio}${lineas}${canal}${ref}${deseada}.${acredita}`;
}

function hechoEfectiva(c) {
  const { r, ev } = c;
  if (r.fechaDeseada && r.fechaDeseada === ev.fechas.efectiva) {
    return `Conforme al artículo 7 del Real Decreto 899/2009, la baja debía surtir efectos el ${fechaLarga(ev.fechas.efectiva)}, fecha que indiqué al solicitarla.`;
  }
  return `Conforme al artículo 7 del Real Decreto 899/2009, que exige comunicar la baja con dos días hábiles de antelación, la baja debía surtir efectos, como tarde, el ${fechaLarga(ev.fechas.efectiva)}.`;
}

function tablaImportes(m, c) {
  const filas = c.calculo.lineas.filter(l => l.reclamado > 0).map(l => [
    l.numero || '—',
    fechaCorta(l.fechaEmision),
    `${fechaCorta(l.periodoDesde)} a ${fechaCorta(l.periodoHasta)}`,
    euros(l.importeServicio),
    euros(l.reclamado),
    String(c.anexoDeDocumento(l.documento))
  ]);
  filas.push(['Total', '', '', '', euros(c.calculo.total), '']);
  m.tabla([
    { titulo: 'Factura', ancho: 0.17 },
    { titulo: 'Emisión', ancho: 0.14 },
    { titulo: 'Periodo facturado', ancho: 0.27 },
    { titulo: 'Importe del servicio', ancho: 0.16, alinear: 'derecha' },
    { titulo: 'Reclamado', ancho: 0.15, alinear: 'derecha' },
    { titulo: 'Anexo', ancho: 0.11, alinear: 'derecha' }
  ], filas, { total: true });
  for (const l of c.calculo.lineas.filter(x => x.tipo === 'parcial')) {
    m.texto(`La factura ${l.numero || ''} abarca del ${fechaLarga(l.periodoDesde)} al ${fechaLarga(l.periodoHasta)}: solo se reclama la parte proporcional a los ${l.diasReclamables} días posteriores a la baja (${l.diasReclamables} de ${l.totalDias} días sobre ${euros(l.importeServicio)}).`.replace('  ', ' '), { tam: 9 });
  }
}

function indiceDocumental(m, exp) {
  m.titulo('Documentos que se acompañan', { tam: 11 });
  m.tabla([
    { titulo: 'Anexo', ancho: 0.1 },
    { titulo: 'Documento', ancho: 0.34 },
    { titulo: 'Archivo aportado', ancho: 0.42 },
    { titulo: 'Páginas', ancho: 0.14, alinear: 'derecha' }
  ], exp.documentos.map((doc, i) => [String(i + 1), TIPOS_DOCUMENTO[doc.tipoDoc], doc.nombre, String(doc.paginas)]));
}

function firma(m, c, despues) {
  m.texto(c.empresa ? c.t.firmante : c.t.nombre, { fuente: 'negrita', despues: c.empresa ? 0 : despues });
  if (c.empresa) m.texto(`En nombre y representación de ${c.t.nombre}`, { despues });
}

function cabeceraRemitente(m, c) {
  const { t } = c;
  m.texto(t.nombre, { fuente: 'negrita', despues: 0 });
  m.texto(`${c.etiquetaDoc}: ${t.documento}`, { despues: 0 });
  if (c.empresa) m.texto(`Representada por: ${t.firmante}`, { despues: 0 });
  const domicilio = [t.domicilio, [t.cp, t.localidad].filter(Boolean).join(' '), t.provincia].filter(Boolean).join(', ');
  if (domicilio) m.texto(domicilio, { despues: 0 });
  m.texto([t.email, t.telefono].filter(Boolean).join(' · '), { despues: 14 });
}

// ——— Recorrido A: escrito al operador ———

// El escrito lleva la cabecera de la marca, pero sin marca de agua: es el documento que presenta el cliente.
function crearEscrito(pdf = null) {
  return Maquetador.crear(pdf, { marca: true, nombreMarca: MARCA.nombre, agua: false });
}

async function documentoEscritoA(exp, anexos, { vistaPrevia = false } = {}) {
  const c = contexto(exp);
  const { d, t, calculo } = c;
  const m = await crearEscrito();
  m.nuevaPagina();
  m.cabecera('Reclamación por cobros posteriores a la baja', `Dirigida a ${c.operador} · referencia ${exp.referencia}`);
  m.datosClave([['Titular', t.nombre], ['Compañía', c.operador], ['Importe reclamado', euros(calculo.total)]]);
  cabeceraRemitente(m, c);
  m.texto('A la atención del Servicio de Atención al Cliente', { despues: 0 });
  m.texto(d.razonSocialOperador ? `${c.operador} (${d.razonSocialOperador})` : c.operador, { fuente: 'negrita', despues: 14 });
  m.texto(`${t.localidad ? `En ${t.localidad}, a ` : ''}${fechaLarga(c.fechaHoy)}`, { alinear: 'derecha', despues: 12 });
  const ref = [d.numeroCliente && `Cliente o contrato nº ${d.numeroCliente}`, c.lineas && `Línea(s): ${c.lineas}`].filter(Boolean).join(' · ');
  m.texto(`Asunto: Reclamación por cobros posteriores a la baja del servicio${ref ? ` · ${ref}` : ''}`, { fuente: 'negrita', despues: 12 });

  m.texto(`${c.empresa ? `${t.firmante}, en nombre y representación de ${t.nombre}, con CIF ${t.documento},` : `${t.nombre}, con DNI/NIE ${t.documento},`} titular del contrato${d.numeroCliente ? ` nº ${d.numeroCliente}` : ''} con ${c.operador}, presento esta reclamación por los cobros realizados después de la baja del servicio.`);

  m.titulo('Hechos', { tam: 11 });
  m.texto(`1. ${hechoBaja(c)}`);
  m.texto(`2. ${hechoEfectiva(c)}`);
  m.texto('3. Pese a ello, se me han facturado cantidades correspondientes a periodos posteriores a esa fecha:');
  tablaImportes(m, c);
  if (vistaPrevia) {
    m.velarResto('El resto se desbloquea al pagar', 'Fundamentos legales con la norma citada, lo que pides a la compañía, el espacio para tu firma, el índice de documentos y tus archivos como anexos numerados.');
    return guardar(m.doc, 'Vista previa');
  }
  m.texto(`4. El importe facturado por periodos posteriores a la baja asciende a ${euros(calculo.total)}.`);
  if (d.resumenCaso) m.texto(`5. Añado, en mis palabras: «${d.resumenCaso}»`);

  m.titulo('Fundamentos', { tam: 11 });
  m.texto(`El artículo 7 del Real Decreto 899/2009, de 22 de mayo, por el que se aprueba la carta de derechos del usuario de los servicios de comunicaciones electrónicas, establece: «${FUENTES.rd899_art7.cita}»`);
  m.texto('El artículo 26.2 del mismo real decreto obliga al operador a comunicar al abonado el número de referencia de sus reclamaciones.');

  m.titulo('Solicito', { tam: 11 });
  m.texto(`1. Que se anulen los cargos indicados y se me devuelvan ${euros(calculo.total)} por el mismo medio por el que se cobraron.`);
  m.texto(`2. Que se me confirme por escrito que el servicio está dado de baja con efectos del ${fechaLarga(c.ev.fechas.efectiva)} y que no se emitirán nuevos cargos por él.`);
  m.texto('3. Que se me facilite el número de referencia de esta reclamación.');
  m.texto(`Si en el plazo de un mes no recibo respuesta o no se resuelve lo solicitado, podré acudir a la ${OAUT.nombre}.`, { despues: 18 });

  m.texto('Firma:', { despues: 30 });
  firma(m, c, 16);
  m.separador();
  indiceDocumental(m, exp);
  m.numerar(`Reclamación de ${t.nombre} a ${c.operador} · ref. ${exp.referencia}`);
  await anadirAnexos(m, anexos);
  return guardar(m.doc, `Reclamación a ${c.operador}`);
}

function crearConMarca(pdf = null) {
  return Maquetador.crear(pdf, { marca: true, nombreMarca: MARCA.nombre });
}

// Pasos de una guía: cada paso es [título, [párrafo | (m) => {...}]].
function pintarPasos(m, pasos) {
  for (const [titulo, partes] of pasos) {
    m.titulo(titulo, { tam: 12, despues: 4 });
    for (const p of partes) typeof p === 'function' ? p(m) : m.texto(p);
    m.espacio(4);
  }
}

async function documentoGuiaA(exp) {
  const c = contexto(exp);
  const canal = canalReclamacion(c.r.operador);
  const m = await crearConMarca();
  m.nuevaPagina();
  m.cabecera('Cómo presentar tu reclamación', `Guía de presentación · referencia ${exp.referencia}`);
  m.datosClave([
    ['Compañía', c.operador],
    ['Importe reclamado', euros(c.calculo.total)],
    ...(c.ev.fechas.limiteReclamarOperador ? [['Preséntala antes del', fechaCorta(c.ev.fechas.limiteReclamarOperador)]] : [['Respuesta en', '1 mes']])
  ]);
  const presentar = canal
    ? [
        `Entra en la página oficial de reclamaciones de ${c.operador} y presenta la reclamación adjuntando el PDF completo:`,
        (mm) => mm.enlace(`Ir a la página de reclamaciones de ${c.operador}`, canal.url),
        ...(canal.nota ? [canal.nota] : []),
        ...(canal.email ? [`También puedes enviarla por email a ${canal.email}, con el PDF adjunto.`] : []),
        ...(canal.telefono ? [`Si llamas al ${canal.telefono}, pide que te den el número de referencia de tu reclamación y un justificante: están obligados a dártelo (artículo 26.2 del Real Decreto 899/2009).`] : []),
        `Usa siempre un canal que deje constancia de la fecha y del contenido. Si la web no te deja adjuntar el PDF, puedes enviarlo por burofax con certificación de contenido (tiene coste).`
      ]
    : [
        `Busca en la web oficial de ${c.operador} el apartado de reclamaciones o atención al cliente y usa un canal que te permita adjuntar el PDF y te dé un justificante: formulario de reclamación del área de cliente, correo electrónico de atención al cliente o burofax con certificación de contenido (tiene coste).`,
        'Si reclamas por teléfono, pide el número de referencia y un documento que acredite la presentación y el contenido de tu reclamación: la compañía está obligada a dártelo (artículo 26.2 del Real Decreto 899/2009).'
      ];
  pintarPasos(m, [
    ['1. Revisa y firma', [
      'Abre el PDF de la reclamación y comprueba tus datos, las fechas y los importes. Si ves un error, escríbenos antes de presentarlo y lo corregimos sin coste.',
      'Fírmalo: a mano (imprímelo, fírmalo y escanéalo o fotografíalo) o con tu firma electrónica si la tienes.'
    ]],
    [`2. Preséntala a ${c.operador}`, presentar],
    ['3. Guarda las pruebas', [
      'Guarda el justificante de envío, la fecha y el número de referencia de la reclamación, y cualquier respuesta de la compañía.'
    ]],
    ['4. Si no te contestan o no te dan la razón', [
      `La compañía tiene un mes para responder. Si presentas la reclamación hoy, ese mes terminaría el ${fechaLarga(sumarMeses(c.fechaHoy, 1))}.`,
      `Si no responde o no lo resuelve, tienes tres meses para acudir gratis a la ${OAUT.nombre}. Podemos prepararte ese expediente con el formulario oficial cumplimentado.`,
      ...(c.ev.fechas.limiteReclamarOperador ? [`Para conservar esa opción, presenta la reclamación antes del ${fechaLarga(c.ev.fechas.limiteReclamarOperador)} (un mes desde que recibiste la factura).`] : [])
    ]],
    ['Recuerda', [
      'Reclamar a la compañía y a la Oficina es gratuito. Lo que has pagado es la preparación de la documentación.',
      'No podemos garantizar el resultado: depende de la compañía y de tus pruebas. Este documento no es asesoramiento jurídico personalizado.'
    ]]
  ]);
  m.separador();
  m.texto(`Reglas aplicadas (versión ${VERSION_REGLAS}): ${FUENTES.rd899_art7.norma}, ${FUENTES.rd899_art7.articulo.toLowerCase()} y art. 26.2; Orden ITC/1030/2007, art. 4. Comprobadas en fuentes oficiales el ${fechaLarga(FUENTES.rd899_art7.comprobado)}.${canal ? ` Página de reclamaciones de ${c.operador} comprobada el ${fechaLarga(COMPROBADO_COMPANIAS)}.` : ''}`, { tam: 8, color: COLORES.gris });
  m.numerar(`Guía de presentación · ref. ${exp.referencia}`);
  return guardar(m.doc, 'Guía de presentación');
}

// ——— Recorrido B: expediente para la Oficina ———

function textosFormulario(exp, c) {
  const { r, d, ev, calculo } = c;
  const facturas = calculo.lineas.filter(l => l.reclamado > 0).map(l => l.numero).filter(Boolean);
  const respuesta = r.respuesta === 'sin_respuesta'
    ? 'sin respuesta en el plazo de un mes'
    : `y su respuesta del ${fechaCorta(r.fechaRespuesta)} no lo resolvió`;
  const motivo = `Cobros posteriores a la baja. Solicité la baja del servicio de ${c.servicio} el ${fechaCorta(r.fechaSolicitud)}${d.bajaReferencia ? ` (ref. ${d.bajaReferencia})` : ''}; debía surtir efectos el ${fechaCorta(ev.fechas.efectiva)} (art. 7 RD 899/2009). ${c.operador} me ha facturado periodos posteriores por un total de ${euros(calculo.total)}${facturas.length ? ` (${facturas.length === 1 ? 'factura' : 'facturas'} ${facturas.join(', ')})` : ''}. Reclamé al operador el ${fechaCorta(r.fechaReclamacion)}${d.reclamacionReferencia ? ` (ref. ${d.reclamacionReferencia})` : ''} ${respuesta}. Detalle en el escrito explicativo y la relación de importes que se adjuntan.`;
  const pretensiones = `Que se anulen los cargos facturados por periodos posteriores al ${fechaCorta(ev.fechas.efectiva)} y se ordene al operador la devolución de ${euros(calculo.total)}. Que se confirme la baja del servicio con efectos del ${fechaCorta(ev.fechas.efectiva)}.`;
  const lista = exp.documentos.map((doc, i) => `Anexo ${i + 1}: ${TIPOS_DOCUMENTO[doc.tipoDoc]}`).join('; ');
  let documentacion = `Escrito explicativo y relación de importes. ${lista}.`;
  if (documentacion.length > 300) documentacion = `Escrito explicativo, relación de importes e índice con ${exp.documentos.length} anexos (facturas, prueba de la baja, reclamación previa${exp.documentos.some(x => x.tipoDoc === 'respuesta_operador') ? ' y respuesta del operador' : ''}).`;
  return { motivo, pretensiones, documentacion };
}

async function formularioB(exp) {
  const c = contexto(exp);
  const { t } = c;
  const textos = textosFormulario(exp, c);
  return rellenarFormularioOaut(fs.readFileSync(FORMULARIO_OAUT), {
    tipoTitular: c.r.tipoTitular,
    documento: t.documento,
    nombre: t.nombre,
    representante: c.empresa ? t.firmante : '',
    domicilio: t.domicilio,
    localidad: t.localidad,
    cp: t.cp,
    provincia: t.provincia,
    operador: c.d.razonSocialOperador ? `${c.operador} (${c.d.razonSocialOperador})` : c.operador,
    lineas: c.lineas,
    ...textos
  });
}

async function escribirExplicacionB(m, exp, { vistaPrevia = false } = {}) {
  const c = contexto(exp);
  const { r, d, t, ev, calculo } = c;
  m.nuevaPagina();
  m.cabecera('Escrito explicativo de la reclamación', `Anexo al formulario oficial · ${OAUT.nombre} · ref. ${exp.referencia}`);
  m.datosClave([['Reclamante', t.nombre], ['Compañía', c.operador], ['Importe reclamado', euros(calculo.total)]]);
  m.texto(`Reclamante: ${t.nombre}, ${c.etiquetaDoc} ${t.documento}${c.empresa ? `, representada por ${t.firmante}` : ''}. Operador reclamado: ${c.operador}${d.razonSocialOperador ? ` (${d.razonSocialOperador})` : ''}.${d.numeroCliente ? ` Cliente o contrato nº ${d.numeroCliente}.` : ''}${c.lineas ? ` Línea(s): ${c.lineas}.` : ''}`);
  m.titulo('Hechos', { tam: 11 });
  m.texto(`1. ${hechoBaja(c)}`);
  m.texto(`2. ${hechoEfectiva(c)}`);
  m.texto('3. El operador me ha facturado cantidades por periodos posteriores a esa fecha, según la relación de importes siguiente.');
  if (vistaPrevia) {
    m.velarResto('El resto se desbloquea al pagar', 'Tu reclamación previa a la compañía, los fundamentos legales, tus pretensiones, la relación de importes, el formulario oficial cumplimentado y tus documentos como anexos numerados.');
    return;
  }
  const recl = c.anexoDe('reclamacion');
  m.texto(`4. El ${fechaLarga(r.fechaReclamacion)} reclamé al operador${CANALES[d.canalReclamacion] ? ` a través de ${CANALES[d.canalReclamacion]}` : ''}${d.reclamacionReferencia ? `, con número de referencia ${d.reclamacionReferencia}` : ''}${recl.length ? ` (${listaAnexos(recl)})` : ''}.`);
  if (r.respuesta === 'sin_respuesta') {
    m.texto(`5. No he recibido respuesta en el plazo de un mes, que terminó el ${fechaLarga(sumarMeses(r.fechaReclamacion, 1))}.`);
  } else {
    const resp = c.anexoDe('respuesta_operador');
    m.texto(`5. El ${fechaLarga(r.fechaRespuesta)} el operador respondió${d.respuestaResumen ? ` lo siguiente: ${d.respuestaResumen.replace(/\.$/, '')}` : ''}${resp.length ? ` (${listaAnexos(resp)})` : ''}. Esa respuesta no anula los cargos ni devuelve lo cobrado.`);
  }
  if (d.resumenCaso) m.texto(`Añado, en mis palabras: «${d.resumenCaso}»`);
  m.texto(`6. Presento esta reclamación dentro del plazo de tres meses del artículo 4.3 de la Orden ITC/1030/2007, que termina el ${fechaLarga(ev.fechas.limiteOaut)}.`);
  m.titulo('Fundamentos', { tam: 11 });
  m.texto(`Artículo 7 del Real Decreto 899/2009: «${FUENTES.rd899_art7.cita}»`);
  m.texto('Orden ITC/1030/2007: el artículo 3.1 incluye en el ámbito del procedimiento la disconformidad con la factura recibida y la demora en tramitar la baja; el artículo 9.1 permite anular facturas y ordenar la devolución de importes indebidamente facturados.');
  m.titulo('Pretensiones', { tam: 11 });
  m.texto(`1. Que se declare improcedente el cobro de las cantidades facturadas por periodos posteriores al ${fechaLarga(ev.fechas.efectiva)}, se anulen esos cargos y se ordene al operador la devolución de ${euros(calculo.total)}.`);
  m.texto(`2. Que se confirme la baja del servicio con efectos del ${fechaLarga(ev.fechas.efectiva)}.`);
  m.asegurar(130); // que el título no quede solo al pie de la página
  m.titulo('Relación de importes reclamados', { tam: 11 });
  tablaImportes(m, c);
  m.texto(`En ${t.localidad}, a ______ de ____________ de ______`, { despues: 26 });
  m.texto('Firma:', { despues: 30 });
  firma(m, c, 14);
  m.separador();
  indiceDocumental(m, exp);
  m.numerar(`Escrito explicativo de ${t.nombre} · ref. ${exp.referencia}`);
}

async function documentoExpedienteB(exp, anexos) {
  const doc = await formularioB(exp);
  const m = await crearEscrito(doc);
  await escribirExplicacionB(m, exp);
  await anadirAnexos(m, anexos);
  return guardar(m.doc, `Reclamación ante la ${OAUT.nombre}`);
}

async function documentoExplicacionB(exp) {
  const m = await crearEscrito();
  await escribirExplicacionB(m, exp);
  return guardar(m.doc, 'Escrito explicativo');
}

// Primera página del escrito, con el resto tapado, para enseñarla antes de pagar.
export async function documentoVistaPrevia(exp) {
  if (exp.evaluacion.producto === 'operador') return documentoEscritoA(exp, [], { vistaPrevia: true });
  const m = await crearEscrito();
  await escribirExplicacionB(m, exp, { vistaPrevia: true });
  return guardar(m.doc, 'Vista previa');
}

async function documentoGuiaB(exp) {
  const c = contexto(exp);
  const m = await crearConMarca();
  m.nuevaPagina();
  m.cabecera(`Cómo presentar tu reclamación ante la Oficina`, `${OAUT.nombre} · referencia ${exp.referencia}`);
  m.datosClave([
    ['Compañía', c.operador],
    ['Importe reclamado', euros(c.calculo.total)],
    ['Preséntala antes del', fechaCorta(c.ev.fechas.limiteOaut)]
  ]);
  pintarPasos(m, [
    ['1. Revisa y firma', [
      'Comprueba tus datos en el formulario oficial (páginas 1 y 2 del expediente) y en el escrito explicativo.',
      'En la página 2 del formulario: escribe la fecha, firma y marca la casilla en la que declaras que las copias coinciden con los originales. Firma también el escrito explicativo.',
      ...(c.empresa
        ? ['Como el titular es una empresa, la Oficina solo la admite si es una microempresa (menos de 10 trabajadores). Añade la declaración responsable de microempresa, firmada:',
          (mm) => mm.enlace('Descargar la declaración responsable de microempresa', 'https://usuariosteleco.digital.gob.es/content/dam/usuarios-teleco/documents/microempresa.pdf'),
          'Hemos puesto como representante a la persona que firma; añade su NIF en el apartado 2 del formulario.']
        : ['Los apartados del representante quedan en blanco: solo se rellenan si presenta otra persona en tu nombre, con el modelo de autorización de la Oficina.'])
    ]],
    ['2. Preséntala por internet', [
      'Con certificado digital o DNI electrónico, en el formulario de reclamaciones de la Oficina:',
      (mm) => mm.enlace('Abrir el formulario de reclamaciones de la Oficina', OAUT.sedeNueva),
      `Con Cl@ve, a través del Registro Electrónico General, dirigido a la ${OAUT.nombre}:`,
      (mm) => mm.enlace('Abrir el Registro Electrónico General', OAUT.registroGeneral),
      'Adjunta el formulario firmado (o rellena el formulario web con los mismos datos), el escrito explicativo y los anexos. Te los damos también por separado para que puedas subirlos uno a uno. Si la sede rechaza algún archivo por tamaño, súbelo por separado o usa el papel.'
    ]],
    ['O en papel', [
      'Imprime el expediente completo (formulario, escrito explicativo y anexos), firma donde corresponde y no grapes los documentos.',
      `Envíalo por correo postal a: ${OAUT.direccion.join(', ')}.`,
      'También puedes entregarlo en cualquier oficina de registro de la Administración (del Estado, de tu comunidad autónoma o de tu ayuntamiento, artículo 16 de la Ley 39/2015) o en Correos. Pide y guarda el justificante.'
    ]],
    ['3. Qué pasa después', [
      'La Oficina da traslado a la compañía, que tiene 15 días para aportar su versión; después puedes presentar alegaciones en 15 días.',
      'El plazo máximo para resolver es de seis meses. La resolución agota la vía administrativa: cabe recurso potestativo de reposición en un mes o recurso contencioso-administrativo en dos meses.',
      `Teléfonos de información de la Oficina: ${OAUT.telefonos}.`,
      (mm) => mm.enlace('Información oficial de la Oficina', OAUT.informacion)
    ]],
    ['Recuerda', [
      'La reclamación ante la Oficina es gratuita. Lo que has pagado es la preparación de la documentación.',
      'No podemos garantizar que la Oficina la admita ni que la resuelva a tu favor. Este documento no es asesoramiento jurídico personalizado.'
    ]]
  ]);
  m.separador();
  m.texto(`Información de presentación comprobada en las páginas oficiales de la Oficina el ${fechaLarga(OAUT.comprobado)}. Formulario oficial descargado de usuariosteleco.digital.gob.es en esa fecha; su texto conserva referencias a la Ley 9/2014 y a un ministerio anterior, tal como lo publica la Oficina. Reglas: versión ${VERSION_REGLAS}.`, { tam: 8, color: COLORES.gris });
  m.numerar(`Guía de presentación · ref. ${exp.referencia}`);
  return guardar(m.doc, 'Guía de presentación ante la Oficina');
}

// ——— Confirmación del pedido (soporte duradero) ———

export async function documentoConfirmacion(exp) {
  const producto = PRODUCTOS[exp.pago.producto];
  const m = await crearConMarca();
  m.nuevaPagina();
  m.cabecera('Confirmación del pedido', `${PRESTADOR.titular} · NIF ${PRESTADOR.nif} · ${PRESTADOR.domicilio} · ${PRESTADOR.email}`);
  m.datosClave([
    ['Referencia', exp.referencia],
    ['Fecha del pago', fechaCorta(exp.pago.pagadoEn.slice(0, 10))],
    ['Precio (IVA incl.)', formatearPrecio(exp.pago.importeCentimos)]
  ]);
  m.texto(`Servicio: ${producto.nombre}`, { fuente: 'negrita' });
  m.texto(`Incluye: ${producto.entrega.join('; ')}.`);
  if (exp.factura) m.texto(`Factura: ${exp.factura.numero}, que se adjunta por separado.`);
  m.texto(`Pediste que preparáramos los documentos de inmediato y reconociste que, una vez preparados y a tu disposición, pierdes el derecho de desistimiento (aceptado el ${fechaLarga(exp.aceptacion.fecha.slice(0, 10))}). Tus derechos si el servicio tiene defectos no se ven afectados.`);
  m.separador();
  m.titulo(`Condiciones de contratación (versión ${VERSION_CONDICIONES})`, { tam: 12 });
  for (const s of seccionesCondiciones()) {
    m.titulo(s.titulo, { tam: 10, despues: 2 });
    s.parrafos.forEach(p => m.texto(p, { tam: 9 }));
  }
  m.numerar(`Confirmación del pedido ${exp.referencia}`);
  return guardar(m.doc, 'Confirmación del pedido');
}

// ——— Factura ———

export async function documentoFactura(exp) {
  const f = exp.factura;
  const producto = PRODUCTOS[f.producto];
  const completa = Boolean(f.cliente.domicilio);
  const m = await crearConMarca();
  m.nuevaPagina();
  m.cabecera(completa ? 'Factura' : 'Factura simplificada', `Nº ${f.numero} · fecha de expedición ${fechaCorta(f.fecha)}`);
  m.datosClave([['Número', f.numero], ['Fecha', fechaCorta(f.fecha)], ['Total', formatearPrecio(f.importes.total)]]);
  m.titulo('Emisor', { tam: 10.5, despues: 2 });
  m.texto(`${PRESTADOR.titular} · NIF ${PRESTADOR.nif}`, { despues: 0 });
  m.texto(`${PRESTADOR.domicilio} · ${PRESTADOR.email}`, { despues: 10 });
  m.titulo('Cliente', { tam: 10.5, despues: 2 });
  m.texto(`${f.cliente.nombre} · ${/^[A-Z]/.test(f.cliente.documento) && !/^[XYZ]/.test(f.cliente.documento) ? 'CIF' : 'NIF'} ${f.cliente.documento}`, { despues: 0 });
  if (completa) m.texto(f.cliente.domicilio, { despues: 0 });
  m.espacio(12);
  const euro = (cent) => formatearPrecio(cent);
  m.tabla([
    { titulo: 'Concepto', ancho: 0.52 },
    { titulo: 'Base imponible', ancho: 0.17, alinear: 'derecha' },
    { titulo: `IVA ${IVA} %`, ancho: 0.13, alinear: 'derecha' },
    { titulo: 'Total', ancho: 0.18, alinear: 'derecha' }
  ], [
    [`${producto.nombre}: preparación de la documentación (ref. ${f.referencia})`, euro(f.importes.base), euro(f.importes.cuota), euro(f.importes.total)],
    ['Total factura', euro(f.importes.base), euro(f.importes.cuota), euro(f.importes.total)]
  ], { total: true });
  m.texto(`Fecha de la operación: ${fechaLarga(f.fecha)}. Pagado con tarjeta a través de Stripe.`, { tam: 9, color: COLORES.gris });
  if (f.serie !== 'LC') m.texto('Documento de prueba generado en un entorno de pruebas: no es una factura válida.', { tam: 9, fuente: 'negrita' });
  m.numerar(`Factura ${f.numero}`);
  return guardar(m.doc, `Factura ${f.numero}`);
}

// Genera todos los archivos del pedido. Devuelve [{ codigo, nombre, bytes }].
export async function generarEntregables(exp, anexos) {
  const operador = nombreArchivo(nombreOperador(exp.respuestas));
  const ref = exp.referencia;
  const archivos = [];
  if (exp.pago.producto === 'operador') {
    archivos.push({ codigo: 'reclamacion', nombre: `Reclamacion-${operador}-${ref}.pdf`, bytes: await documentoEscritoA(exp, anexos), principal: true });
    archivos.push({ codigo: 'guia', nombre: `Guia-de-presentacion-${ref}.pdf`, bytes: await documentoGuiaA(exp) });
  } else {
    archivos.push({ codigo: 'expediente', nombre: `Expediente-Oficina-${ref}.pdf`, bytes: await documentoExpedienteB(exp, anexos), principal: true });
    archivos.push({ codigo: 'formulario', nombre: `Formulario-oficial-${ref}.pdf`, bytes: await guardar(await formularioB(exp), 'Formulario de reclamación') });
    archivos.push({ codigo: 'explicacion', nombre: `Escrito-explicativo-${ref}.pdf`, bytes: await documentoExplicacionB(exp) });
    archivos.push({ codigo: 'guia', nombre: `Guia-de-presentacion-${ref}.pdf`, bytes: await documentoGuiaB(exp) });
  }
  archivos.push({ codigo: 'confirmacion', nombre: `Confirmacion-del-pedido-${ref}.pdf`, bytes: await documentoConfirmacion(exp) });
  if (exp.factura) archivos.push({ codigo: 'factura', nombre: `Factura-${nombreArchivo(exp.factura.numero)}.pdf`, bytes: await documentoFactura(exp) });
  return archivos;
}

// Lista de anexos en el orden del expediente, con la descripción que aparece en el índice.
export function prepararAnexos(exp, binarios) {
  return exp.documentos.map((doc, i) => ({
    nombre: textoSeguro(doc.nombre),
    tipo: doc.tipo,
    paginas: doc.paginas,
    descripcion: TIPOS_DOCUMENTO[doc.tipoDoc],
    bytes: binarios[i]
  }));
}

export { VERSION_PLANTILLAS };
