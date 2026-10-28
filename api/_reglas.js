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

// ——— Elegibilidad (paso 1) ———

const OPCIONES = {
  titular: ['si', 'no'],
  tipoTitular: ['particular', 'autonomo', 'empresa'],
  servicio: ['fibra', 'movil', 'fijo', 'paquete'],
  viaBaja: ['operador', 'portabilidad', 'no_recuerdo'],
  pruebaBaja: ['referencia', 'confirmacion', 'justificante', 'ninguna'],
  reclamado: ['no', 'si'],
  pruebaReclamacion: ['referencia', 'escrito', 'ninguna'],
  respuesta: ['sin_respuesta', 'insatisfactoria', 'solucionado']
};
const CONCEPTOS_RECLAMABLES = ['cuota', 'consumo'];
const CONCEPTOS_FUERA = ['permanencia', 'dispositivo', 'equipos'];
const CONCEPTOS = [...CONCEPTOS_RECLAMABLES, ...CONCEPTOS_FUERA];
const SITUACIONES_FUERA = {
  morosos: 'Te han incluido o amenazado con incluirte en un fichero de morosos',
  suplantacion: 'No reconoces el contrato o crees que alguien lo contrató en tu nombre',
  judicial: 'Ya hay un juicio, un abogado o un procedimiento abierto por esto',
  danos: 'Quieres una indemnización por daños o perjuicios',
  arbitraje: 'El asunto ya pasó por arbitraje de consumo y hay laudo'
};

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
  for (const campo of ['fechaSolicitud', 'fechaDeseada', 'fechaPrimeraFactura', 'fechaReclamacion', 'fechaRespuesta']) {
    r[campo] = esFecha(entrada[campo]) ? entrada[campo] : '';
  }
  r.conceptos = Array.isArray(entrada.conceptos) ? [...new Set(entrada.conceptos.filter(c => CONCEPTOS.includes(c)))] : [];
  r.situaciones = Array.isArray(entrada.situaciones) ? [...new Set(entrada.situaciones.filter(s => s in SITUACIONES_FUERA))] : [];
  return r;
}

export function nombreOperador(r) {
  return r.operador === 'Otro' ? r.operadorOtro : r.operador;
}

function falta(motivos, codigo, mensaje) {
  motivos.push({ codigo, mensaje });
}

// Devuelve el recorrido (A: reclamar al operador; B: expediente para la Oficina),
// lo que falta (incompleto), por qué no se puede (excluido) o que no hace falta (nada).
export function evaluarCaso(respuestas, fechaHoy = hoy()) {
  const r = limpiarRespuestas(respuestas);
  const faltan = [];
  const excluyen = [];
  const avisos = [];
  const fechas = {};

  if (!r.titular) falta(faltan, 'titular', 'Indica si el contrato está a tu nombre.');
  if (r.titular === 'no') falta(excluyen, 'no_titular', 'Por ahora solo preparamos reclamaciones del titular del contrato. Si está a nombre de otra persona, tiene que reclamar ella; la Oficina admite representantes con un modelo de autorización firmado.');
  if (!r.tipoTitular) falta(faltan, 'tipo_titular', 'Indica si el contrato es de un particular, un autónomo o una empresa.');
  if (r.tipoTitular === 'empresa') falta(excluyen, 'empresa', 'Por ahora no preparamos reclamaciones de empresas. Las microempresas pueden acudir a la Oficina con una declaración responsable; las demás empresas, no.');
  if (!nombreOperador(r)) falta(faltan, 'operador', 'Indica tu operador.');
  if (!r.servicio) falta(faltan, 'servicio', 'Indica qué servicio diste de baja.');

  if (!r.viaBaja) falta(faltan, 'via_baja', 'Indica cómo pediste la baja.');
  if (r.viaBaja === 'portabilidad') falta(excluyen, 'portabilidad', 'Si te diste de baja al cambiarte de compañía con portabilidad, quién debe asumir esas facturas depende de si autorizaste a la nueva compañía a tramitar la baja (art. 7.2 de la Orden ITC/1030/2007). Es un caso que todavía no preparamos.');
  if (r.viaBaja === 'no_recuerdo') falta(faltan, 'via_baja_desconocida', 'Necesitamos saber cómo y cuándo pediste la baja. Búscalo en tus emails o en el área de cliente, o llama a tu operador y pide el número de referencia de la baja.');

  if (!r.pruebaBaja) falta(faltan, 'prueba_baja', 'Indica qué prueba tienes de la baja.');
  if (r.pruebaBaja === 'ninguna') falta(faltan, 'sin_prueba_baja', 'Necesitas una prueba de que pediste la baja. Llama a tu operador y pide el número de referencia de tu solicitud de baja: está obligado a dártelo (art. 26.2 del Real Decreto 899/2009). También vale el email o SMS de confirmación.');

  if (!r.fechaSolicitud) falta(faltan, 'fecha_solicitud', 'Indica la fecha en que pediste la baja.');
  else if (r.fechaSolicitud > fechaHoy) falta(faltan, 'fecha_futura', 'La fecha de solicitud de la baja no puede ser posterior a hoy.');
  else {
    fechas.efectiva = fechaEfectivaBaja(r.fechaSolicitud, r.fechaDeseada);
    if (fechas.efectiva > fechaHoy) {
      falta(excluyen, 'baja_no_efectiva', `Tu baja debía hacerse efectiva el ${fechaLarga(fechas.efectiva)}. Hasta entonces el operador puede seguir facturando.`);
    }
  }
  if (r.fechaDeseada && r.fechaSolicitud && r.fechaDeseada < r.fechaSolicitud) {
    falta(faltan, 'fecha_deseada', 'La fecha en que querías la baja no puede ser anterior a la fecha en que la pediste.');
  }

  if (!r.conceptos.length) falta(faltan, 'conceptos', 'Indica qué te han cobrado después de la baja.');
  else {
    const reclamables = r.conceptos.filter(c => CONCEPTOS_RECLAMABLES.includes(c));
    const fuera = r.conceptos.filter(c => CONCEPTOS_FUERA.includes(c));
    if (!reclamables.length) {
      falta(excluyen, 'solo_conceptos_fuera', 'Las penalizaciones por permanencia, los plazos de un móvil o dispositivo y los cargos por no devolver equipos son conflictos distintos que todavía no preparamos.');
    } else if (fuera.length) {
      avisos.push('Solo reclamaremos las cuotas y cargos del servicio posteriores a la baja. Las penalizaciones por permanencia, los plazos de dispositivos o los cargos por equipos quedan fuera del escrito.');
    }
  }

  for (const s of r.situaciones) {
    falta(excluyen, `situacion_${s}`, `${SITUACIONES_FUERA[s]}: es un caso más complejo que no preparamos. Te recomendamos acudir a una asociación de consumidores, a la oficina de consumo de tu ayuntamiento o a un abogado.`);
  }

  if (r.fechaPrimeraFactura && r.fechaSolicitud && r.fechaPrimeraFactura < r.fechaSolicitud) {
    falta(faltan, 'fecha_factura', 'La factura que reclamas debería haberse emitido después de pedir la baja. Revisa la fecha.');
  }

  let recorrido = '';
  if (!r.reclamado) falta(faltan, 'reclamado', 'Indica si ya has reclamado al operador por estos cobros.');
  else if (r.reclamado === 'no') {
    recorrido = 'A';
    if (r.fechaPrimeraFactura) {
      fechas.limiteReclamarOperador = sumarMeses(r.fechaPrimeraFactura, 1);
      if (fechaHoy > fechas.limiteReclamarOperador) {
        avisos.push(`Para poder acudir después a la Oficina de Atención al Usuario de Telecomunicaciones hay que reclamar al operador en el plazo de un mes desde que conociste el cobro (art. 4.1 de la Orden ITC/1030/2007). Ese mes terminó el ${fechaLarga(fechas.limiteReclamarOperador)}: puedes reclamar al operador igualmente, pero la Oficina podría no admitir una reclamación posterior.`);
      } else {
        avisos.push(`Presenta tu reclamación al operador antes del ${fechaLarga(fechas.limiteReclamarOperador)} para conservar la opción de acudir después a la Oficina de Atención al Usuario de Telecomunicaciones.`);
      }
    }
  } else {
    if (!r.fechaReclamacion) falta(faltan, 'fecha_reclamacion', 'Indica la fecha en que reclamaste al operador.');
    else if (r.fechaReclamacion > fechaHoy) falta(faltan, 'fecha_reclamacion_futura', 'La fecha de tu reclamación no puede ser posterior a hoy.');
    else if (r.fechaSolicitud && r.fechaReclamacion < r.fechaSolicitud) falta(faltan, 'fecha_reclamacion_anterior', 'La reclamación por los cobros debería ser posterior a la solicitud de baja. Revisa las fechas.');
    if (!r.pruebaReclamacion) falta(faltan, 'prueba_reclamacion', 'Indica qué prueba tienes de tu reclamación.');
    if (!r.respuesta) falta(faltan, 'respuesta', 'Indica si el operador te ha respondido.');

    if (r.respuesta === 'solucionado') {
      return resultado('nada', r, { faltan: [], excluyen: [], avisos: ['Si el operador ya te ha devuelto lo cobrado, no necesitas reclamar. Guarda la respuesta por si vuelven a facturarte.'], fechas });
    }

    if (r.pruebaReclamacion === 'ninguna') {
      recorrido = 'A';
      avisos.push('Como no tienes prueba de tu reclamación anterior, la Oficina no podría comprobarla. Lo adecuado es presentar ahora una reclamación por escrito y pedir su número de referencia.');
    } else if (r.fechaReclamacion && r.fechaReclamacion <= fechaHoy && r.respuesta) {
      if (r.respuesta === 'sin_respuesta') {
        fechas.finPlazoRespuesta = sumarMeses(r.fechaReclamacion, 1);
        if (fechaHoy <= fechas.finPlazoRespuesta) {
          falta(faltan, 'esperar_respuesta', `El operador tiene un mes para responderte: hasta el ${fechaLarga(fechas.finPlazoRespuesta)}. Si para entonces no ha contestado, vuelve a partir del día siguiente para preparar la reclamación ante la Oficina.`);
        } else {
          fechas.inicioPlazoOaut = fechas.finPlazoRespuesta;
        }
      } else if (r.respuesta === 'insatisfactoria') {
        if (!r.fechaRespuesta) falta(faltan, 'fecha_respuesta', 'Indica la fecha de la respuesta del operador.');
        else if (r.fechaRespuesta < r.fechaReclamacion || r.fechaRespuesta > fechaHoy) falta(faltan, 'fecha_respuesta_incoherente', 'La fecha de la respuesta debe estar entre tu reclamación y hoy.');
        else fechas.inicioPlazoOaut = r.fechaRespuesta;
      }
      if (fechas.inicioPlazoOaut) {
        fechas.limiteOaut = sumarMeses(fechas.inicioPlazoOaut, 3);
        if (fechaHoy > fechas.limiteOaut) {
          falta(excluyen, 'plazo_oaut_vencido', `El plazo de tres meses para acudir a la Oficina de Atención al Usuario de Telecomunicaciones terminó el ${fechaLarga(fechas.limiteOaut)} (art. 4.3 de la Orden ITC/1030/2007). Aún puedes acudir a la Junta Arbitral de Consumo de tu comunidad autónoma o a los servicios de consumo, que son gratuitos.`);
        } else {
          recorrido = 'B';
          fechas.diasRestantesOaut = diasEntre(fechaHoy, fechas.limiteOaut);
          avisos.push(`Tienes hasta el ${fechaLarga(fechas.limiteOaut)} para presentar la reclamación ante la Oficina (quedan ${fechas.diasRestantesOaut} días).`);
          if (fechas.diasRestantesOaut <= 10) avisos.push('Queda poco plazo: preséntala en cuanto recibas el expediente.');
          if (r.fechaPrimeraFactura && r.fechaReclamacion > sumarMeses(r.fechaPrimeraFactura, 1)) {
            avisos.push('Reclamaste al operador más de un mes después de recibir la factura. La Oficina exige reclamar en el plazo de un mes desde que conociste el hecho (art. 4.1 de la Orden ITC/1030/2007) y podría no admitir tu reclamación.');
          }
        }
      }
    }
  }

  avisos.push('Que una factura llegue después de la baja no significa que sea indebida: en el siguiente paso comprobaremos qué periodo cubre cada factura.');

  if (excluyen.length) return resultado('excluido', r, { faltan, excluyen, avisos, fechas });
  if (faltan.length || !recorrido) return resultado('incompleto', r, { faltan, excluyen, avisos, fechas });
  return resultado(recorrido, r, { faltan, excluyen, avisos, fechas });
}

function resultado(estado, respuestas, { faltan, excluyen, avisos, fechas }) {
  const producto = estado === 'A' ? 'operador' : estado === 'B' ? 'oaut' : null;
  return { estado, producto, faltan, excluyen, avisos, fechas, respuestas, versionReglas: VERSION_REGLAS };
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
