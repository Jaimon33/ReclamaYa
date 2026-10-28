// Lógica del expediente: propuesta de datos a partir de los documentos, validación de lo que
// confirma el cliente, cálculo de importes y resumen previo al pago (sin el escrito).
import { PRODUCTOS } from './_config.js';
import {
  calcularImportes, validarFactura, evaluarCaso, esFecha, hoy, nombreOperador, fechaLarga, fechaCorta, euros
} from './_reglas.js';
import { sugerirImporteServicio } from './_extraccion.js';

export const TIPOS_DOCUMENTO = {
  factura: 'Factura posterior a la baja',
  prueba_baja: 'Prueba de la solicitud de baja',
  reclamacion: 'Reclamación al operador',
  respuesta_operador: 'Respuesta del operador',
  contrato: 'Contrato o condiciones',
  otro: 'Otro documento'
};

export const CANALES = {
  telefono: 'atención telefónica',
  web: 'la web o la app del operador',
  escrito: 'correo electrónico o escrito',
  tienda: 'una tienda del operador',
  otro: 'otro canal'
};

export const SERVICIOS = {
  fibra: 'acceso a internet (fibra o ADSL)',
  movil: 'telefonía móvil',
  fijo: 'telefonía fija',
  paquete: 'paquete de servicios (fibra, fijo y/o móvil)'
};

function normalizarNombre(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Une lo extraído de todos los documentos en una propuesta, con la fuente de cada dato
// y avisos cuando hay contradicciones o datos que conviene revisar.
export function construirPropuesta(exp) {
  const r = exp.respuestas;
  const alertas = [];
  const candidatos = { nombre: [], documento: [], numeroCliente: [], lineas: [], razonSocial: [], bajaRef: [], reclamacionRef: [], respuestaResumen: [] };
  const facturas = [];
  const fuente = (doc, pagina) => ({ documento: doc.id, archivo: doc.nombre, pagina: pagina || 1 });

  for (const doc of exp.documentos) {
    const x = doc.extraccion;
    if (!x) continue;
    if (x.contieneInstrucciones) alertas.push(`"${doc.nombre}" contiene texto con instrucciones o peticiones. Lo hemos ignorado; revisa los datos que te proponemos.`);
    if (!x.legible || x.tipoDocumento === 'ilegible') alertas.push(`No hemos podido leer bien "${doc.nombre}". Comprueba que se ve completo y nítido, o súbelo de nuevo.`);
    if (x.titularNombre) candidatos.nombre.push({ valor: x.titularNombre, fuente: fuente(doc, x.factura.pagina) });
    if (x.titularDocumento) candidatos.documento.push({ valor: x.titularDocumento, fuente: fuente(doc, x.factura.pagina) });
    if (x.numeroCliente) candidatos.numeroCliente.push({ valor: x.numeroCliente, fuente: fuente(doc, x.factura.pagina) });
    x.lineas.forEach(l => candidatos.lineas.push({ valor: l, fuente: fuente(doc, x.factura.pagina) }));
    if (x.razonSocialOperador) candidatos.razonSocial.push({ valor: x.razonSocialOperador, fuente: fuente(doc, x.factura.pagina) });

    const operadorElegido = normalizarNombre(nombreOperador(r));
    const operadorDoc = normalizarNombre(`${x.operador} ${x.razonSocialOperador}`);
    if (operadorElegido && operadorDoc && !operadorDoc.includes(operadorElegido) && !operadorElegido.includes(normalizarNombre(x.operador))) {
      alertas.push(`"${doc.nombre}" parece de ${x.operador || x.razonSocialOperador}, pero indicaste ${nombreOperador(r)}. Comprueba que el documento es de tu operador.`);
    }

    if (x.baja.referencia) candidatos.bajaRef.push({ valor: x.baja.referencia, fuente: fuente(doc, x.baja.pagina) });
    if (x.baja.fechaSolicitud && r.fechaSolicitud && x.baja.fechaSolicitud !== r.fechaSolicitud) {
      alertas.push(`"${doc.nombre}" (pág. ${x.baja.pagina || 1}) indica que la baja se pidió el ${fechaLarga(x.baja.fechaSolicitud)}, pero indicaste el ${fechaLarga(r.fechaSolicitud)}. Si la fecha correcta es la del documento, vuelve al paso 1 y corrígela.`);
    }
    if (x.reclamacion.referencia) candidatos.reclamacionRef.push({ valor: x.reclamacion.referencia, fuente: fuente(doc, x.reclamacion.pagina) });
    if (x.reclamacion.fecha && r.fechaReclamacion && x.reclamacion.fecha !== r.fechaReclamacion && doc.tipoDoc === 'reclamacion') {
      alertas.push(`"${doc.nombre}" indica que reclamaste el ${fechaLarga(x.reclamacion.fecha)}, pero indicaste el ${fechaLarga(r.fechaReclamacion)}. Revisa la fecha en el paso 1.`);
    }
    if (x.respuesta.resumen) candidatos.respuestaResumen.push({ valor: x.respuesta.resumen, fuente: fuente(doc, x.respuesta.pagina) });
    if (x.respuesta.fecha && r.fechaRespuesta && x.respuesta.fecha !== r.fechaRespuesta && doc.tipoDoc === 'respuesta_operador') {
      alertas.push(`"${doc.nombre}" tiene fecha de respuesta ${fechaLarga(x.respuesta.fecha)}, pero indicaste el ${fechaLarga(r.fechaRespuesta)}. Revisa la fecha en el paso 1.`);
    }

    if (doc.tipoDoc === 'factura' || x.tipoDocumento === 'factura') {
      const sugerencia = sugerirImporteServicio(x.factura);
      facturas.push({
        documento: doc.id,
        numero: x.factura.numero,
        fechaEmision: x.factura.fechaEmision,
        periodoDesde: x.factura.periodoDesde,
        periodoHasta: x.factura.periodoHasta,
        importeTotal: x.factura.importeTotal,
        importeServicio: sugerencia.importe,
        conceptosExcluidos: sugerencia.excluidos,
        revisar: Boolean(sugerencia.revisar) || !x.factura.periodoDesde || !x.factura.periodoHasta || sugerencia.importe == null,
        fuente: fuente(doc, x.factura.pagina)
      });
      if (!x.factura.periodoDesde || !x.factura.periodoHasta) alertas.push(`No encontramos el periodo facturado en "${doc.nombre}". Búscalo en la factura (suele poner "periodo de facturación") y escríbelo.`);
      if (sugerencia.excluidos.length) alertas.push(`"${doc.nombre}" incluye conceptos que no reclamamos (${sugerencia.excluidos.join(', ')}). Revisa que el importe del servicio solo incluya cuotas y consumos, con IVA.`);
      if (x.factura.fechaEmision && r.fechaSolicitud && x.factura.fechaEmision < r.fechaSolicitud) alertas.push(`"${doc.nombre}" se emitió antes de pedir la baja. Comprueba si de verdad es una factura posterior.`);
    }
  }

  const elegir = (lista) => {
    if (!lista.length) return { valor: '', fuentes: [] };
    const conteo = new Map();
    lista.forEach(c => conteo.set(normalizarNombre(c.valor), [...(conteo.get(normalizarNombre(c.valor)) || []), c]));
    const grupos = [...conteo.values()].sort((a, b) => b.length - a.length);
    return { valor: grupos[0][0].valor, fuentes: grupos[0].map(c => c.fuente), alternativas: grupos.slice(1).map(g => g[0].valor) };
  };

  const nombre = elegir(candidatos.nombre);
  const documento = elegir(candidatos.documento);
  if (nombre.alternativas?.length) alertas.push(`Los documentos muestran titulares distintos (${[nombre.valor, ...nombre.alternativas].join(' / ')}). Solo puedes reclamar como titular del contrato.`);
  if (documento.alternativas?.length) alertas.push('Los documentos muestran DNI o NIE distintos. Revisa el tuyo.');

  return {
    titular: { nombre, documento },
    numeroCliente: elegir(candidatos.numeroCliente),
    lineas: { valor: [...new Set(candidatos.lineas.map(l => l.valor))].join(', '), fuentes: candidatos.lineas.map(l => l.fuente) },
    razonSocialOperador: elegir(candidatos.razonSocial),
    bajaReferencia: elegir(candidatos.bajaRef),
    reclamacionReferencia: elegir(candidatos.reclamacionRef),
    respuestaResumen: elegir(candidatos.respuestaResumen),
    facturas,
    alertas: [...new Set(alertas)]
  };
}

// ——— Validación de los datos confirmados ———

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function documentoValido(doc) {
  const d = String(doc || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  let m = d.match(/^(\d{8})([A-Z])$/);
  if (m) return LETRAS_DNI[Number(m[1]) % 23] === m[2];
  m = d.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (m) return LETRAS_DNI[Number(`${'XYZ'.indexOf(m[1])}${m[2]}`) % 23] === m[3];
  return false;
}

function txt(v, max) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function limpiarDatos(entrada = {}, exp) {
  const t = entrada.titular || {};
  const idsDocs = new Set(exp.documentos.map(d => d.id));
  return {
    titular: {
      nombre: txt(t.nombre, 100),
      documento: txt(t.documento, 12).toUpperCase().replace(/[^0-9A-Z]/g, ''),
      email: txt(t.email, 120).toLowerCase(),
      telefono: txt(t.telefono, 20),
      domicilio: txt(t.domicilio, 140),
      cp: txt(t.cp, 5),
      localidad: txt(t.localidad, 60),
      provincia: txt(t.provincia, 40)
    },
    numeroCliente: txt(entrada.numeroCliente, 40),
    lineas: txt(entrada.lineas, 120),
    razonSocialOperador: txt(entrada.razonSocialOperador, 100),
    canalBaja: Object.keys(CANALES).includes(entrada.canalBaja) ? entrada.canalBaja : '',
    bajaReferencia: txt(entrada.bajaReferencia, 40),
    canalReclamacion: Object.keys(CANALES).includes(entrada.canalReclamacion) ? entrada.canalReclamacion : '',
    reclamacionReferencia: txt(entrada.reclamacionReferencia, 40),
    respuestaResumen: txt(entrada.respuestaResumen, 300),
    facturas: (Array.isArray(entrada.facturas) ? entrada.facturas : []).slice(0, 12).map(f => ({
      documento: idsDocs.has(f.documento) ? f.documento : '',
      numero: txt(f.numero, 40),
      fechaEmision: esFecha(f.fechaEmision) ? f.fechaEmision : '',
      periodoDesde: esFecha(f.periodoDesde) ? f.periodoDesde : '',
      periodoHasta: esFecha(f.periodoHasta) ? f.periodoHasta : '',
      importeTotal: num(f.importeTotal),
      importeServicio: num(f.importeServicio)
    }))
  };
}

// Devuelve { errores, avisos, calculo }. Si hay errores no se puede pagar.
export function validarDatos(datos, exp, fechaHoy = hoy()) {
  const errores = [];
  const avisos = [];
  const r = exp.respuestas;
  const evaluacion = evaluarCaso(r, fechaHoy);
  const esB = evaluacion.estado === 'B';
  const t = datos.titular;

  if (!['A', 'B'].includes(evaluacion.estado)) errores.push('Tu caso ya no encaja con las respuestas actuales. Revisa el paso 1.');
  if (t.nombre.split(' ').filter(Boolean).length < 2) errores.push('Escribe tu nombre y apellidos como titular del contrato.');
  if (!documentoValido(t.documento)) errores.push('El DNI o NIE no es válido. Revísalo (8 números y letra, o X/Y/Z, 7 números y letra).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.email)) errores.push('Escribe un correo electrónico válido: ahí te enviaremos el enlace de descarga.');
  if (t.telefono && !/^[+\d][\d\s]{8,17}$/.test(t.telefono)) errores.push('El teléfono de contacto no parece válido.');
  if (esB) {
    if (!t.domicilio) errores.push('La Oficina exige un domicilio para notificaciones.');
    if (!/^\d{5}$/.test(t.cp)) errores.push('Escribe el código postal (5 números).');
    if (!t.localidad) errores.push('Escribe la localidad.');
    if (!t.provincia) errores.push('Escribe la provincia.');
  } else if (t.cp && !/^\d{5}$/.test(t.cp)) errores.push('El código postal debe tener 5 números.');
  if (!datos.canalBaja) errores.push('Indica por dónde pediste la baja.');

  const tipos = new Set(exp.documentos.map(d => d.tipoDoc));
  if (!exp.documentos.length) errores.push('Añade al menos una factura posterior a la baja.');
  if (!tipos.has('factura')) errores.push('Falta la factura posterior a la baja: súbela y márcala como "Factura posterior a la baja".');
  if (!tipos.has('prueba_baja')) {
    if (r.pruebaBaja === 'referencia') {
      if (!datos.bajaReferencia) errores.push('Escribe el número de referencia de tu solicitud de baja o sube el documento que la acredita.');
    } else errores.push('Falta la prueba de la baja: sube el email, SMS, captura o justificante y márcalo como "Prueba de la solicitud de baja".');
  }
  if (esB) {
    if (!datos.canalReclamacion) errores.push('Indica por dónde reclamaste al operador.');
    if (!tipos.has('reclamacion') && !datos.reclamacionReferencia) errores.push('Para la Oficina hace falta acreditar tu reclamación previa: sube una copia o escribe su número de referencia.');
    if (r.respuesta === 'insatisfactoria' && !tipos.has('respuesta_operador')) avisos.push('Te recomendamos añadir la respuesta del operador: la Oficina pide copia de los documentos que respaldan tu reclamación.');
    if (r.respuesta === 'insatisfactoria' && !datos.respuestaResumen) errores.push('Resume en una frase qué te respondió el operador.');
  }

  if (!datos.facturas.length) errores.push('Confirma los datos de al menos una factura.');
  const usados = new Set();
  datos.facturas.forEach((f, i) => {
    const etiqueta = f.numero ? `Factura ${f.numero}` : `Factura ${i + 1}`;
    if (!f.documento || exp.documentos.find(d => d.id === f.documento)?.tipoDoc !== 'factura') errores.push(`${etiqueta}: indica en qué archivo está.`);
    const clave = `${f.documento}|${f.numero}|${f.periodoDesde}`;
    if (usados.has(clave)) errores.push(`${etiqueta}: está repetida.`);
    usados.add(clave);
    validarFactura(f, fechaHoy).forEach(e => errores.push(`${etiqueta}: ${e}.`));
  });

  let calculo = null;
  if (!errores.length && evaluacion.fechas.efectiva) {
    calculo = calcularImportes(datos.facturas, evaluacion.fechas.efectiva);
    if (calculo.total <= 0) {
      errores.push(`Las facturas indicadas corresponden a periodos anteriores al ${fechaLarga(evaluacion.fechas.efectiva)}, fecha en que debía hacerse efectiva tu baja. Con estos datos no hay cobros posteriores a la baja que reclamar, así que no te cobraremos nada.`);
    }
    calculo.lineas.filter(l => l.tipo === 'fuera').forEach(l => avisos.push(`La factura ${l.numero || ''} (periodo ${fechaCorta(l.periodoDesde)} a ${fechaCorta(l.periodoHasta)}) es anterior a la fecha efectiva de la baja y no se reclamará.`.replace('  ', ' ')));
    calculo.lineas.filter(l => l.tipo === 'parcial').forEach(l => avisos.push(`De la factura ${l.numero || ''} solo se reclaman ${l.diasReclamables} de ${l.totalDias} días (la parte posterior a la baja): ${euros(l.reclamado)}.`.replace('  ', ' ')));
  }
  return { errores: [...new Set(errores)], avisos, calculo, evaluacion };
}

// Vista del expediente que se envía al navegador. Nunca incluye el escrito ni los documentos generados.
export function vistaPublica(exp) {
  const producto = exp.evaluacion?.producto ? PRODUCTOS[exp.evaluacion.producto] : null;
  return {
    referencia: exp.referencia,
    estado: exp.estado,
    respuestas: exp.respuestas,
    evaluacion: exp.evaluacion,
    documentos: exp.documentos.map(d => ({
      id: d.id, nombre: d.nombre, tipo: d.tipo, bytes: d.bytes, paginas: d.paginas,
      tipoDoc: d.tipoDoc, lectura: d.extraccionEstado
    })),
    propuesta: exp.documentos.some(d => d.extraccion) ? construirPropuesta(exp) : null,
    datos: exp.datos || null,
    resumen: exp.resumen || null,
    producto: producto ? { codigo: producto.codigo, nombre: producto.nombre, precioCentimos: producto.precioCentimos, entrega: producto.entrega } : null
  };
}

// Resumen comprensible para revisar antes de pagar: datos y cifras, no el texto del escrito.
export function construirResumen(exp, datos, calculo) {
  const r = exp.respuestas;
  const ev = exp.evaluacion;
  return {
    operador: nombreOperador(r),
    servicio: SERVICIOS[r.servicio],
    titular: datos.titular.nombre,
    contrato: datos.numeroCliente,
    lineas: datos.lineas,
    fechaSolicitud: r.fechaSolicitud,
    fechaEfectiva: ev.fechas.efectiva,
    reclamacionPrevia: r.reclamado === 'si' ? { fecha: r.fechaReclamacion, respuesta: r.respuesta, fechaRespuesta: r.fechaRespuesta } : null,
    limiteOaut: ev.fechas.limiteOaut || null,
    facturas: calculo.lineas.map(l => ({
      numero: l.numero, fechaEmision: l.fechaEmision, periodoDesde: l.periodoDesde, periodoHasta: l.periodoHasta,
      importeServicio: l.importeServicio, reclamado: l.reclamado, tipo: l.tipo, diasReclamables: l.diasReclamables, totalDias: l.totalDias
    })),
    total: calculo.total,
    documentos: exp.documentos.map((d, i) => ({ anexo: i + 1, nombre: d.nombre, tipoDoc: TIPOS_DOCUMENTO[d.tipoDoc], paginas: d.paginas }))
  };
}
