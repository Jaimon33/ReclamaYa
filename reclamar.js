// Formulario en tres pasos. Todo el texto que viene del servidor o de los documentos
// se pinta con textContent: nunca como HTML.
import { PRODUCTOS, LIMITES, formatearPrecio, formatearMegas } from './config-publica.js';

const OPERADORES = ['Movistar', 'Vodafone', 'Orange', 'Jazztel', 'Yoigo', 'MásMóvil', 'Simyo', 'Lowi', 'O2', 'Pepephone', 'Digi', 'Finetwork', 'Euskaltel', 'R', 'Telecable', 'Avatel', 'Adamo', 'Otro'];
const TIPOS_DOC = {
  factura: 'Factura posterior a la baja',
  prueba_baja: 'Prueba de la solicitud de baja',
  reclamacion: 'Reclamación a la compañía',
  respuesta_operador: 'Respuesta de la compañía',
  contrato: 'Contrato o condiciones',
  otro: 'Otro documento'
};
const TAMANO_PARTE = 3 * 1024 * 1024;
const ALMACEN = { cred: 'bc_cred', respuestas: 'bc_respuestas', datos: 'bc_datos', inicio: 'bc_inicio' };

const $ = (sel) => document.querySelector(sel);
let vista = null;
let cred = leerAlmacen(ALMACEN.cred);
const subidasEnCurso = new Map();

// ——— Utilidades ———

function leerAlmacen(clave) {
  try { return JSON.parse(sessionStorage.getItem(clave)); } catch { return null; }
}
function guardarAlmacen(clave, valor) {
  try { valor == null ? sessionStorage.removeItem(clave) : sessionStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

function el(etiqueta, atributos = {}, ...hijos) {
  const n = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'texto') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) n.append(h instanceof Node ? h : document.createTextNode(String(h)));
  return n;
}

const euros = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;
const fecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const megas = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const formato = (tipo) => ({ 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' }[tipo] || tipo);

async function api(ruta, cuerpo = {}) {
  const r = await fetch(`/api/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(cred || {}), ...cuerpo })
  });
  let datos = {};
  try { datos = await r.json(); } catch { /* sin cuerpo */ }
  if (r.status === 404 && cred && ruta !== 'expediente') caducado();
  return { estado: r.status, datos };
}

function caducado() {
  guardarAlmacen(ALMACEN.cred, null);
  cred = null;
  mostrarMensaje($('#resultado'), 'error', 'Tu expediente ha caducado o ya no existe. Vuelve a comprobar tu caso.');
  mostrarPaso(1);
}

function mostrarMensaje(contenedor, tipo, titulo, lista = []) {
  contenedor.replaceChildren();
  if (!titulo && !lista.length) return;
  const caja = el('div', { class: `mensaje ${tipo}` }, titulo ? el('p', { texto: titulo }) : null);
  if (lista.length) caja.append(el('ul', {}, lista.map(t => el('li', { texto: t }))));
  contenedor.append(caja);
}

// ——— Navegación entre pasos ———

function mostrarPaso(n, { anotar = true } = {}) {
  for (let i = 1; i <= 3; i++) {
    $(`#paso-${i}`).hidden = i !== n;
    const p = $(`#prog-${i}`);
    p.classList.toggle('activo', i === n);
    p.classList.toggle('hecho', i < n);
    if (i === n) p.setAttribute('aria-current', 'step'); else p.removeAttribute('aria-current');
  }
  if (anotar) history.pushState({ paso: n }, '', n === 3 ? '#revisar' : `#paso-${n}`);
  window.scrollTo({ top: 0 });
  $(`#t-paso-${n}`).focus({ preventScroll: true });
  if (n === 2) pintarPaso2();
  if (n === 3) pintarResumen();
}

window.addEventListener('popstate', (e) => {
  const n = e.state?.paso || 1;
  if (n > 1 && !cred) return mostrarPaso(1, { anotar: false });
  if (n === 3 && !vista?.resumen) return mostrarPaso(2, { anotar: false });
  mostrarPaso(n, { anotar: false });
});

document.addEventListener('click', (e) => {
  const destino = e.target.closest('[data-ir]');
  if (!destino) return;
  e.preventDefault();
  mostrarPaso(Number(destino.dataset.ir));
});

// ——— Paso 1: comprobar el caso ———

const form1 = $('#form-caso');
const ORDEN = ['titular', 'tipoTitular', 'operador', 'servicio', 'viaBaja', 'pruebaBaja', 'fechaSolicitud', 'conceptos', 'fechaPrimeraFactura', 'reclamado', 'situaciones'];
const DECISIVAS = { titular: 'no', tipoTitular: 'empresa', viaBaja: 'portabilidad' };

$('#operador').append(...OPERADORES.map(o => el('option', { value: o, texto: o === 'Otro' ? 'Otra compañía' : o })));

function leerRespuestas() {
  const f = new FormData(form1);
  const r = {};
  for (const campo of ['titular', 'tipoTitular', 'operador', 'operadorOtro', 'servicio', 'viaBaja', 'pruebaBaja', 'fechaSolicitud', 'fechaPrimeraFactura', 'reclamado', 'fechaReclamacion', 'pruebaReclamacion', 'respuesta', 'fechaRespuesta']) {
    r[campo] = (f.get(campo) || '').toString().trim();
  }
  r.fechaDeseada = $('#pidioFecha').checked ? $('#fechaDeseada').value : '';
  r.conceptos = f.getAll('conceptos');
  r.situaciones = f.getAll('situaciones');
  if (r.reclamado !== 'si') Object.assign(r, { fechaReclamacion: '', pruebaReclamacion: '', respuesta: '', fechaRespuesta: '' });
  if (r.respuesta !== 'insatisfactoria') r.fechaRespuesta = '';
  return r;
}

function respondida(clave, r) {
  if (clave === 'conceptos') return r.conceptos.length > 0;
  if (clave === 'situaciones') return true;
  if (clave === 'fechaPrimeraFactura') return true;
  if (clave === 'operador') return r.operador && (r.operador !== 'Otro' || r.operadorOtro);
  if (clave === 'reclamado') return r.reclamado === 'no' || (r.reclamado === 'si' && r.fechaReclamacion && r.pruebaReclamacion && r.respuesta && (r.respuesta !== 'insatisfactoria' || r.fechaRespuesta));
  return Boolean(r[clave]);
}

function actualizarVisibilidad() {
  const r = leerRespuestas();
  let visible = true;
  let decisiva = false;
  for (const clave of ORDEN) {
    const bloque = form1.querySelector(`[data-q="${clave}"]`);
    bloque.classList.toggle('pregunta-oculta', !visible || decisiva);
    if (DECISIVAS[clave] && r[clave] === DECISIVAS[clave]) decisiva = true;
    if (!respondida(clave, r)) visible = false;
  }
  $('#campo-operador-otro').classList.toggle('pregunta-oculta', r.operador !== 'Otro');
  $('#campo-fecha-deseada').classList.toggle('pregunta-oculta', !$('#pidioFecha').checked);
  const bloqueReclamado = form1.querySelector('[data-q="reclamado"]');
  $('#bloque-previa').classList.toggle('pregunta-oculta', r.reclamado !== 'si' || bloqueReclamado.classList.contains('pregunta-oculta'));
  $('#campo-fecha-respuesta').classList.toggle('pregunta-oculta', r.respuesta !== 'insatisfactoria');
  $('#acciones-paso-1').classList.toggle('pregunta-oculta', !(decisiva || visible));
  guardarAlmacen(ALMACEN.respuestas, r);
  if (!leerAlmacen(ALMACEN.inicio)) {
    guardarAlmacen(ALMACEN.inicio, true);
    fetch('/api/expediente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'evento', evento: 'inicio' }) }).catch(() => {});
  }
}

function rellenarRespuestas(r) {
  if (!r) return;
  for (const [campo, valor] of Object.entries(r)) {
    if (Array.isArray(valor)) {
      form1.querySelectorAll(`input[name="${campo}"]`).forEach(i => { i.checked = valor.includes(i.value); });
    } else {
      const radios = form1.querySelectorAll(`input[type="radio"][name="${campo}"]`);
      if (radios.length) radios.forEach(i => { i.checked = i.value === valor; });
      else if (form1.elements[campo]) form1.elements[campo].value = valor || '';
    }
  }
  if (r.fechaDeseada) { $('#pidioFecha').checked = true; $('#fechaDeseada').value = r.fechaDeseada; }
  $('#ninguna-situacion').checked = Array.isArray(r.situaciones) && r.situaciones.length === 0 && Boolean(r.reclamado);
  actualizarVisibilidad();
}

form1.addEventListener('input', actualizarVisibilidad);
form1.addEventListener('change', (e) => {
  if (e.target.id === 'ninguna-situacion' && e.target.checked) form1.querySelectorAll('input[name="situaciones"]').forEach(i => { i.checked = false; });
  if (e.target.name === 'situaciones' && e.target.checked) $('#ninguna-situacion').checked = false;
  actualizarVisibilidad();
});

form1.addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = form1.querySelector('button[type="submit"]');
  boton.disabled = true;
  mostrarMensaje($('#errores-paso-1'), '', '');
  try {
    const { estado, datos } = await api('expediente', { accion: 'evaluar', respuestas: leerRespuestas(), expediente: undefined, clave: undefined });
    if (estado !== 200) throw new Error(datos.error || 'No hemos podido comprobar tu caso.');
    pintarResultado(datos.evaluacion);
  } catch (error) {
    mostrarMensaje($('#errores-paso-1'), 'error', error.message);
  } finally {
    boton.disabled = false;
  }
});

function pintarResultado(ev) {
  const caja = $('#resultado');
  caja.replaceChildren();
  const avisos = ev.avisos?.length ? el('div', { class: 'mensaje aviso' }, el('ul', {}, ev.avisos.map(a => el('li', { texto: a })))) : null;

  if (ev.estado === 'A' || ev.estado === 'B') {
    const p = PRODUCTOS[ev.producto];
    const titulo = ev.estado === 'A' ? 'Tu caso encaja: reclamación a la compañía' : 'Tu caso encaja: expediente para la Oficina del Ministerio';
    const explicacion = ev.estado === 'A'
      ? 'Como todavía no has reclamado (o no puedes acreditarlo), el primer paso es reclamar por escrito a la compañía.'
      : 'Ya reclamaste y la compañía no lo ha solucionado en plazo: puedes acudir a la Oficina de Atención al Usuario de Telecomunicaciones.';
    caja.append(el('div', { class: 'tarjeta' },
      el('h2', { texto: titulo }),
      el('p', { texto: explicacion }),
      el('p', { class: 'precio' }, formatearPrecio(p.precioCentimos), ' ', el('small', { texto: 'IVA incluido' })),
      el('p', { class: 'rotulo', texto: 'Recibirás:' }),
      el('ul', { class: 'lista-si' }, p.entrega.map(t => el('li', { texto: t }))),
      avisos,
      el('p', { class: 'ayuda', texto: 'Ahora te pediremos tus documentos. No pagas nada hasta el último paso.' }),
      el('div', { class: 'acciones' }, el('button', { type: 'button', class: 'boton ancho', onclick: continuarAPaso2, texto: 'Continuar: añadir documentos' }))
    ));
  } else if (ev.estado === 'incompleto') {
    caja.append(el('div', { class: 'tarjeta' },
      el('h2', { texto: 'Nos falta algo para seguir' }),
      el('ul', {}, ev.faltan.map(f => el('li', { texto: f.mensaje }))),
      avisos,
      el('p', { class: 'ayuda', texto: 'Cuando lo tengas, corrige tus respuestas arriba y vuelve a comprobar. No te hemos cobrado nada ni guardado tus respuestas.' })
    ));
  } else if (ev.estado === 'excluido') {
    caja.append(el('div', { class: 'tarjeta' },
      el('h2', { texto: 'Este caso no lo podemos preparar' }),
      el('ul', {}, ev.excluyen.map(f => el('li', { texto: f.mensaje }))),
      el('p', { texto: 'Puedes reclamar gratis por tu cuenta a la compañía y, después, a la Oficina de Atención al Usuario de Telecomunicaciones (usuariosteleco.digital.gob.es) o a la oficina de consumo de tu ayuntamiento o comunidad autónoma.' }),
      el('p', { class: 'ayuda', texto: 'No te hemos cobrado nada ni guardado tus respuestas.' })
    ));
  } else {
    caja.append(el('div', { class: 'tarjeta' }, el('h2', { texto: 'No necesitas reclamar' }), avisos));
  }
  caja.focus();
}

async function continuarAPaso2(e) {
  const boton = e.currentTarget;
  boton.disabled = true;
  try {
    const respuestas = leerRespuestas();
    const r = cred
      ? await api('expediente', { accion: 'respuestas', respuestas })
      : await api('expediente', { accion: 'crear', respuestas });
    if (r.estado === 201) {
      cred = { expediente: r.datos.expediente, clave: r.datos.clave };
      guardarAlmacen(ALMACEN.cred, cred);
    } else if (r.estado !== 200) {
      throw new Error(r.datos.error || 'No hemos podido guardar tu caso. Inténtalo de nuevo.');
    }
    vista = r.datos.vista;
    mostrarPaso(2);
  } catch (error) {
    mostrarMensaje($('#errores-paso-1'), 'error', error.message);
  } finally {
    boton.disabled = false;
  }
}

// ——— Paso 2: documentos y datos ———

$('#limites').textContent = `Formatos: PDF, JPG o PNG. Hasta ${LIMITES.maxArchivos} archivos, ${formatearMegas(LIMITES.maxBytesArchivo)} cada uno y ${formatearMegas(LIMITES.maxBytesTotal)} en total. Los PDF, hasta ${LIMITES.maxPaginasPdf} páginas. En el iPhone, elige las fotos desde la fototeca: se envían como JPG.`;

function requisitos() {
  const r = vista.respuestas;
  const tipos = new Set(vista.documentos.map(d => d.tipoDoc));
  const lista = [
    { texto: 'Las facturas cobradas después de la baja', ok: tipos.has('factura') },
    { texto: r.pruebaBaja === 'referencia' ? 'La prueba de la baja (documento o, al menos, su número de referencia)' : 'La prueba de que pediste la baja (email, SMS, carta o captura)', ok: tipos.has('prueba_baja') }
  ];
  if (vista.evaluacion.estado === 'B') {
    lista.push({ texto: 'Tu reclamación a la compañía (copia o número de referencia)', ok: tipos.has('reclamacion') });
    if (r.respuesta === 'insatisfactoria') lista.push({ texto: 'La respuesta de la compañía (recomendado)', ok: tipos.has('respuesta_operador') });
  }
  return lista;
}

function pintarPaso2() {
  if (!vista) return;
  $('#requisitos').replaceChildren(...requisitos().map(q => el('li', { class: q.ok ? 'cumplido' : '', texto: q.texto + (q.ok ? ' — añadido' : '') })));
  pintarDocumentos();
  const hayDocs = vista.documentos.length > 0;
  $('#form-datos').hidden = !hayDocs;
  if (hayDocs) pintarDatos();
}

function pintarDocumentos() {
  const lista = $('#lista-docs');
  lista.replaceChildren();
  vista.documentos.forEach((d, i) => {
    const estadoLectura = { pendiente: 'Leyendo el documento…', hecha: 'Datos leídos: revísalos abajo', no_disponible: 'Escribe los datos abajo', error: 'No se ha podido leer: escribe los datos abajo' }[d.lectura] || '';
    const tipo = el('select', { 'aria-label': `Tipo de documento: ${d.nombre}`, onchange: (e) => accionDocumento('tipo', d.id, { tipoDoc: e.target.value }) },
      Object.entries(TIPOS_DOC).map(([v, t]) => el('option', { value: v, texto: t, selected: v === d.tipoDoc })));
    lista.append(el('li', { class: 'doc' },
      el('div', { class: 'doc-cabecera' },
        el('div', {}, el('div', { class: 'doc-nombre', texto: `${i + 1}. ${d.nombre}` }), el('div', { class: 'doc-meta', texto: `${formato(d.tipo)} · ${megas(d.bytes)} · ${d.paginas} ${d.paginas === 1 ? 'página' : 'páginas'}` })),
      ),
      el('div', { class: 'doc-estado', texto: estadoLectura }, d.lectura === 'pendiente' ? el('span', { class: 'cargando', 'aria-hidden': 'true', style: 'margin-left:8px' }) : null),
      el('div', { class: 'doc-acciones' },
        tipo,
        el('button', { type: 'button', class: 'icono-boton', 'aria-label': `Subir ${d.nombre}`, disabled: i === 0, onclick: () => mover(i, -1), texto: '↑' }),
        el('button', { type: 'button', class: 'icono-boton', 'aria-label': `Bajar ${d.nombre}`, disabled: i === vista.documentos.length - 1, onclick: () => mover(i, 1), texto: '↓' }),
        el('button', { type: 'button', class: 'icono-boton', onclick: () => quitar(d), texto: 'Quitar' })
      )
    ));
  });
  for (const [, s] of subidasEnCurso) {
    lista.append(el('li', { class: 'doc' },
      el('div', { class: 'doc-nombre', texto: s.nombre }),
      el('div', { class: `doc-estado ${s.error ? 'error' : ''}`, texto: s.error || `Subiendo… ${s.progreso}%` },
        s.error ? el('button', { type: 'button', class: 'boton discreto', onclick: () => { subidasEnCurso.delete(s.id); pintarDocumentos(); }, texto: 'Cerrar' }) : null)
    ));
  }
}

async function accionDocumento(accion, documento, extra = {}) {
  const r = await api('documentos', { accion, documento, ...extra });
  if (r.estado === 200) { vista = r.datos.vista; pintarPaso2(); }
  else mostrarMensaje($('#mensajes-docs'), 'error', r.datos.error || 'No se ha podido guardar el cambio.');
}

function mover(i, delta) {
  const orden = vista.documentos.map(d => d.id);
  [orden[i], orden[i + delta]] = [orden[i + delta], orden[i]];
  return accionDocumento('ordenar', undefined, { orden });
}

function quitar(d) {
  if (!confirm(`¿Quitar "${d.nombre}"?`)) return;
  accionDocumento('eliminar', d.id);
}

function tipoSugerido(nombre) {
  const n = nombre.toLowerCase();
  if (/factura|recibo|invoice/.test(n)) return 'factura';
  if (/baja/.test(n)) return 'prueba_baja';
  if (/reclama/.test(n)) return 'reclamacion';
  if (/respuesta/.test(n)) return 'respuesta_operador';
  return 'otro';
}

async function subirArchivo(archivo) {
  const id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 36);
  const s = { id, nombre: archivo.name || 'foto.jpg', progreso: 0, error: '' };
  const ext = (s.nombre.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
  if (/\.(heic|heif)$/.test(ext)) s.error = `"${s.nombre}" es una foto HEIC, que todavía no podemos incorporar. Elígela desde la fototeca del iPhone (se enviará como JPG) o haz una captura de pantalla.`;
  else if (!LIMITES.extensiones.includes(ext) && !LIMITES.formatos.includes(archivo.type)) s.error = `"${s.nombre}" no es PDF, JPG ni PNG.`;
  else if (archivo.size > LIMITES.maxBytesArchivo) s.error = `"${s.nombre}" ocupa ${megas(archivo.size)}; el máximo es ${formatearMegas(LIMITES.maxBytesArchivo)}.`;
  subidasEnCurso.set(id, s);
  pintarDocumentos();
  if (s.error) return;

  const partes = Math.max(1, Math.ceil(archivo.size / TAMANO_PARTE));
  try {
    let respuesta;
    for (let i = 0; i < partes; i++) {
      const r = await fetch('/api/documentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream', 'x-expediente': cred.expediente, 'x-clave': cred.clave,
          'x-subida': id, 'x-parte': String(i), 'x-partes': String(partes),
          'x-nombre': encodeURIComponent(s.nombre), 'x-tipo-doc': tipoSugerido(s.nombre)
        },
        body: archivo.slice(i * TAMANO_PARTE, (i + 1) * TAMANO_PARTE)
      });
      respuesta = { estado: r.status, datos: await r.json().catch(() => ({})) };
      if (![201, 202].includes(r.status)) throw new Error(respuesta.datos.error || 'No se ha podido subir el archivo.');
      s.progreso = Math.round(((i + 1) / partes) * 100);
      pintarDocumentos();
    }
    subidasEnCurso.delete(id);
    vista = respuesta.datos.vista;
    pintarPaso2();
    await leerDocumento(respuesta.datos.documento);
  } catch (error) {
    s.error = error.message;
    pintarDocumentos();
  }
}

async function leerDocumento(documento) {
  const r = await api('extraer', { documento });
  if (r.estado === 200) {
    vista = r.datos.vista;
    if (r.datos.aviso) mostrarMensaje($('#mensajes-docs'), 'aviso', r.datos.aviso);
  } else {
    mostrarMensaje($('#mensajes-docs'), 'aviso', r.datos.error || 'No hemos podido leer el documento. Escribe los datos tú mismo.');
    const d = vista.documentos.find(x => x.id === documento);
    if (d) d.lectura = 'error';
  }
  pintarPaso2();
}

async function subirVarios(archivos) {
  mostrarMensaje($('#mensajes-docs'), '', '');
  for (const a of archivos) await subirArchivo(a);
}

document.querySelectorAll('[data-abrir]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.abrir).click()));
$('#archivos').addEventListener('change', (e) => { subirVarios([...e.target.files]); e.target.value = ''; });
$('#foto').addEventListener('change', (e) => { subirVarios([...e.target.files]); e.target.value = ''; });
const zona = $('#zona-subida');
zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('arrastrando'); });
zona.addEventListener('dragleave', () => zona.classList.remove('arrastrando'));
zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('arrastrando'); subirVarios([...e.dataTransfer.files]); });

// Datos: se rellenan con lo confirmado, con el borrador del navegador y, si están vacíos, con lo leído.
const CAMPOS = {
  'd-nombre': ['titular', 'nombre'], 'd-documento': ['titular', 'documento'], 'd-email': ['titular', 'email'],
  'd-telefono': ['titular', 'telefono'], 'd-domicilio': ['titular', 'domicilio'], 'd-cp': ['titular', 'cp'],
  'd-localidad': ['titular', 'localidad'], 'd-provincia': ['titular', 'provincia'],
  'd-cliente': ['numeroCliente'], 'd-lineas': ['lineas'], 'd-canal-baja': ['canalBaja'], 'd-ref-baja': ['bajaReferencia'],
  'd-canal-recl': ['canalReclamacion'], 'd-ref-recl': ['reclamacionReferencia'], 'd-respuesta': ['respuestaResumen']
};
const PROPUESTA = {
  'd-nombre': (p) => p.titular.nombre, 'd-documento': (p) => p.titular.documento, 'd-cliente': (p) => p.numeroCliente,
  'd-lineas': (p) => p.lineas, 'd-ref-baja': (p) => p.bajaReferencia, 'd-ref-recl': (p) => p.reclamacionReferencia, 'd-respuesta': (p) => p.respuestaResumen
};
const FUENTE = { 'd-nombre': 'f-nombre', 'd-documento': 'f-documento', 'd-cliente': 'f-cliente', 'd-lineas': 'f-lineas', 'd-ref-baja': 'f-ref-baja', 'd-ref-recl': 'f-ref-recl', 'd-respuesta': 'f-respuesta' };

function textoFuente(fuentes) {
  if (!fuentes?.length) return '';
  const f = fuentes[0];
  return `Leído de "${f.archivo}", pág. ${f.pagina}${fuentes.length > 1 ? ` y ${fuentes.length - 1} más` : ''}`;
}

const obtener = (obj, ruta) => ruta.reduce((o, k) => (o == null ? undefined : o[k]), obj);

function pintarDatos() {
  const esB = vista.evaluacion.estado === 'B';
  const borrador = leerAlmacen(ALMACEN.datos) || {};
  const confirmados = vista.datos || {};
  const p = vista.propuesta;
  for (const [id, ruta] of Object.entries(CAMPOS)) {
    const input = document.getElementById(id);
    if (document.activeElement === input) continue;
    let valor = obtener(borrador, ruta) ?? obtener(confirmados, ruta) ?? '';
    if (!valor && p && PROPUESTA[id]) valor = PROPUESTA[id](p).valor || '';
    if (!input.value || input.dataset.auto === '1') { input.value = valor; input.dataset.auto = obtener(borrador, ruta) ? '0' : '1'; }
    if (FUENTE[id]) $(`#${FUENTE[id]}`).textContent = p && PROPUESTA[id] && input.value && input.value === PROPUESTA[id](p).valor ? textoFuente(PROPUESTA[id](p).fuentes) : '';
  }
  $('#domicilio-opcional').textContent = esB ? '(obligatorio para la Oficina)' : '(opcional; aparece en el escrito)';
  $('#ref-baja-opcional').textContent = vista.respuestas.pruebaBaja === 'referencia' ? '(obligatorio si no subes el documento)' : '(si lo tienes)';
  $('#bloque-datos-previa').hidden = !esB;
  $('#campo-respuesta-resumen').hidden = !(esB && vista.respuestas.respuesta === 'insatisfactoria');
  const alertas = p?.alertas || [];
  mostrarMensaje($('#alertas-datos'), 'aviso', alertas.length ? 'Revisa estos puntos:' : '', alertas);
  pintarFacturas(borrador.facturas || confirmados.facturas);
}

function documentosFactura() {
  return vista.documentos.filter(d => d.tipoDoc === 'factura');
}

function pintarFacturas(guardadas) {
  const cont = $('#facturas');
  const actuales = cont.children.length ? leerFacturas() : null;
  let facturas = actuales && actuales.length ? actuales : (guardadas?.length ? guardadas : []);
  const propuestas = vista.propuesta?.facturas || [];
  // Una factura por cada archivo de factura que aún no tenga ninguna.
  for (const d of documentosFactura()) {
    if (!facturas.some(f => f.documento === d.id)) {
      const pr = propuestas.find(x => x.documento === d.id);
      facturas.push(pr ? { ...pr } : { documento: d.id });
    }
  }
  // Completa campos vacíos con lo leído, sin pisar lo que haya escrito el cliente.
  facturas = facturas.map(f => {
    const pr = propuestas.find(x => x.documento === f.documento && (!f.numero || !x.numero || x.numero === f.numero));
    if (!pr) return f;
    const r = { ...f };
    for (const k of ['numero', 'fechaEmision', 'periodoDesde', 'periodoHasta', 'importeTotal', 'importeServicio']) if (r[k] == null || r[k] === '') r[k] = pr[k];
    r._fuente = pr.fuente; r._excluidos = pr.conceptosExcluidos; r._revisar = pr.revisar;
    return r;
  });
  facturas = facturas.filter(f => !f.documento || vista.documentos.some(d => d.id === f.documento));
  cont.replaceChildren(...facturas.map((f, i) => bloqueFactura(f, i)));
}

// Acepta "36,30", "1.036,30" y "36.30".
function aNumero(texto) {
  const v = String(texto ?? '').replace(/[€\s]/g, '');
  if (!v) return null;
  const n = Number(v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v);
  return Number.isFinite(n) ? n : null;
}

function bloqueFactura(f, i) {
  const pre = `fa-${i}`;
  const valor = (nombre) => (typeof f[nombre] === 'number' ? f[nombre].toFixed(2).replace('.', ',') : f[nombre] ?? '');
  const campo = (nombre, etiqueta, tipo, extra = {}) => el('div', { class: 'campo' },
    el('label', { for: `${pre}-${nombre}`, texto: etiqueta }),
    el('input', { id: `${pre}-${nombre}`, 'data-campo': nombre, type: tipo, value: valor(nombre), ...extra }));
  const archivo = el('select', { id: `${pre}-documento`, 'data-campo': 'documento' },
    el('option', { value: '', texto: 'Elige el archivo' }),
    documentosFactura().map(d => el('option', { value: d.id, texto: d.nombre, selected: d.id === f.documento })));
  return el('div', { class: 'factura', 'data-factura': String(i) },
    el('h4', { texto: `Factura ${i + 1}` }),
    f._fuente ? el('span', { class: 'fuente', texto: `Datos leídos de "${f._fuente.archivo}", pág. ${f._fuente.pagina}. Revísalos.` }) : null,
    f._excluidos?.length ? el('p', { class: 'mensaje aviso', texto: `Incluye conceptos que no reclamamos: ${f._excluidos.join(', ')}. En "importe del servicio" pon solo cuotas y consumos, con IVA.` }) : null,
    el('div', { class: 'campo' }, el('label', { for: `${pre}-documento`, texto: 'Archivo' }), archivo),
    el('div', { class: 'fila dos' }, campo('numero', 'Número de factura', 'text', { maxlength: 40 }), campo('fechaEmision', 'Fecha de emisión', 'date')),
    el('p', { class: 'rotulo', texto: 'Periodo que cubre la factura' }),
    el('div', { class: 'fila dos' }, campo('periodoDesde', 'Desde', 'date'), campo('periodoHasta', 'Hasta', 'date')),
    el('div', { class: 'fila dos' },
      campo('importeTotal', 'Total de la factura (€)', 'text', { inputmode: 'decimal', placeholder: '0,00' }),
      campo('importeServicio', 'Importe del servicio dado de baja (€)', 'text', { inputmode: 'decimal', placeholder: '0,00' })),
    el('button', { type: 'button', class: 'boton discreto', onclick: (e) => { e.currentTarget.closest('.factura').remove(); guardarBorrador(); }, texto: 'Quitar esta factura' })
  );
}

function leerFacturas() {
  return [...$('#facturas').querySelectorAll('.factura')].map(b => {
    const f = {};
    b.querySelectorAll('[data-campo]').forEach(i => { f[i.dataset.campo] = i.value.trim(); });
    for (const k of ['importeTotal', 'importeServicio']) f[k] = aNumero(f[k]);
    return f;
  });
}

function leerDatos() {
  const d = { titular: {} };
  for (const [id, ruta] of Object.entries(CAMPOS)) {
    const v = document.getElementById(id).value.trim();
    if (ruta.length === 2) d.titular[ruta[1]] = v; else d[ruta[0]] = v;
  }
  d.facturas = leerFacturas();
  return d;
}

function guardarBorrador() {
  guardarAlmacen(ALMACEN.datos, leerDatos());
}

$('#form-datos').addEventListener('input', (e) => { if (e.target.dataset) e.target.dataset.auto = '0'; guardarBorrador(); });
$('#anadir-factura').addEventListener('click', () => {
  const cont = $('#facturas');
  cont.append(bloqueFactura({ documento: documentosFactura()[0]?.id || '' }, cont.children.length));
  guardarBorrador();
});

$('#form-datos').addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = e.submitter || $('#form-datos button[type="submit"]');
  boton.disabled = true;
  mostrarMensaje($('#errores-datos'), '', '');
  try {
    if (subidasEnCurso.size && [...subidasEnCurso.values()].some(s => !s.error)) throw new Error('Espera a que terminen de subirse los archivos.');
    const r = await api('expediente', { accion: 'confirmar', datos: leerDatos() });
    if (r.estado === 422) {
      vista = r.datos.vista;
      mostrarMensaje($('#errores-datos'), 'error', 'Corrige esto para continuar:', r.datos.errores);
      $('#errores-datos').scrollIntoView({ block: 'center' });
      return;
    }
    if (r.estado !== 200) throw new Error(r.datos.error || 'No hemos podido guardar tus datos.');
    vista = r.datos.vista;
    mostrarPaso(3);
  } catch (error) {
    mostrarMensaje($('#errores-datos'), 'error', error.message);
  } finally {
    boton.disabled = false;
  }
});

// ——— Paso 3: resumen y pago ———

function pintarResumen() {
  const caja = $('#resumen');
  caja.replaceChildren();
  const s = vista?.resumen;
  if (!s) return;
  const p = vista.producto;
  const fila = (t, v) => (v ? [el('dt', { texto: t }), el('dd', { texto: v })] : []);
  const previa = s.reclamacionPrevia
    ? `${fecha(s.reclamacionPrevia.fecha)} · ${s.reclamacionPrevia.respuesta === 'sin_respuesta' ? 'sin respuesta' : `respuesta del ${fecha(s.reclamacionPrevia.fechaRespuesta)} sin solución`}`
    : '';
  caja.append(
    el('div', { class: 'tarjeta resumen' },
      el('h2', { texto: 'Tu caso' }),
      el('dl', {},
        fila('Compañía', s.operador), fila('Servicio', s.servicio), fila('Titular', s.titular),
        fila('Contrato', s.contrato), fila('Línea(s)', s.lineas),
        fila('Pediste la baja', fecha(s.fechaSolicitud)), fila('Debía ser efectiva', fecha(s.fechaEfectiva)),
        fila('Reclamación previa', previa), fila('Plazo para la Oficina', s.limiteOaut ? `hasta el ${fecha(s.limiteOaut)}` : '')),
      el('h3', { style: 'margin-top:18px', texto: 'Importes que se reclaman' }),
      el('div', { class: 'tabla-scroll' }, el('table', {},
        el('thead', {}, el('tr', {}, el('th', { texto: 'Factura' }), el('th', { texto: 'Periodo' }), el('th', { class: 'num', texto: 'Se reclama' }))),
        el('tbody', {}, s.facturas.map(f => el('tr', {},
          el('td', { texto: f.numero || '—' }),
          el('td', { texto: `${fecha(f.periodoDesde)} – ${fecha(f.periodoHasta)}${f.tipo === 'parcial' ? ` (${f.diasReclamables} de ${f.totalDias} días)` : f.tipo === 'fuera' ? ' (anterior a la baja)' : ''}` }),
          el('td', { class: 'num', texto: euros(f.reclamado) })))),
        el('tfoot', {}, el('tr', {}, el('td', { colspan: '2', class: 'total', texto: 'Total' }), el('td', { class: 'num total', texto: euros(s.total) }))))),
      el('h3', { style: 'margin-top:18px', texto: 'Documentos que irán como anexos' }),
      el('ol', {}, s.documentos.map(d => el('li', { texto: `${d.tipoDoc}: ${d.nombre} (${d.paginas} ${d.paginas === 1 ? 'pág.' : 'págs.'})` })))
    ),
    s.avisos?.length ? el('div', { class: 'mensaje aviso', style: 'margin-top:16px' }, el('ul', {}, s.avisos.map(a => el('li', { texto: a })))) : null,
    el('div', { class: 'tarjeta', style: 'margin-top:16px' },
      el('h2', { texto: p.nombre }),
      el('p', { class: 'precio' }, formatearPrecio(p.precioCentimos), ' ', el('small', { texto: 'IVA incluido, pago único' })),
      el('ul', { class: 'lista-si' }, p.entrega.map(t => el('li', { texto: t }))),
      el('p', { class: 'ayuda', texto: 'El escrito completo se prepara después del pago. Lo descargas al momento y te llega por email.' }))
  );
  $('#boton-pagar').textContent = `Pagar ${formatearPrecio(p.precioCentimos)}`;
}

$('#form-pago').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errores = [];
  if (!$('#acepta-condiciones').checked) errores.push('Acepta las condiciones de contratación.');
  if (!$('#ejecucion-inmediata').checked) errores.push('Marca que quieres que preparemos los documentos de inmediato.');
  if (errores.length) return mostrarMensaje($('#errores-pago'), 'error', 'Antes de pagar:', errores);
  const boton = $('#boton-pagar');
  boton.disabled = true;
  boton.textContent = 'Preparando el pago…';
  mostrarMensaje($('#errores-pago'), '', '');
  try {
    const r = await api('checkout', { aceptaCondiciones: true, ejecucionInmediata: true });
    if (r.estado === 200 && r.datos.url) { window.location.href = r.datos.url; return; }
    if (r.datos.estado && r.datos.estado !== 'borrador') { window.location.href = `/exito.html?e=${encodeURIComponent(cred.expediente)}`; return; }
    mostrarMensaje($('#errores-pago'), 'error', r.datos.error || 'No hemos podido abrir el pago.', r.datos.errores || []);
  } catch {
    mostrarMensaje($('#errores-pago'), 'error', 'No hemos podido abrir el pago. Revisa tu conexión.');
  }
  boton.disabled = false;
  pintarResumen();
});

$('#borrar-expediente').addEventListener('click', async () => {
  if (!confirm('Se borrarán tus respuestas, datos y documentos. ¿Seguro?')) return;
  if (cred) await api('expediente', { accion: 'borrar' });
  Object.values(ALMACEN).forEach(k => guardarAlmacen(k, null));
  window.location.href = '/reclamar.html';
});

// ——— Arranque ———

async function iniciar() {
  rellenarRespuestas(leerAlmacen(ALMACEN.respuestas));
  if (!cred) {
    history.replaceState({ paso: 1 }, '', location.pathname);
    return;
  }
  const r = await api('expediente', { accion: 'leer' });
  if (r.estado !== 200) {
    guardarAlmacen(ALMACEN.cred, null);
    cred = null;
    history.replaceState({ paso: 1 }, '', location.pathname);
    return;
  }
  vista = r.datos.vista;
  if (vista.estado !== 'borrador') { window.location.href = `/exito.html?e=${encodeURIComponent(cred.expediente)}`; return; }
  rellenarRespuestas(vista.respuestas);
  const paso = location.hash === '#revisar' && vista.resumen ? 3 : location.hash === '#paso-1' ? 1 : 2;
  history.replaceState({ paso }, '', paso === 3 ? '#revisar' : `#paso-${paso}`);
  mostrarPaso(paso, { anotar: false });
  // Documentos que se quedaron sin leer (p. ej. si se recargó la página a mitad).
  for (const d of vista.documentos.filter(x => x.lectura === 'pendiente')) await leerDocumento(d.id);
}

iniciar();
