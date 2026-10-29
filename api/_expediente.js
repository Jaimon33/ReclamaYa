// Lógica del expediente: propuesta de datos a partir de los documentos, validación de lo que
// confirma el cliente, cálculo de importes y resumen previo al pago (sin el escrito).
import { PRODUCTOS } from './_config.js';
import {
  calcularImportes, validarFactura, evaluarCaso, esFecha, hoy, nombreOperador, fechaLarga, fechaCorta, euros
} from './_reglas.js';
import { sugerirImporteServicio } from './_extraccion.js';
import { empresaOperador } from './_companias.js';

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

// Si no sabemos qué servicio era, el escrito habla de forma genérica.
export const SERVICIO_GENERICO = 'telecomunicaciones contratado';

// Traduce el canal que aparece en un documento ("llamada", "área de clientes"…) a las opciones del formulario.
function canalDesdeTexto(texto) {
  const t = String(texto || '').toLowerCase();
  if (/portab/.test(t)) return '';
  if (/tel[eé]f|llamad|call/.test(t)) return 'telefono';
  if (/web|app|[aá]rea|online|internet/.test(t)) return 'web';
  if (/mail|correo|carta|escrito|burofax/.test(t)) return 'escrito';
  if (/tienda/.test(t)) return 'tienda';
  return '';
}

function normalizarNombre(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Une lo extraído de todos los documentos en una propuesta, con la fuente de cada dato
// y avisos cuando hay contradicciones o datos que conviene revisar.
export function construirPropuesta(exp) {
  const r = exp.respuestas;
  const alertas = [];
  const candidatos = { nombre: [], documento: [], numeroCliente: [], lineas: [], razonSocial: [], cifOperador: [], bajaRef: [], reclamacionRef: [], respuestaResumen: [], fechaSolicitud: [], fechaReclamacion: [], fechaRespuesta: [], canalBaja: [], canalReclamacion: [], servicio: [] };
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
    if (x.cifOperador) candidatos.cifOperador.push({ valor: x.cifOperador, fuente: fuente(doc, x.factura.pagina) });
    if (x.servicio) candidatos.servicio.push({ valor: x.servicio, fuente: fuente(doc, x.factura.pagina) });
    if (/portab/i.test(x.baja?.canal || '')) alertas.push(`"${doc.nombre}" indica que la baja se hizo por portabilidad a otra compañía. En ese caso, quién debe asumir esas facturas depende de lo que autorizaste a la nueva compañía: comprueba que pediste la baja directamente a ${nombreOperador(r)}.`);

    const operadorElegido = normalizarNombre(nombreOperador(r));
    const operadorDoc = normalizarNombre(`${x.operador} ${x.razonSocialOperador}`);
    if (operadorElegido && operadorDoc && !operadorDoc.includes(operadorElegido) && !operadorElegido.includes(normalizarNombre(x.operador))) {
      alertas.push(`"${doc.nombre}" parece de ${x.operador || x.razonSocialOperador}, pero indicaste ${nombreOperador(r)}. Comprueba que el documento es de tu compañía.`);
    }

    if (x.baja.referencia) candidatos.bajaRef.push({ valor: x.baja.referencia, fuente: fuente(doc, x.baja.pagina) });
    if (x.baja.fechaSolicitud) candidatos.fechaSolicitud.push({ valor: x.baja.fechaSolicitud, fuente: fuente(doc, x.baja.pagina) });
    if (x.baja.fechaSolicitud && r.fechaSolicitud && x.baja.fechaSolicitud !== r.fechaSolicitud) {
      alertas.push(`"${doc.nombre}" (pág. ${x.baja.pagina || 1}) indica que la baja se pidió el ${fechaLarga(x.baja.fechaSolicitud)}, pero indicaste el ${fechaLarga(r.fechaSolicitud)}. Revisa la fecha abajo.`);
    }
    const canal = canalDesdeTexto(x.baja.canal);
    if (canal) candidatos.canalBaja.push({ valor: canal, fuente: fuente(doc, x.baja.pagina) });
    if (x.reclamacion.referencia) candidatos.reclamacionRef.push({ valor: x.reclamacion.referencia, fuente: fuente(doc, x.reclamacion.pagina) });
    const canalRecl = canalDesdeTexto(x.reclamacion.canal);
    if (canalRecl && doc.tipoDoc === 'reclamacion') candidatos.canalReclamacion.push({ valor: canalRecl, fuente: fuente(doc, x.reclamacion.pagina) });
    if (x.reclamacion.fecha && doc.tipoDoc === 'reclamacion') candidatos.fechaReclamacion.push({ valor: x.reclamacion.fecha, fuente: fuente(doc, x.reclamacion.pagina) });
    if (x.reclamacion.fecha && r.fechaReclamacion && x.reclamacion.fecha !== r.fechaReclamacion && doc.tipoDoc === 'reclamacion') {
      alertas.push(`"${doc.nombre}" indica que reclamaste el ${fechaLarga(x.reclamacion.fecha)}, pero indicaste el ${fechaLarga(r.fechaReclamacion)}. Revisa la fecha abajo.`);
    }
    if (x.respuesta.resumen) candidatos.respuestaResumen.push({ valor: x.respuesta.resumen, fuente: fuente(doc, x.respuesta.pagina) });
    if (x.respuesta.fecha && doc.tipoDoc === 'respuesta_operador') candidatos.fechaRespuesta.push({ valor: x.respuesta.fecha, fuente: fuente(doc, x.respuesta.pagina) });
    if (x.respuesta.fecha && r.fechaRespuesta && x.respuesta.fecha !== r.fechaRespuesta && doc.tipoDoc === 'respuesta_operador') {
      alertas.push(`"${doc.nombre}" tiene fecha de respuesta ${fechaLarga(x.respuesta.fecha)}, pero indicaste el ${fechaLarga(r.fechaRespuesta)}. Revisa la fecha abajo.`);
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
      if (!x.factura.periodoDesde || !x.factura.periodoHasta) alertas.push(`No hemos encontrado las fechas que cubre "${doc.nombre}". Suelen ser dos fechas junto al número de factura (por ejemplo "01/09 - 30/09"): escríbelas en la factura, abajo.`);
      if (sugerencia.excluidos.length) alertas.push(`"${doc.nombre}" incluye conceptos que no reclamamos (${sugerencia.excluidos.join(', ')}). Hemos calculado la parte del servicio con su IVA: compruébala con la factura.`);
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
  if (nombre.alternativas?.length) alertas.push(`Los documentos muestran titulares distintos (${[nombre.valor, ...nombre.alternativas].join(' / ')}). Solo puede reclamar el titular del contrato.`);
  if (documento.alternativas?.length) alertas.push('Los documentos muestran DNI, NIE o CIF distintos. Revisa el del titular.');

  return {
    titular: { nombre, documento },
    numeroCliente: elegir(candidatos.numeroCliente),
    // La misma línea puede venir escrita con o sin espacios ("912 345 678" y "912345678"): se cuenta una vez.
    lineas: { valor: [...new Map([...candidatos.lineas].reverse().map(l => [l.valor.replace(/\D/g, '') || l.valor, l.valor])).values()].reverse().join(', '), fuentes: candidatos.lineas.map(l => l.fuente) },
    razonSocialOperador: elegir(candidatos.razonSocial),
    cifOperador: elegir(candidatos.cifOperador),
    bajaReferencia: elegir(candidatos.bajaRef),
    reclamacionReferencia: elegir(candidatos.reclamacionRef),
    respuestaResumen: elegir(candidatos.respuestaResumen),
    canalBaja: elegir(candidatos.canalBaja),
    canalReclamacion: elegir(candidatos.canalReclamacion),
    servicio: elegir(candidatos.servicio),
    fechas: {
      solicitud: elegir(candidatos.fechaSolicitud),
      reclamacion: elegir(candidatos.fechaReclamacion),
      respuesta: elegir(candidatos.fechaRespuesta)
    },
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

// CIF de sociedades: letra, siete números y dígito o letra de control.
export function cifValido(cif) {
  const m = String(cif || '').toUpperCase().replace(/[^0-9A-Z]/g, '').match(/^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!m) return false;
  let suma = 0;
  m[2].split('').map(Number).forEach((n, i) => {
    if (i % 2) suma += n;
    else { const doble = n * 2; suma += Math.floor(doble / 10) + (doble % 10); }
  });
  const control = (10 - (suma % 10)) % 10;
  return m[3] === String(control) || m[3] === 'JABCDEFGHI'[control];
}

function txt(v, max) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

const fecha = (v) => (esFecha(v) ? v : '');

export function limpiarDatos(entrada = {}, exp) {
  const t = entrada.titular || {};
  const f = entrada.fechas || {};
  const idsDocs = new Set(exp.documentos.map(d => d.id));
  return {
    titular: {
      nombre: txt(t.nombre, 100),
      documento: txt(t.documento, 12).toUpperCase().replace(/[^0-9A-Z]/g, ''),
      firmante: txt(t.firmante, 100),
      email: txt(t.email, 120).toLowerCase(),
      domicilio: txt(t.domicilio, 140),
      cp: txt(t.cp, 5),
      localidad: txt(t.localidad, 60),
      provincia: txt(t.provincia, 40)
    },
    fechas: { solicitud: fecha(f.solicitud), deseada: fecha(f.deseada), reclamacion: fecha(f.reclamacion), respuesta: fecha(f.respuesta) },
    numeroCliente: txt(entrada.numeroCliente, 40),
    lineas: txt(entrada.lineas, 120),
    servicio: Object.keys(SERVICIOS).includes(entrada.servicio) ? entrada.servicio : '',
    resumenCaso: txt(entrada.resumenCaso, 600),
    razonSocialOperador: txt(entrada.razonSocialOperador, 100),
    canalBaja: Object.keys(CANALES).includes(entrada.canalBaja) ? entrada.canalBaja : '',
    bajaReferencia: txt(entrada.bajaReferencia, 40),
    canalReclamacion: Object.keys(CANALES).includes(entrada.canalReclamacion) ? entrada.canalReclamacion : '',
    reclamacionReferencia: txt(entrada.reclamacionReferencia, 40),
    respuestaResumen: txt(entrada.respuestaResumen, 300),
    facturas: (Array.isArray(entrada.facturas) ? entrada.facturas : []).slice(0, 12).map(fa => ({
      documento: idsDocs.has(fa.documento) ? fa.documento : '',
      numero: txt(fa.numero, 40),
      fechaEmision: fecha(fa.fechaEmision),
      periodoDesde: fecha(fa.periodoDesde),
      periodoHasta: fecha(fa.periodoHasta),
      importeTotal: num(fa.importeTotal),
      importeServicio: num(fa.importeServicio)
    }))
  };
}

// Lo que el cliente deja vacío se completa con lo leído de sus documentos.
export function completarConPropuesta(datos, exp) {
  const p = construirPropuesta(exp);
  const leido = (x) => x?.valor || '';
  const d = structuredClone(datos);
  if (!d.titular.nombre) d.titular.nombre = leido(p.titular.nombre);
  if (!d.titular.documento) d.titular.documento = leido(p.titular.documento).toUpperCase().replace(/[^0-9A-Z]/g, '');
  for (const campo of ['solicitud', 'reclamacion', 'respuesta']) if (!d.fechas[campo]) d.fechas[campo] = leido(p.fechas[campo]);
  for (const campo of ['numeroCliente', 'lineas', 'razonSocialOperador', 'canalBaja', 'bajaReferencia', 'canalReclamacion', 'reclamacionReferencia', 'respuestaResumen', 'servicio']) {
    if (!d[campo]) d[campo] = leido(p[campo]);
  }
  // Sociedad a la que se reclama: la de nuestra lista oficial (por CIF de la factura) o, si no la tenemos, la de la factura.
  d.empresaOperador = empresaOperador(exp.respuestas.operador, { cifFactura: leido(p.cifOperador), razonFactura: d.razonSocialOperador, servicio: d.servicio });
  if (d.empresaOperador) d.razonSocialOperador = d.empresaOperador.razonSocial;
  if (!d.facturas.length) {
    d.facturas = p.facturas.map(f => ({
      documento: f.documento, numero: f.numero, fechaEmision: f.fechaEmision, periodoDesde: f.periodoDesde,
      periodoHasta: f.periodoHasta, importeTotal: f.importeTotal, importeServicio: f.importeServicio
    }));
  }
  return d;
}

// Las fechas de los documentos completan las respuestas del paso 1. En la segunda reclamación,
// si hay respuesta de la compañía es que no la resolvió; si no la hay, es que no contestó.
export function respuestasDefinitivas(respuestas, datos, hayRespuesta = Boolean(datos.fechas.respuesta)) {
  const emisiones = datos.facturas.map(f => f.fechaEmision).filter(Boolean).sort();
  return {
    ...respuestas,
    respuesta: respuestas.reclamado === 'si' ? (hayRespuesta ? 'insatisfactoria' : 'sin_respuesta') : '',
    fechaSolicitud: datos.fechas.solicitud || respuestas.fechaSolicitud,
    fechaDeseada: datos.fechas.deseada,
    fechaReclamacion: datos.fechas.reclamacion || respuestas.fechaReclamacion,
    fechaRespuesta: datos.fechas.respuesta || respuestas.fechaRespuesta,
    fechaPrimeraFactura: emisiones[0] || ''
  };
}

// Devuelve { errores, avisos, calculo, evaluacion, respuestas }. Si hay errores no se puede pagar.
export function validarDatos(datos, exp, fechaHoy = hoy()) {
  const errores = [];
  const avisos = [];
  const tipos = new Set(exp.documentos.map(d => d.tipoDoc));
  const r = respuestasDefinitivas(exp.respuestas, datos, Boolean(datos.fechas.respuesta) || tipos.has('respuesta_operador'));
  const evaluacion = evaluarCaso(r, fechaHoy, { definitiva: true });
  const esB = evaluacion.estado === 'B';
  const esEmpresa = r.tipoTitular === 'empresa';
  const t = datos.titular;

  if (!r.fechaSolicitud) errores.push('No encontramos en tus documentos el día en que pediste la baja. Sube el email, SMS o carta que lo confirma, o escríbelo en "Revisa lo que hemos leído".');
  if (r.reclamado === 'si' && !r.fechaReclamacion) errores.push('No encontramos el día en que reclamaste a la compañía. Sube tu reclamación o escríbelo en "Revisa lo que hemos leído".');
  if (r.respuesta === 'insatisfactoria' && !r.fechaRespuesta) errores.push('Has subido la respuesta de la compañía, pero no encontramos su fecha. Escríbela en "Revisa lo que hemos leído".');
  if (!['A', 'B'].includes(evaluacion.estado)) {
    [...evaluacion.excluyen, ...evaluacion.faltan].filter(m => !/^fecha_(solicitud|reclamacion|respuesta)$/.test(m.codigo)).forEach(m => errores.push(m.mensaje));
    if (!errores.length) errores.push('Con estos datos tu caso no encaja. Revisa las fechas o vuelve al paso 1.');
  } else if (evaluacion.producto !== exp.evaluacion?.producto) {
    errores.push('Con las fechas de tus documentos cambia la reclamación que corresponde. Vuelve al paso 1 y elige la otra opción.');
  }

  if (esEmpresa) {
    if (t.nombre.length < 3) errores.push('Escribe la razón social de la empresa titular del contrato.');
    if (!cifValido(t.documento)) errores.push('El CIF no es válido. Revísalo (letra, 7 números y un número o letra de control).');
    if (t.firmante.split(' ').filter(Boolean).length < 2) errores.push('Escribe el nombre y apellidos de quien firma en nombre de la empresa.');
  } else {
    if (t.nombre.split(' ').filter(Boolean).length < 2) errores.push('Escribe tu nombre y apellidos como titular del contrato.');
    if (!documentoValido(t.documento)) errores.push('El DNI o NIE no es válido. Revísalo (8 números y letra, o X/Y/Z, 7 números y letra).');
  }
  if (esB) {
    if (!t.domicilio) errores.push('La Oficina exige una dirección para notificaciones: escríbela.');
    if (!/^\d{5}$/.test(t.cp)) errores.push('Escribe el código postal (5 números).');
    if (!t.localidad) errores.push('Escribe la localidad.');
    if (!t.provincia) errores.push('Escribe la provincia.');
  } else if (t.cp && !/^\d{5}$/.test(t.cp)) errores.push('El código postal debe tener 5 números.');

  if (!exp.documentos.length) errores.push('Añade tu última factura con cobros posteriores a la baja.');
  if (!tipos.has('factura')) errores.push('Falta la factura con cobros posteriores a la baja: súbela (si ya la subiste, márcala como "Factura posterior a la baja").');
  if (!tipos.has('prueba_baja') && !datos.bajaReferencia) {
    errores.push('Falta la prueba de la baja: sube el email, SMS, carta o captura que la confirma, o escribe su número de referencia en "Revisa lo que hemos leído".');
  }
  if (esB) {
    if (!tipos.has('reclamacion') && !datos.reclamacionReferencia) errores.push('Para la Oficina hace falta acreditar que ya reclamaste a la compañía: sube una copia o escribe su número de referencia. Si no tienes ninguna prueba, vuelve al paso 1 y elige "Primera reclamación".');
    if (r.respuesta === 'insatisfactoria' && !tipos.has('respuesta_operador')) avisos.push('Te recomendamos añadir la respuesta de la compañía: la Oficina pide copia de los documentos que respaldan tu reclamación.');
  }

  if (!datos.facturas.length) errores.push('Confirma los datos de al menos una factura.');
  const usados = new Set();
  datos.facturas.forEach((fa, i) => {
    const etiqueta = fa.numero ? `Factura ${fa.numero}` : `Factura ${i + 1}`;
    if (!fa.documento || exp.documentos.find(d => d.id === fa.documento)?.tipoDoc !== 'factura') errores.push(`${etiqueta}: indica en qué archivo está.`);
    const clave = `${fa.documento}|${fa.numero}|${fa.periodoDesde}`;
    if (usados.has(clave)) errores.push(`${etiqueta}: está repetida.`);
    usados.add(clave);
    validarFactura(fa, fechaHoy).forEach(e => errores.push(`${etiqueta}: ${e}${e.startsWith('falta el importe') ? ' (si solo cobra permanencia, un dispositivo o equipos, no podemos reclamarla)' : ''}.`));
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
  avisos.push(...evaluacion.avisos.filter(a => !/sacaremos de tus documentos|Comprobaremos con tus documentos/.test(a)));
  return { errores: [...new Set(errores)], avisos: [...new Set(avisos)], calculo, evaluacion, respuestas: evaluacion.respuestas };
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
    servicio: SERVICIOS[datos.servicio || r.servicio] || '',
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
