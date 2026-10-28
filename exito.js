// Página tras el pago: consulta el estado (el servidor confirma el pago con Stripe) y ofrece las descargas.
const $ = (s) => document.querySelector(s);

function leer(clave) {
  try { return JSON.parse(sessionStorage.getItem(clave)); } catch { return null; }
}
function guardar(clave, valor) {
  try { sessionStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

// El enlace del email trae el token en el fragmento (#t=…), que no se envía al servidor ni queda en registros.
const fragmento = new URLSearchParams(location.hash.slice(1));
if (fragmento.get('t')) {
  guardar('bc_token', fragmento.get('t'));
  history.replaceState(null, '', location.pathname);
}
const token = leer('bc_token');
const cred = leer('bc_cred');
const idUrl = new URLSearchParams(location.search).get('e');
const acceso = token && (!idUrl || !cred || cred.expediente !== idUrl) ? { token } : cred && (!idUrl || cred.expediente === idUrl) ? cred : null;

function el(etiqueta, atributos = {}, ...hijos) {
  const n = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (k === 'texto') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  hijos.flat().forEach(h => h && n.append(h));
  return n;
}

const megas = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

async function consultar() {
  const r = await fetch('/api/estado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(acceso) });
  return { estado: r.status, datos: await r.json().catch(() => ({})) };
}

async function descargar(boton, archivo) {
  boton.disabled = true;
  try {
    const r = await fetch('/api/descargar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...acceso, archivo }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    window.location.href = d.url;
  } catch (e) {
    alert(e.message || 'No se ha podido descargar. Vuelve a intentarlo.');
  } finally {
    setTimeout(() => { boton.disabled = false; }, 1500);
  }
}

function pintarEntrega(d) {
  $('#titulo').textContent = 'Tus documentos están listos';
  $('#estado').replaceChildren(el('div', { class: 'mensaje ok' },
    el('p', { texto: `Pago confirmado. Referencia ${d.referencia}.` }),
    el('p', { texto: d.emailEnviado ? `También te los hemos enviado a ${d.email}, con un enlace válido 30 días.` : 'Descárgalos ahora: el enlace por email puede tardar unos minutos.' })));
  const descripcion = {
    reclamacion: 'Reclamación a la compañía, con índice y anexos (para presentar)',
    expediente: 'Expediente completo: formulario oficial, escrito explicativo y anexos',
    formulario: 'Formulario oficial rellenado (por separado)',
    explicacion: 'Escrito explicativo y relación de importes (por separado)',
    guia: 'Guía de presentación (para ti)',
    confirmacion: 'Confirmación del pedido y condiciones'
  };
  const boton = (a, texto) => el('li', {}, el('button', { type: 'button', class: a.principal ? 'boton' : 'boton secundario', onclick: (e) => descargar(e.currentTarget, a.codigo) },
    el('span', { texto }), el('span', { texto: megas(a.bytes) })));
  const lista = el('ul', { class: 'descargas' }, d.archivos.map(a => boton(a, descripcion[a.codigo] || a.nombre)));
  const bloques = [el('h2', { texto: 'Descargas' }), lista];
  if (d.anexos.length) {
    bloques.push(el('h3', { texto: 'Anexos por separado (para subirlos uno a uno)' }), el('ul', { class: 'descargas' }, d.anexos.map(a => boton(a, a.nombre))));
  }
  $('#descargas').replaceChildren(...bloques);

  const pasos = d.producto.codigo === 'operador'
    ? ['Revisa la reclamación y fírmala.', `Preséntala a ${d.operador} por un canal que deje constancia (formulario del área de cliente, email o burofax) y pide el número de referencia.`, 'Guarda el justificante y la respuesta.', 'Si en un mes no responde o no lo resuelve, tienes tres meses para acudir a la Oficina de Atención al Usuario de Telecomunicaciones.']
    : ['Revisa el formulario y el escrito explicativo. Escribe la fecha, firma y marca la declaración de copias en la página 2 del formulario.', 'Preséntalo por internet (certificado, DNI electrónico o Cl@ve) o en papel por correo o en un registro, como explica la guía.', `Fecha límite: ${d.limiteOaut}.`];
  $('#pasos').replaceChildren(el('h2', { texto: 'Próximos pasos' }), el('ol', {}, pasos.map(p => el('li', { texto: p }))));
  try { ['bc_respuestas', 'bc_datos'].forEach(k => sessionStorage.removeItem(k)); } catch { /* nada */ }
}

async function iniciar() {
  if (!acceso) {
    $('#titulo').textContent = 'Abre el enlace de tu email';
    $('#estado').replaceChildren(el('p', { texto: 'Por seguridad, solo puedes ver tus documentos desde la pestaña en la que pagaste o desde el enlace que te enviamos por email.' }));
    return;
  }
  for (let intento = 0; intento < 80; intento++) {
    let r;
    try { r = await consultar(); } catch { r = { estado: 0, datos: {} }; }
    if (r.estado === 404) {
      $('#titulo').textContent = 'No encontramos tu pedido';
      $('#estado').replaceChildren(el('p', { texto: 'El enlace ha caducado (los documentos se guardan 30 días) o no es correcto. Si acabas de pagar, escríbenos con el email que usaste.' }));
      return;
    }
    const d = r.datos;
    if (d.estado === 'entregado') return pintarEntrega(d);
    if (d.estado === 'sin_pago') { window.location.href = '/reclamar.html#revisar'; return; }
    const texto = d.estado === 'esperando_pago'
      ? 'Esperando la confirmación del pago…'
      : d.estado === 'error_entrega'
        ? 'Tu pago está confirmado, pero la preparación está tardando más de lo normal. Lo seguimos intentando automáticamente; también te avisaremos por email.'
        : 'Pago confirmado. Preparando tus documentos…';
    $('#estado').replaceChildren(el('p', {}, el('span', { class: 'cargando', 'aria-hidden': 'true' }), ` ${texto}`));
    await new Promise(ok => setTimeout(ok, intento < 20 ? 3000 : 10000));
  }
  $('#estado').replaceChildren(el('p', { class: 'mensaje aviso', texto: 'Está tardando más de lo habitual. Si has pagado, recibirás los documentos por email en cuanto estén listos. Si no te llegan, escríbenos.' }));
}

iniciar();
