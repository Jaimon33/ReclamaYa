// Reglas de elegibilidad, fechas e importes. Son deterministas y revisables:
// la IA no decide si un caso encaja ni cuánto se reclama.
// Cada regla cita la fuente oficial y la fecha en que se comprobó.

export const FUENTES = {
  rd899_art7: {
    norma: 'Real Decreto 899/2009, de 22 de mayo, carta de derechos del usuario de los servicios de comunicaciones electrónicas',
    articulo: 'Artículo 7. Extinción de los contratos',
    id: 'BOE-A-2009-8961',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2009-8961',
    cita: 'El operador se abstendrá de facturar y cobrar cualquier cantidad que se haya podido devengar, por causa no imputable al usuario final, con posterioridad al plazo de dos días en que debió surtir efectos la baja.',
    comprobado: '2026-10-28',
    como: 'Texto consolidado leído en la API de datos abiertos del BOE (vigente, sin vigencia agotada)'
  },
  rd899_art26: {
    norma: 'Real Decreto 899/2009, de 22 de mayo',
    articulo: 'Artículo 26.2. Servicio de atención al cliente de los operadores',
    id: 'BOE-A-2009-8961',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2009-8961',
    cita: 'el operador estará obligado a comunicar al abonado el número de referencia de las reclamaciones, quejas, peticiones o gestiones.',
    comprobado: '2026-10-28',
    como: 'Texto consolidado leído en la API de datos abiertos del BOE'
  },
  orden1030_art3: {
    norma: 'Orden ITC/1030/2007, de 12 de abril, procedimiento de resolución de controversias entre usuarios finales y operadores',
    articulo: 'Artículo 3. Ámbito del procedimiento',
    url: 'https://www.boe.es/boe/dias/2007/04/20/pdfs/A17390-17394.pdf',
    cita: 'Disconformidad con la factura recibida [...] Negativa o demora en tramitar la baja en el servicio por el operador. Quedan fuera, entre otras, la indemnización de daños y perjuicios, las cláusulas abusivas, la protección de datos y los asuntos con laudo arbitral.',
    comprobado: '2026-10-28',
    como: 'Publicación original en el BOE núm. 95, de 20/04/2007. No figura en la API de legislación consolidada; su vigencia se contrasta con la información actual de la Oficina'
  },
  orden1030_art4: {
    norma: 'Orden ITC/1030/2007, de 12 de abril',
    articulo: 'Artículo 4. Iniciación del procedimiento',
    url: 'https://www.boe.es/boe/dias/2007/04/20/pdfs/A17390-17394.pdf',
    cita: 'Con carácter previo [...] el usuario final debe presentar la correspondiente reclamación ante el operador, en el plazo de un mes desde el momento en que se tenga conocimiento del hecho [...]. El plazo máximo para presentar la solicitud será de tres meses [...] desde la respuesta del operador o la finalización del plazo de un mes para responder.',
    comprobado: '2026-10-28',
    como: 'Publicación original en el BOE y página oficial de la Oficina (usuariosteleco.digital.gob.es/reclamaciones/telefonia-e-internet), que repite el mes y los tres meses'
  },
  oaut_presentacion: {
    norma: 'Oficina de Atención al Usuario de Telecomunicaciones',
    articulo: 'Tramitación en papel y tramitación electrónica',
    url: 'https://usuariosteleco.digital.gob.es/reclamaciones/telefonia-e-internet/tramitacion-papel',
    cita: 'Formulario con todos los campos cumplimentados y firmado, copia legible de los documentos; por correo postal, oficina de Correos o registro; o por vía electrónica con certificado, DNI electrónico o Cl@ve a través del Registro Electrónico General.',
    comprobado: '2026-10-28',
    como: 'Páginas oficiales consultadas y formulario oficial descargado (formulario_reclamaciones.pdf)'
  },
  ley10_2025: {
    norma: 'Ley 10/2025, de 26 de diciembre, por la que se regulan los servicios de atención a la clientela',
    articulo: 'Ámbito y adaptación',
    id: 'BOE-A-2025-26698',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-26698',
    cita: 'En comunicaciones electrónicas la atención a la clientela se rige preferentemente por su normativa sectorial. Plazo de adaptación de las empresas hasta el 28/12/2026.',
    comprobado: '2026-10-28',
    como: 'Ficha del BOE (vigente). Revisar antes del 28/12/2026 si cambia el plazo de respuesta del operador'
  }
};

export const VERSION_REGLAS = '2026-10-28';

// Normas vigiladas a diario con la API de datos abiertos del BOE (texto consolidado).
// Si cambia su fecha de actualización o se derogan, el cron avisa para revisar las reglas.
export const NORMAS_VIGILADAS = [
  { id: 'BOE-A-2009-8961', nombre: 'Real Decreto 899/2009 (carta de derechos del usuario)', actualizacion: '20251219T120347Z' },
  { id: 'BOE-A-2022-10757', nombre: 'Ley 11/2022, General de Telecomunicaciones', actualizacion: '20260914T105046Z' },
  { id: 'BOE-A-2025-26698', nombre: 'Ley 10/2025, servicios de atención a la clientela', actualizacion: '20260421T090302Z' }
];

// ——— Fechas ———

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esFecha(texto) {
  if (typeof texto !== 'string' || !RE_FECHA.test(texto)) return false;
  const d = aFecha(texto);
  return !Number.isNaN(d.getTime()) && aTexto(d) === texto;
}

export function aFecha(texto) {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

export function aTexto(fecha) {
  return fecha.toISOString().slice(0, 10);
}

export function hoy(ahora = new Date()) {
  // Fecha de hoy en España peninsular.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(ahora);
}

export function sumarDias(texto, dias) {
  const d = aFecha(texto);
  d.setUTCDate(d.getUTCDate() + dias);
  return aTexto(d);
}

// Plazos en meses: de fecha a fecha; si ese día no existe en el mes final, el último día del mes.
export function sumarMeses(texto, meses) {
  const d = aFecha(texto);
  const dia = d.getUTCDate();
  const destino = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimo));
  return aTexto(destino);
}

export function diasEntre(desde, hasta) {
  return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000);
}

function domingoDePascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return aTexto(new Date(Date.UTC(anio, mes - 1, dia)));
}

// Festivos nacionales comunes. No incluye festivos autonómicos ni locales: por eso
// también se tratan los sábados como inhábiles, lo que retrasa la fecha y evita reclamar de más.
function festivosNacionales(anio) {
  const fijos = ['01-01', '01-06', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25'];
  return new Set([...fijos.map(md => `${anio}-${md}`), sumarDias(domingoDePascua(anio), -2)]);
}

export function esHabil(texto) {
  const diaSemana = aFecha(texto).getUTCDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !festivosNacionales(Number(texto.slice(0, 4))).has(texto);
}

export function sumarDiasHabiles(texto, dias) {
  let actual = texto;
  let contados = 0;
  while (contados < dias) {
    actual = sumarDias(actual, 1);
    if (esHabil(actual)) contados++;
  }
  return actual;
}

// Fecha en que la baja debía surtir efectos (art. 7 RD 899/2009): la que pidió el cliente
// o, si pidió que fuera antes, dos días hábiles después de solicitarla.
export function fechaEfectivaBaja(fechaSolicitud, fechaDeseada) {
  const minima = sumarDiasHabiles(fechaSolicitud, 2);
  if (fechaDeseada && esFecha(fechaDeseada) && fechaDeseada > minima) return fechaDeseada;
  return minima;
}

// ——— Elegibilidad ———
// El paso 1 pregunta solo lo imprescindible para saber qué recorrido toca. Las fechas que el
// cliente no recuerde se sacan de sus documentos en el paso 2, donde la evaluación es definitiva.

const OPCIONES = {
  tipoTitular: ['persona', 'empresa'],
  servicio: ['fibra', 'movil', 'fijo', 'paquete'],
  viaBaja: ['operador', 'portabilidad'],
  pruebaBaja: ['si', 'no'],
  reclamado: ['no', 'si'],
  respuesta: ['sin_respuesta', 'insatisfactoria', 'solucionado']
};
const FECHAS = ['fechaSolicitud', 'fechaDeseada', 'fechaPrimeraFactura', 'fechaReclamacion', 'fechaRespuesta'];
const EN_DOCUMENTOS = ['fechaSolicitudEnDocs', 'fechaReclamacionEnDocs', 'fechaRespuestaEnDocs'];

export const OPERADORES = [
  'Movistar', 'Vodafone', 'Orange', 'Jazztel', 'Yoigo', 'MásMóvil', 'Simyo', 'Lowi',
  'O2', 'Pepephone', 'Digi', 'Finetwork', 'Euskaltel', 'R', 'Telecable', 'Avatel', 'Adamo', 'Otro'
];

function texto(valor, max = 80) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

// Normaliza las respuestas recibidas del navegador. Lo que no encaja en las opciones se descarta.
export function limpiarRespuestas(entrada = {}) {
  const r = {};
  for (const [campo, opciones] of Object.entries(OPCIONES)) {
    r[campo] = opciones.includes(entrada[campo]) ? entrada[campo] : '';
  }
  r.operador = OPERADORES.includes(entrada.operador) ? entrada.operador : '';
  r.operadorOtro = r.operador === 'Otro' ? texto(entrada.operadorOtro, 60) : '';
  for (const campo of FECHAS) r[campo] = esFecha(entrada[campo]) ? entrada[campo] : '';
  for (const campo of EN_DOCUMENTOS) r[campo] = entrada[campo] === true;
  if (r.reclamado !== 'si') Object.assign(r, { respuesta: '', fechaReclamacion: '', fechaRespuesta: '', fechaReclamacionEnDocs: false, fechaRespuestaEnDocs: false });
  if (r.respuesta !== 'insatisfactoria') Object.assign(r, { fechaRespuesta: '', fechaRespuestaEnDocs: false });
  return r;
}

export function nombreOperador(r) {
  return r.operador === 'Otro' ? r.operadorOtro : r.operador;
}

function falta(motivos, codigo, mensaje) {
  motivos.push({ codigo, mensaje });
}

// Devuelve el recorrido (A: reclamar a la compañía; B: expediente para la Oficina), lo que falta
// (incompleto), por qué no se puede (excluido) o que no hace falta (nada). Con `definitiva` todas las
// fechas son obligatorias: es la evaluación que se hace con los datos confirmados antes de pagar.
export function evaluarCaso(respuestas, fechaHoy = hoy(), { definitiva = false } = {}) {
  const r = limpiarRespuestas(respuestas);
  const faltan = [];
  const excluyen = [];
  const avisos = [];
  const fechas = { pendientes: [] };
  const pendiente = (campo) => !r[campo] && r[`${campo}EnDocs`] && !definitiva;

  if (!r.tipoTitular) falta(faltan, 'tipo_titular', 'Indica si el contrato es de una persona o de una empresa.');
  if (!nombreOperador(r)) falta(faltan, 'operador', 'Indica tu compañía.');
  if (!r.servicio) falta(faltan, 'servicio', 'Indica qué diste de baja.');

  if (!r.viaBaja) falta(faltan, 'via_baja', 'Indica cómo pediste la baja.');
  if (r.viaBaja === 'portabilidad') falta(excluyen, 'portabilidad', 'Si te diste de baja al cambiarte de compañía con portabilidad, quién debe asumir esas facturas depende de si autorizaste a la nueva compañía a tramitar la baja (art. 7.2 de la Orden ITC/1030/2007). Es un caso que todavía no preparamos.');

  if (!r.pruebaBaja) falta(faltan, 'prueba_baja', 'Indica si tienes alguna prueba de la baja.');
  if (r.pruebaBaja === 'no') falta(faltan, 'sin_prueba_baja', 'Necesitas una prueba de que pediste la baja. Llama a tu compañía y pide el número de referencia de tu solicitud de baja: está obligada a dártelo (art. 26.2 del Real Decreto 899/2009). También vale el email, SMS o carta de confirmación.');

  if (r.fechaSolicitud) {
    if (r.fechaSolicitud > fechaHoy) falta(faltan, 'fecha_futura', 'La fecha de solicitud de la baja no puede ser posterior a hoy.');
    else {
      fechas.efectiva = fechaEfectivaBaja(r.fechaSolicitud, r.fechaDeseada);
      if (fechas.efectiva > fechaHoy) falta(excluyen, 'baja_no_efectiva', `Tu baja debía hacerse efectiva el ${fechaLarga(fechas.efectiva)}. Hasta entonces la compañía puede seguir facturando.`);
    }
    if (r.fechaDeseada && r.fechaDeseada < r.fechaSolicitud) falta(faltan, 'fecha_deseada', 'La fecha en que querías la baja no puede ser anterior a la fecha en que la pediste.');
  } else if (pendiente('fechaSolicitud')) fechas.pendientes.push('fechaSolicitud');
  else falta(faltan, 'fecha_solicitud', 'Indica la fecha en que pediste la baja o elige que la saquemos de tus documentos.');

  if (r.fechaPrimeraFactura && r.fechaSolicitud && r.fechaPrimeraFactura < r.fechaSolicitud) {
    falta(faltan, 'fecha_factura', 'Las facturas que reclamas deberían ser posteriores a la solicitud de baja. Revisa las fechas.');
  }

  let recorrido = '';
  if (!r.reclamado) falta(faltan, 'reclamado', 'Indica si ya has reclamado a tu compañía por estos cobros.');
  else if (r.reclamado === 'no') {
    recorrido = 'A';
    if (r.fechaPrimeraFactura) {
      fechas.limiteReclamarOperador = sumarMeses(r.fechaPrimeraFactura, 1);
      avisos.push(fechaHoy > fechas.limiteReclamarOperador
        ? `Para poder acudir después a la Oficina de Atención al Usuario de Telecomunicaciones hay que reclamar a la compañía en el plazo de un mes desde que conociste el cobro (art. 4.1 de la Orden ITC/1030/2007). Ese mes terminó el ${fechaLarga(fechas.limiteReclamarOperador)}: puedes reclamar igualmente, pero la Oficina podría no admitir una reclamación posterior.`
        : `Presenta tu reclamación a la compañía antes del ${fechaLarga(fechas.limiteReclamarOperador)} para conservar la opción de acudir después a la Oficina de Atención al Usuario de Telecomunicaciones.`);
    }
  } else {
    if (!r.respuesta) falta(faltan, 'respuesta', 'Indica si tu compañía te ha respondido.');
    if (r.respuesta === 'solucionado') {
      return resultado('nada', r, { faltan: [], excluyen: [], avisos: ['Si la compañía ya te ha devuelto lo cobrado, no necesitas reclamar. Guarda la respuesta por si vuelven a facturarte.'], fechas });
    }

    if (r.fechaReclamacion) {
      if (r.fechaReclamacion > fechaHoy) falta(faltan, 'fecha_reclamacion_futura', 'La fecha de tu reclamación no puede ser posterior a hoy.');
      else if (r.fechaSolicitud && r.fechaReclamacion < r.fechaSolicitud) falta(faltan, 'fecha_reclamacion_anterior', 'La reclamación por los cobros debería ser posterior a la solicitud de baja. Revisa las fechas.');
    } else if (pendiente('fechaReclamacion')) fechas.pendientes.push('fechaReclamacion');
    else falta(faltan, 'fecha_reclamacion', 'Indica la fecha en que reclamaste o elige que la saquemos de tus documentos.');

    if (r.respuesta === 'sin_respuesta' && r.fechaReclamacion && r.fechaReclamacion <= fechaHoy) {
      fechas.finPlazoRespuesta = sumarMeses(r.fechaReclamacion, 1);
      if (fechaHoy <= fechas.finPlazoRespuesta) {
        falta(faltan, 'esperar_respuesta', `Tu compañía tiene un mes para responderte: hasta el ${fechaLarga(fechas.finPlazoRespuesta)}. Si para entonces no ha contestado, vuelve a partir del día siguiente para preparar la reclamación ante la Oficina.`);
      } else fechas.inicioPlazoOaut = fechas.finPlazoRespuesta;
    } else if (r.respuesta === 'insatisfactoria') {
      if (r.fechaRespuesta) {
        if (r.fechaReclamacion && r.fechaRespuesta < r.fechaReclamacion) falta(faltan, 'fecha_respuesta_incoherente', 'La fecha de la respuesta debe ser posterior a tu reclamación.');
        else if (r.fechaRespuesta > fechaHoy) falta(faltan, 'fecha_respuesta_futura', 'La fecha de la respuesta no puede ser posterior a hoy.');
        else fechas.inicioPlazoOaut = r.fechaRespuesta;
      } else if (pendiente('fechaRespuesta')) fechas.pendientes.push('fechaRespuesta');
      else falta(faltan, 'fecha_respuesta', 'Indica la fecha de la respuesta o elige que la saquemos de tus documentos.');
    }

    if (fechas.inicioPlazoOaut) {
      fechas.limiteOaut = sumarMeses(fechas.inicioPlazoOaut, 3);
      if (fechaHoy > fechas.limiteOaut) {
        falta(excluyen, 'plazo_oaut_vencido', `El plazo de tres meses para acudir a la Oficina de Atención al Usuario de Telecomunicaciones terminó el ${fechaLarga(fechas.limiteOaut)} (art. 4.3 de la Orden ITC/1030/2007). Aún puedes acudir gratis a la Junta Arbitral de Consumo de tu comunidad autónoma o a los servicios de consumo.`);
      } else {
        recorrido = 'B';
        fechas.diasRestantesOaut = diasEntre(fechaHoy, fechas.limiteOaut);
        avisos.push(`Tienes hasta el ${fechaLarga(fechas.limiteOaut)} para presentar la reclamación ante la Oficina (quedan ${fechas.diasRestantesOaut} días).`);
        if (fechas.diasRestantesOaut <= 10) avisos.push('Queda poco plazo: preséntala en cuanto recibas el expediente.');
        if (r.fechaPrimeraFactura && r.fechaReclamacion > sumarMeses(r.fechaPrimeraFactura, 1)) {
          avisos.push('Reclamaste a la compañía más de un mes después de recibir la factura. La Oficina exige reclamar en el plazo de un mes desde que conociste el hecho (art. 4.1 de la Orden ITC/1030/2007) y podría no admitir tu reclamación.');
        }
      }
    } else if (fechas.pendientes.some(c => c === 'fechaReclamacion' || c === 'fechaRespuesta') && r.respuesta) {
      // Recorrido provisional: los plazos se comprueban con las fechas de los documentos antes de pagar.
      recorrido = 'B';
      avisos.push('Comprobaremos con tus documentos que estás dentro de los plazos para acudir a la Oficina antes de que pagues nada.');
    }
    if (recorrido === 'B' && r.tipoTitular === 'empresa') {
      avisos.push('La Oficina solo admite reclamaciones de empresas que sean microempresas (menos de 10 trabajadores), que deben acompañar la declaración responsable de microempresa (modelo oficial de la Oficina).');
    }
  }

  if (fechas.pendientes.length) avisos.push('Las fechas que no recuerdes las sacaremos de tus documentos y podrás revisarlas.');

  if (excluyen.length) return resultado('excluido', r, { faltan, excluyen, avisos, fechas });
  if (faltan.length || !recorrido) return resultado('incompleto', r, { faltan, excluyen, avisos, fechas });
  return resultado(recorrido, r, { faltan, excluyen, avisos, fechas, provisional: fechas.pendientes.length > 0 });
}

function resultado(estado, respuestas, { faltan, excluyen, avisos, fechas, provisional = false }) {
  const producto = estado === 'A' ? 'operador' : estado === 'B' ? 'oaut' : null;
  return { estado, producto, provisional, faltan, excluyen, avisos, fechas, respuestas, versionReglas: VERSION_REGLAS };
}

// ——— Importes (paso 2) ———

export function redondear(n) {
  return Math.round(n * 100) / 100;
}

// Para cada factura confirmada calcula la parte que corresponde a días posteriores a la fecha efectiva.
// Una factura emitida después de la baja pero que cubre días anteriores no se reclama por esos días.
export function calcularImportes(facturas, fechaEfectiva) {
  const lineas = facturas.map((f) => {
    const totalDias = diasEntre(f.periodoDesde, f.periodoHasta) + 1;
    const inicioReclamable = f.periodoDesde > fechaEfectiva ? f.periodoDesde : sumarDias(fechaEfectiva, 1);
    const diasReclamables = inicioReclamable > f.periodoHasta ? 0 : diasEntre(inicioReclamable, f.periodoHasta) + 1;
    const base = Number(f.importeServicio);
    let reclamado = 0;
    let tipo = 'fuera';
    if (diasReclamables === totalDias) {
      reclamado = base;
      tipo = 'completa';
    } else if (diasReclamables > 0) {
      reclamado = redondear(base * diasReclamables / totalDias);
      tipo = 'parcial';
    }
    return { ...f, totalDias, diasReclamables, inicioReclamable, reclamado, tipo };
  });
  const total = redondear(lineas.reduce((s, l) => s + l.reclamado, 0));
  return { lineas, total };
}

// Comprueba los datos confirmados de una factura antes de calcular.
export function validarFactura(f, fechaHoy = hoy()) {
  const errores = [];
  if (!esFecha(f.fechaEmision)) errores.push('falta la fecha de emisión');
  if (!esFecha(f.periodoDesde) || !esFecha(f.periodoHasta)) errores.push('falta el periodo facturado (desde y hasta)');
  else if (f.periodoHasta < f.periodoDesde) errores.push('el periodo termina antes de empezar');
  else if (diasEntre(f.periodoDesde, f.periodoHasta) > 400) errores.push('el periodo facturado es demasiado largo');
  if (esFecha(f.fechaEmision) && f.fechaEmision > fechaHoy) errores.push('la fecha de emisión es posterior a hoy');
  const importe = Number(f.importeServicio);
  if (!Number.isFinite(importe) || importe <= 0) errores.push('falta el importe del servicio');
  else if (importe > 2000) errores.push('el importe es demasiado alto para este servicio');
  const totalFactura = Number(f.importeTotal);
  if (Number.isFinite(totalFactura) && totalFactura > 0 && importe > totalFactura + 0.005) {
    errores.push('el importe del servicio no puede superar el total de la factura');
  }
  return errores;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fechaLarga(texto) {
  if (!esFecha(texto)) return '';
  const [a, m, d] = texto.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function fechaCorta(texto) {
  if (!esFecha(texto)) return '';
  const [a, m, d] = texto.split('-');
  return `${d}/${m}/${a}`;
}

export function euros(n) {
  return `${Number(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}
