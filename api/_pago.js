// Confirmación del pago (solo con datos verificados por el servidor) y entrega de los documentos.
import Stripe from 'stripe';
import { Resend } from 'resend';
import { PRODUCTOS, MONEDA, MARCA, PRESTADOR, RETENCION, urlBase, formatearPrecio } from './_config.js';
import { comando, guardarJSON, guardarBinario, leerBinario, prolongarBinario, bloquear, desbloquear } from './_almacen.js';
import { leerExpediente, guardarExpediente, generarClave, resumen, credenciales, expedienteAutorizado } from './_seguridad.js';
import { generarEntregables, prepararAnexos } from './_entregables.js';
import { registrar } from './_metricas.js';
import { nombreOperador, euros, fechaLarga } from './_reglas.js';

let stripe;
export function clienteStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

let resend;
function clienteResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const REMITENTE = `${MARCA.nombre} <${PRESTADOR.email}>`;
const EMAIL_ALERTAS = process.env.ALERTAS_EMAIL || PRESTADOR.email;

export async function enviarAlerta(asunto, lineas) {
  console.error(`ALERTA: ${asunto}\n${lineas.join('\n')}`);
  const r = clienteResend();
  if (!r) return;
  try {
    await r.emails.send({ from: REMITENTE, to: EMAIL_ALERTAS, subject: `Aviso: ${asunto}`, text: lineas.join('\n') });
  } catch (e) {
    console.error('No se pudo enviar la alerta:', e.message);
  }
}

// Si el cliente cambia algo después de abrir el pago, la sesión anterior se anula:
// solo se puede pagar lo que se ha revisado en el último resumen.
export async function anularPagoPendiente(exp) {
  if (!exp.pago?.sesion || exp.estado !== 'borrador') return;
  const s = clienteStripe();
  if (s && !exp.pago.sesion.startsWith('cs_simulada_')) {
    const sesion = await s.checkout.sessions.retrieve(exp.pago.sesion);
    if (sesion.payment_status === 'paid') throw Object.assign(new Error('Este expediente ya está pagado.'), { pagado: true });
    if (sesion.status === 'open') await s.checkout.sessions.expire(sesion.id).catch(() => {});
  }
  delete exp.pago;
}

// Comprueba la sesión de Stripe contra lo que el servidor guardó al crearla.
// Devuelve un motivo de rechazo o null si todo cuadra.
export function motivoRechazo(sesion, exp) {
  const producto = PRODUCTOS[sesion.metadata?.producto];
  if (!exp) return 'expediente inexistente o caducado';
  if (!exp.pago || exp.pago.sesion !== sesion.id) return 'la sesión no es la última creada para este expediente';
  if (!producto || producto.codigo !== exp.pago.producto) return 'producto distinto del contratado';
  if (sesion.mode !== 'payment') return 'modo de pago inesperado';
  if (sesion.payment_status !== 'paid') return 'pago no completado';
  if (sesion.currency !== MONEDA) return `moneda inesperada (${sesion.currency})`;
  if (sesion.amount_total !== producto.precioCentimos || sesion.amount_total !== exp.pago.importeCentimos) return `importe inesperado (${sesion.amount_total})`;
  if (sesion.metadata?.expediente !== exp.id || sesion.client_reference_id !== exp.id) return 'expediente distinto';
  return null;
}

// Marca el expediente como pagado. Idempotente: un segundo aviso del mismo pago no hace nada.
export async function registrarPago(sesion) {
  const exp = await leerExpediente(sesion.metadata?.expediente);
  if (exp && ['pagado', 'entregado', 'error_entrega'].includes(exp.estado) && exp.pago?.sesion === sesion.id) return { exp, nuevo: false };
  const motivo = motivoRechazo(sesion, exp);
  if (motivo) {
    await registrar('error_pago', exp?.pago?.producto);
    await enviarAlerta('Pago que no cuadra con su expediente', [
      `Motivo: ${motivo}`, `Sesión de Stripe: ${sesion.id}`, `Importe: ${sesion.amount_total} ${sesion.currency}`,
      'No se ha entregado nada. Revísalo en Stripe y, si procede, devuelve el importe.'
    ]);
    return { exp, rechazo: motivo };
  }
  exp.estado = 'pagado';
  exp.pago.pagadoEn = new Date().toISOString();
  exp.pago.pagoStripe = typeof sesion.payment_intent === 'string' ? sesion.payment_intent : sesion.payment_intent?.id || '';
  await guardarExpediente(exp);
  await guardarJSON(`pedido:${exp.id}`, {
    referencia: exp.referencia, producto: exp.pago.producto, importeCentimos: exp.pago.importeCentimos,
    pagadoEn: exp.pago.pagadoEn, sesion: sesion.id, email: exp.datos.titular.email,
    condiciones: exp.aceptacion.version, plantillas: exp.versionPlantillas, reglas: exp.evaluacion.versionReglas
  }, RETENCION.registroPedido);
  await registrar('pago_confirmado', exp.pago.producto);
  return { exp, nuevo: true };
}

// Si el aviso de Stripe no ha llegado, el servidor consulta la sesión directamente a Stripe.
export async function comprobarPagoPendiente(exp) {
  const s = clienteStripe();
  if (!s || !exp.pago?.sesion || exp.estado !== 'borrador') return exp;
  const sesion = await s.checkout.sessions.retrieve(exp.pago.sesion);
  if (sesion.payment_status !== 'paid') return exp;
  const { exp: actualizado } = await registrarPago(sesion);
  return actualizado || exp;
}

function htmlEmail(exp, enlace, adjuntados) {
  const producto = PRODUCTOS[exp.pago.producto];
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pasos = exp.pago.producto === 'operador'
    ? ['Revisa y firma la reclamación.', `Preséntala a ${nombreOperador(exp.respuestas)} por un canal que deje constancia y pide el número de referencia.`, 'Si en un mes no responde o no lo resuelve, puedes acudir a la Oficina de Atención al Usuario de Telecomunicaciones.']
    : ['Revisa, fecha y firma el formulario y el escrito explicativo.', 'Preséntalo por internet o en papel siguiendo la guía.', `Fecha límite: ${fechaLarga(exp.evaluacion.fechas.limiteOaut)}.`];
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#17212b">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;padding:28px">
<p style="font-weight:bold;color:${MARCA.colorPrincipal};margin:0 0 16px">${esc(MARCA.nombre)}</p>
<h1 style="font-size:20px;margin:0 0 12px">Tus documentos están listos</h1>
<p style="line-height:1.6">${esc(producto.nombre)} · Referencia ${esc(exp.referencia)} · Importe reclamado: ${esc(euros(exp.calculo.total))}</p>
<p style="margin:24px 0"><a href="${esc(enlace)}" style="background:${MARCA.colorPrincipal};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Descargar mis documentos</a></p>
<p style="font-size:13px;color:#555;line-height:1.6">El enlace es personal y funciona durante 30 días. Después borramos los documentos.${adjuntados ? ' También van adjuntos a este correo.' : ''}</p>
<h2 style="font-size:16px;margin:24px 0 8px">Próximos pasos</h2>
<ol style="line-height:1.7;padding-left:20px">${pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
<h2 style="font-size:16px;margin:24px 0 8px">Confirmación del pedido</h2>
<p style="font-size:13px;line-height:1.6;color:#444">${esc(producto.nombre)}, ${esc(formatearPrecio(exp.pago.importeCentimos))} IVA incluido, pagado el ${esc(fechaLarga(exp.pago.pagadoEn.slice(0, 10)))}. Las condiciones completas van en el PDF de confirmación adjunto. Pediste que preparáramos los documentos de inmediato: al quedar a tu disposición, el servicio está ejecutado y no cabe desistimiento, sin perjuicio de tus derechos si tienen algún defecto.</p>
<p style="font-size:13px;line-height:1.6;color:#444">¿Ves un error? Responde a este correo y lo corregimos sin coste.</p>
<p style="font-size:11px;color:#888;line-height:1.5;margin-top:24px">${esc(MARCA.nombre)} prepara documentación; no presenta la reclamación ni presta asesoramiento jurídico. Reclamar al operador y a la Oficina es gratuito. ${esc(PRESTADOR.titular)} · NIF ${esc(PRESTADOR.nif)} · ${esc(PRESTADOR.domicilio)}</p>
</div></body></html>`;
}

async function enviarEmailEntrega(exp, archivos, token) {
  const r = clienteResend();
  const enlace = `${urlBase()}/exito.html#t=${token}`;
  if (!r) {
    console.log(`[sin Resend] Email de entrega para ${exp.referencia}: ${enlace}`);
    return false;
  }
  // Se adjuntan los archivos si caben con holgura; si no, basta el enlace.
  let peso = 0;
  const adjuntos = [];
  for (const a of archivos) {
    if (peso + a.bytes.length > 8 * 1024 * 1024) continue;
    peso += a.bytes.length;
    adjuntos.push({ filename: a.nombre, content: a.bytes.toString('base64'), type: 'application/pdf' });
  }
  const completos = adjuntos.length === archivos.length;
  const { error } = await r.emails.send({
    from: REMITENTE,
    to: exp.datos.titular.email,
    reply_to: PRESTADOR.email,
    subject: `Tus documentos están listos · ${exp.referencia}`,
    html: htmlEmail(exp, enlace, completos),
    attachments: completos ? adjuntos : adjuntos.filter(a => !a.filename.startsWith('Expediente') && !a.filename.startsWith('Reclamacion'))
  });
  if (error) throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
  return true;
}

// Genera, guarda y envía los documentos. Se puede llamar varias veces: si ya están, no repite.
export async function entregar(id) {
  if (!(await bloquear(`entrega:${id}`, 110))) return { enCurso: true };
  try {
    const exp = await leerExpediente(id);
    if (!exp || !['pagado', 'error_entrega'].includes(exp.estado)) return { exp };
    exp.entrega = exp.entrega || { intentos: 0 };
    exp.entrega.intentos += 1;
    try {
      const binarios = [];
      for (const doc of exp.documentos) {
        const b = await leerBinario(`doc:${exp.id}:${doc.id}`);
        if (!b) throw new Error(`No se encuentra el archivo ${doc.nombre}`);
        if (resumen(b) !== doc.sha256) throw new Error(`El archivo ${doc.nombre} no coincide con el subido`);
        binarios.push(b);
      }
      const archivos = await generarEntregables(exp, prepararAnexos(exp, binarios));
      for (const a of archivos) await guardarBinario(`ent:${exp.id}:${a.codigo}`, a.bytes, RETENCION.entregables);
      for (const doc of exp.documentos) await prolongarBinario(`doc:${exp.id}:${doc.id}`, RETENCION.entregables);

      const token = generarClave();
      await comando(['SET', `acceso:${resumen(token)}`, exp.id, 'EX', String(RETENCION.entregables)]);
      exp.entrega.archivos = archivos.map(a => ({ codigo: a.codigo, nombre: a.nombre, bytes: a.bytes.length, principal: Boolean(a.principal) }));
      exp.entrega.generadoEn = new Date().toISOString();
      exp.estado = 'entregado';
      delete exp.entrega.ultimoError;
      await guardarExpediente(exp);
      await registrar('entrega', exp.pago.producto);

      try {
        exp.entrega.emailEnviado = await enviarEmailEntrega(exp, archivos, token);
      } catch (e) {
        exp.entrega.emailEnviado = false;
        await enviarAlerta(`Email de entrega no enviado — ${exp.referencia}`, [`Motivo: ${e.message}`, 'Los documentos están generados y el cliente puede descargarlos desde la página de confirmación.']);
      }
      await guardarExpediente(exp);
      if (exp.pago.producto === 'operador') {
        // Recordatorio único a los 35 días; los documentos se habrán borrado, así que se guarda lo mínimo.
        await guardarJSON(`seguimiento:${exp.id}`, {
          email: exp.datos.titular.email, referencia: exp.referencia, operador: nombreOperador(exp.respuestas)
        }, 45 * 86400).catch(() => {});
        await comando(['ZADD', 'seguimientos:v2', String(Math.floor(Date.now() / 1000) + 35 * 86400), exp.id]).catch(() => {});
      }
      return { exp };
    } catch (error) {
      exp.estado = 'error_entrega';
      exp.entrega.ultimoError = error.message.slice(0, 200);
      await guardarExpediente(exp);
      await registrar('error_entrega', exp.pago?.producto);
      if (exp.entrega.intentos === 1 || exp.entrega.intentos % 5 === 0) {
        await enviarAlerta(`Entrega fallida — ${exp.referencia}`, [
          `Motivo: ${error.message}`, `Intentos: ${exp.entrega.intentos}`,
          'Se reintenta con cada aviso de Stripe y cuando el cliente abre la página de confirmación. Si persiste, revisa y devuelve el importe.'
        ]);
      }
      throw error;
    }
  } finally {
    await desbloquear(`entrega:${id}`);
  }
}

export async function expedientePorToken(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ''))) return null;
  const id = await comando(['GET', `acceso:${resumen(token)}`]);
  return id ? leerExpediente(id) : null;
}

// Acceso tras el pago: clave del expediente (misma pestaña) o enlace personal del email.
export async function expedienteDeLaPeticion(req, cuerpo) {
  if (cuerpo.token) return expedientePorToken(cuerpo.token);
  const { id, clave } = credenciales(req, cuerpo);
  return expedienteAutorizado(id, clave);
}

