import Stripe from 'stripe';
import { Resend } from 'resend';
import { seleccionarGuia } from './guia.js';
import { categoriaVisible, textoAsunto, lineasDestinatario, lineasRemitente } from './_escrito.js';
import { obtenerAnexos, unirAnexos, borrarAnexos, prolongarAnexos } from './_anexos.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: { bodyParser: false }
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function obtenerDeRedis(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const resp = await fetch(`${url}/get/${key}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data.result;
}

const DOS_ANOS_EN_SEGUNDOS = 63072000;

async function guardarExpediente(refExpediente, datosExpediente) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const valor = JSON.stringify(datosExpediente);
  const resp = await fetch(`${url}/set/expediente:${refExpediente}/${encodeURIComponent(valor)}?EX=${DOS_ANOS_EN_SEGUNDOS}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(`Redis SET falló: ${data.error || resp.status}`);
}

async function programarSeguimiento(refExpediente) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const fechaLimite = Math.floor(Date.now() / 1000) + 21 * 86400;
  const resp = await fetch(`${url}/zadd/seguimientos:pendientes/${fechaLimite}/${refExpediente}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(`Redis ZADD falló: ${data.error || resp.status}`);
}

const TRES_DIAS_EN_SEGUNDOS = 259200;
const TREINTA_DIAS_EN_SEGUNDOS = 2592000;
const EMAIL_ALERTAS = process.env.ALERTAS_EMAIL || 'hola@reclamoia.es';

async function redis(...partes) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const resp = await fetch(`${url}/${partes.map(p => encodeURIComponent(p)).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(`Redis ${partes[0]} falló: ${data.error || resp.status}`);
  return data.result;
}

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function convertirAPdf(html) {
  let ultimoError;
  for (const pausa of [0, 1500, 4000]) {
    if (pausa) await esperar(pausa);
    try {
      const resp = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: html,
          format: 'A4',
          margin: { top: '22mm', bottom: '22mm', left: '25mm', right: '20mm' }
        })
      });
      if (resp.ok) return Buffer.from(await resp.arrayBuffer()).toString('base64');
      ultimoError = new Error(`PDFShift respondió ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    } catch (e) {
      ultimoError = e;
    }
    console.error('Intento de PDF fallido:', ultimoError.message);
  }
  throw ultimoError;
}

async function enviarAlerta(asunto, lineas) {
  try {
    const { error } = await resend.emails.send({
      from: 'ReclamoIA Alertas <hola@reclamoia.es>',
      to: EMAIL_ALERTAS,
      subject: `⚠️ ${asunto}`,
      text: lineas.join('\n')
    });
    if (error) console.error('No se pudo enviar la alerta:', error);
  } catch (e) {
    console.error('No se pudo enviar la alerta:', e);
  }
}

function htmlAvisoCliente(titulo, parrafos) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f0f2f7;margin:0;padding:0;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#0D1B2A;padding:28px 32px;">
    <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA" style="height:36px;width:auto;">
  </div>
  <div style="padding:32px;">
    <h2 style="font-size:18px;color:#0D1B2A;margin-bottom:12px;">${escaparHTML(titulo)}</h2>
    ${parrafos.map(p => `<p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:14px;">${escaparHTML(p)}</p>`).join('\n    ')}
    <p style="font-size:13px;color:#0D1B2A;margin-top:24px;">— El equipo de ReclamoIA</p>
  </div>
</div>
</body>
</html>`;
}

async function enviarAvisoCliente(email, asunto, titulo, parrafos) {
  try {
    const { error } = await resend.emails.send({
      from: 'ReclamoIA <hola@reclamoia.es>',
      to: email,
      subject: asunto,
      html: htmlAvisoCliente(titulo, parrafos)
    });
    if (error) console.error('No se pudo avisar al cliente:', error);
  } catch (e) {
    console.error('No se pudo avisar al cliente:', e);
  }
}

function escaparHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generarRefExpediente() {
  const fecha = new Date();
  const codigo = fecha.getFullYear().toString() +
    (fecha.getMonth() + 1).toString().padStart(2, '0') +
    fecha.getDate().toString().padStart(2, '0') +
    '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-${codigo}`;
}

const MARCA_AGUA_CSS = `
  .marca-agua { position:fixed; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0; }
  .marca-agua img { width:88%; max-width:720px; opacity:0.045; }`;

function bloqueDestinatario(datos) {
  return lineasDestinatario(datos)
    .map((linea, i) => i < 2 ? `<p><strong>${escaparHTML(linea)}</strong></p>` : `<p>${escaparHTML(linea)}</p>`)
    .join('\n  ');
}

function bloqueFirma(datos) {
  const { nombre, documento, tipo, firmanteNombre, firmanteCargo, representacion, repNombre } = datos;
  if (tipo === 'empresa' && firmanteNombre) {
    return [
      `<p><strong>${escaparHTML(firmanteNombre)}</strong></p>`,
      firmanteCargo ? `<p>${escaparHTML(firmanteCargo)}</p>` : '',
      `<p>En nombre y representación de ${escaparHTML(nombre)}</p>`,
      documento ? `<p>CIF: ${escaparHTML(documento)}</p>` : ''
    ].filter(Boolean).join('\n  ');
  }
  return [
    `<p><strong>${escaparHTML(nombre)}</strong></p>`,
    documento ? `<p>${escaparHTML(documento)}</p>` : '',
    representacion === 'representacion' && repNombre ? `<p>En representación de ${escaparHTML(repNombre)}</p>` : ''
  ].filter(Boolean).join('\n  ');
}

function recortarTrasDespedida(carta) {
  const lineas = carta.split('\n');
  for (let i = lineas.length - 1; i >= 0; i--) {
    if (/^\s*Atentamente/i.test(lineas[i].replace(/\*\*/g, ''))) {
      return lineas.slice(0, i + 1).join('\n');
    }
  }
  return carta;
}

function generarHTMLEscrito(carta, datos, refExpediente, nombresAnexos = []) {
  const { categoriaEmpresa, tipoDestinatario } = datos;

  const bloqueRemitente = lineasRemitente(datos)
    .map((linea, i) => i === 0 ? `<p><strong>${escaparHTML(linea)}</strong></p>` : `<p>${escaparHTML(linea)}</p>`)
    .join('\n  ');

  const cuerpoHTML = recortarTrasDespedida(carta).split('\n').map(linea => {
    const l = escaparHTML(linea.trimEnd()).replace(/\*\*/g, '');
    if (!l.trim()) return '<p style="margin:6px 0">&nbsp;</p>';
    const match = linea.trimEnd().replace(/\*\*/g, '').match(/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO)(\.-)\s+(.+)$/);
    if (match) {
      return `<p style="margin:10px 0 4px;"><strong>${escaparHTML(match[1] + match[2])}</strong> ${escaparHTML(match[3])}</p>`;
    }
    if (/^(SOLICITO:|EXPONGO:)/.test(l)) return `<p style="margin:14px 0 6px; font-weight:bold;">${l}</p>`;
    if (/^Al amparo de/.test(l)) return `<p style="margin:6px 0; font-style:italic; color:#444;">${l}</p>`;
    if (/^[—–]/.test(l)) return `<p style="margin:4px 0 4px 20px;">${l}</p>`;
    if (/^(Muy señores|Atentamente)/.test(l)) return `<p style="margin:14px 0 4px;">${l}</p>`;
    return `<p style="margin:5px 0; text-align:justify;">${l}</p>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; font-size:11pt; color:#1a1a1a; background:#fff; padding:0 50px 60px; max-width:800px; margin:0 auto; position:relative; }
  ${MARCA_AGUA_CSS}
  .cabecera-formal { position:relative; z-index:1; border-top:4px solid #0D1B2A; padding-top:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; }
  .cabecera-formal .marca { display:flex; align-items:center; gap:8px; }
  .cabecera-formal .marca img { height:22px; width:auto; display:block; }
  .cabecera-formal .marca-texto { font-family:Arial,sans-serif; font-size:9pt; font-weight:700; color:#0D1B2A; letter-spacing:1px; }
  .cabecera-formal .marca-texto span { color:#C9A84C; }
  .cabecera-formal .ref { font-family:Arial,sans-serif; font-size:8pt; color:#888; text-align:right; line-height:1.6; }
  .contenido { position:relative; z-index:1; }
  .remitente { margin-bottom:20px; font-size:10.5pt; line-height:1.75; }
  .remitente p { margin:1px 0; }
  hr { border:none; border-top:0.5px solid #ccc; margin:16px 0; }
  .destinatario { margin-bottom:16px; font-size:10.5pt; line-height:1.75; }
  .destinatario p { margin:1px 0; }
  .asunto { margin-bottom:16px; font-size:10.5pt; line-height:1.6; padding:8px 12px; background:#fafaf8; border-left:2px solid #C9A84C; }
  .fecha-lugar { margin-bottom:20px; font-size:10.5pt; }
  .cuerpo { font-size:11pt; line-height:1.8; margin-bottom:20px; text-align:justify; }
  .firma { margin-top:32px; font-size:10.5pt; line-height:1.7; }
  .firma-linea { width:180px; border-top:1px solid #333; margin:30px 0 8px; }
  .documentos-anexos { margin-top:28px; padding-top:12px; border-top:0.5px solid #ccc; font-size:10.5pt; line-height:1.7; }
  .documentos-anexos p { margin:1px 0; }
  .pie { position:relative; z-index:1; margin-top:50px; padding-top:8px; border-top:0.5px solid #ddd; font-family:Arial,sans-serif; font-size:7pt; color:#bbb; text-align:center; line-height:1.6; }
  .pie-verificacion { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:10px; }
  .qr-verificacion { width:52px; height:52px; display:block; }
  .pie-verificacion-texto { font-family:Arial,sans-serif; font-size:7.5pt; color:#999; text-align:left; line-height:1.5; }
  .pie-verificacion-texto strong { color:#0D1B2A; }
  @media print { body { padding:0 50px 60px; } @page { margin:22mm 20mm 22mm 25mm; size:A4; } }
</style>
</head>
<body>
<div class="marca-agua"><img src="https://reclamoia.es/marca-agua.png" alt=""></div>
<div class="contenido">
<div class="cabecera-formal">
  <div class="marca">
    <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA">
    <span class="marca-texto">Reclamo<span>IA</span> · ${categoriaEmpresa === 'Deudas, préstamos e impagos' ? 'Requerimiento de pago' : 'Escrito de reclamación'}</span>
  </div>
  <div class="ref">Ref. expediente: ${refExpediente}<br>Categoría: ${escaparHTML(categoriaVisible(categoriaEmpresa))}</div>
</div>
<div class="remitente">
  ${bloqueRemitente}
</div>
<hr>
<div class="destinatario">
  ${bloqueDestinatario(datos)}
</div>
<div class="asunto">
  <strong>Asunto:</strong> ${escaparHTML(textoAsunto(categoriaEmpresa, tipoDestinatario))}
</div>
<hr>
<div class="cuerpo">${cuerpoHTML}</div>
<div class="firma">
  <div class="firma-linea"></div>
  ${bloqueFirma(datos)}
</div>
${nombresAnexos.length ? `<div class="documentos-anexos">
  <p><strong>DOCUMENTOS QUE SE ACOMPAÑAN</strong></p>
  ${nombresAnexos.map((nombre, i) => `<p>Documento nº ${i + 1}: ${escaparHTML(nombre)}</p>`).join('\n  ')}
</div>` : ''}
</div>
<div class="pie">
  <div class="pie-verificacion">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(`https://reclamoia.es/verificar.html?ref=${refExpediente}`)}" alt="Código QR de verificación" class="qr-verificacion">
    <div class="pie-verificacion-texto">Verifica la autenticidad de este documento en <strong>reclamoia.es/verificar</strong><br>Ref. expediente: ${refExpediente}</div>
  </div>
  <p>ReclamoIA · reclamoia.es | Este escrito tiene carácter de reclamación extrajudicial. ReclamoIA no presta servicios de asesoría jurídica.</p>
</div>
</body>
</html>`;
}

function generarHTMLGuia(guiaData, datos, refExpediente) {
  const { nombre, empresa, categoriaEmpresa, tipoDestinatario } = datos;
  const { guia, fecha } = guiaData;
  const etiquetaReclamado = tipoDestinatario === 'persona' ? 'Persona reclamada' : 'Parte reclamada';
  const etiquetaOrganismo = guia.etiquetaOrganismo || 'Organismo regulador';
  const categoria = categoriaVisible(categoriaEmpresa);

  const pasosHTML = guia.pasos.map(paso => `
    <div style="margin-bottom:24px; padding:20px; background:#fafaf8; border-left:3px solid #C9A84C; border-radius:0 8px 8px 0;">
      <h3 style="font-family:Arial,sans-serif; font-size:11pt; font-weight:700; color:#0D1B2A; margin:0 0 12px;">${escaparHTML(paso.titulo)}</h3>
      ${paso.contenido.map(linea => `<p style="font-family:'Times New Roman',Times,serif; font-size:10.5pt; color:#333; line-height:1.7; margin:4px 0;">${linea.startsWith('—') ? `<span style="margin-left:16px; display:block;">${escaparHTML(linea)}</span>` : escaparHTML(linea)}</p>`).join('')}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; font-size:11pt; color:#1a1a1a; background:#fff; padding:0 50px 60px; max-width:800px; margin:0 auto; position:relative; }
  ${MARCA_AGUA_CSS}
  .cabecera-formal { position:relative; z-index:1; border-top:4px solid #0D1B2A; padding-top:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; }
  .cabecera-formal .marca { display:flex; align-items:center; gap:8px; }
  .cabecera-formal .marca img { height:22px; width:auto; display:block; }
  .cabecera-formal .marca-texto { font-family:Arial,sans-serif; font-size:9pt; font-weight:700; color:#0D1B2A; letter-spacing:1px; }
  .cabecera-formal .marca-texto span { color:#C9A84C; }
  .cabecera-formal .ref { font-family:Arial,sans-serif; font-size:8pt; color:#888; text-align:right; line-height:1.6; }
  .contenido { position:relative; z-index:1; }
  .pie-verificacion { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:10px; }
  .qr-verificacion { width:52px; height:52px; display:block; }
  .pie-verificacion-texto { font-family:Arial,sans-serif; font-size:7.5pt; color:#999; text-align:left; line-height:1.5; }
  .pie-verificacion-texto strong { color:#0D1B2A; }
  @media print { body { padding:0 50px 60px; } @page { margin:22mm 20mm 22mm 25mm; size:A4; } }
</style>
</head>
<body>
<div class="marca-agua"><img src="https://reclamoia.es/marca-agua.png" alt=""></div>
<div class="contenido">

<div class="cabecera-formal" style="border-bottom:2px solid #0D1B2A; padding-bottom:16px; margin-bottom:24px;">
  <div class="marca">
    <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA">
    <span class="marca-texto">Reclamo<span>IA</span> · Guía de presentación</span>
  </div>
  <div class="ref">Ref. expediente: ${refExpediente}<br>Categoría: ${escaparHTML(categoria)}</div>
</div>

<div style="margin-bottom:20px;">
  <h1 style="font-family:Arial,sans-serif; font-size:18pt; font-weight:700; color:#0D1B2A; margin:0 0 4px;">GUÍA DE PRESENTACIÓN</h1>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#C9A84C; font-weight:600; margin:0;">Escrito dirigido a ${escaparHTML(empresa)} — ${escaparHTML(categoria)}</p>
</div>

<div style="background:#f0f4ff; border:1px solid #b0c4f0; border-radius:8px; padding:14px 16px; margin-bottom:24px;">
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0 0 4px;"><strong>Preparado para:</strong> ${escaparHTML(nombre)}</p>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0 0 4px;"><strong>${etiquetaReclamado}:</strong> ${escaparHTML(empresa)}</p>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0 0 4px;"><strong>Categoría:</strong> ${escaparHTML(categoria)}</p>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0;"><strong>${etiquetaOrganismo}:</strong> ${escaparHTML(guia.organismo)}</p>
</div>

<div style="background:#fdf9f0; border:1px solid #C9A84C; border-radius:8px; padding:14px 16px; margin-bottom:24px;">
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#8a6a1a; font-weight:700; margin:0 0 6px;">⚠️ LEE ESTO ANTES DE EMPEZAR</p>
  <p style="font-family:'Times New Roman',Times,serif; font-size:10.5pt; color:#555; line-height:1.6; margin:0;">Esta guía te explica exactamente qué hacer después de enviar tu escrito de reclamación a ${escaparHTML(empresa)}. Sigue los pasos en orden. No saltes al siguiente paso sin haber completado el anterior.</p>
</div>

${pasosHTML}

${guia.enlace ? `
<div style="margin-top:24px; padding:16px; background:#f0f4ff; border-radius:8px; border:1px solid #b0c4f0;">
  <p style="font-family:Arial,sans-serif; font-size:10pt; font-weight:700; color:#0D1B2A; margin:0 0 6px;">🔗 Enlace oficial</p>
  <p style="font-family:'Times New Roman',Times,serif; font-size:10.5pt; color:#1a3a6a; margin:0;">${escaparHTML(guia.organismo)}: <strong>${escaparHTML(guia.enlace)}</strong></p>
  ${guia.telefono ? `<p style="font-family:'Times New Roman',Times,serif; font-size:10.5pt; color:#1a3a6a; margin:4px 0 0;">Teléfono: <strong>${escaparHTML(guia.telefono)}</strong></p>` : ''}
</div>
` : ''}

<div style="margin-top:40px; padding-top:12px; border-top:0.5px solid #ddd;">
  <div class="pie-verificacion">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(`https://reclamoia.es/verificar.html?ref=${refExpediente}`)}" alt="Código QR de verificación" class="qr-verificacion">
    <div class="pie-verificacion-texto">Verifica la autenticidad de este documento en <strong>reclamoia.es/verificar</strong><br>Ref. expediente: ${refExpediente}</div>
  </div>
  <p style="font-family:Arial,sans-serif; font-size:7pt; color:#bbb; text-align:center; line-height:1.6;">ReclamoIA · reclamoia.es | Esta guía es orientativa. ReclamoIA no presta servicios de asesoría jurídica.</p>
  <p style="font-family:Arial,sans-serif; font-size:7pt; color:#bbb; text-align:center; line-height:1.6;">Los plazos y procedimientos están verificados a fecha ${escaparHTML(fecha)}. Se recomienda verificar posibles actualizaciones en las webs oficiales indicadas.</p>
</div>

</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const empresa = session.metadata?.empresa || 'la empresa';
    const opcion = session.metadata?.opcion || 'basica';
    const tempId = session.metadata?.tempId || '';
    const idSesion = session.id;

    try {
      if (await redis('get', `entregado:${idSesion}`)) {
        return res.status(200).json({ received: true });
      }
      if (await redis('set', `procesando:${idSesion}`, '1', 'NX', 'EX', '120') !== 'OK') {
        return res.status(409).json({ error: 'Pedido en proceso' });
      }
    } catch (redisError) {
      console.error('Base de datos no disponible:', redisError);
      await enviarAlerta('La base de datos no responde', [
        'Ha llegado un pago y no se ha podido acceder a la base de datos (Upstash Redis).',
        `Motivo: ${redisError.message}`,
        `Cliente: ${email}`,
        `Sesión de Stripe: ${idSesion}`,
        'Stripe reintentará la entrega automáticamente. Revisa en Vercel > Storage que la base de datos esté activa.'
      ]);
      return res.status(500).json({ error: 'Almacenamiento no disponible' });
    }

    let carta = '';
    let d = {};
    if (tempId) {
      try {
        const raw = await obtenerDeRedis(tempId);
        if (raw) {
          const parsed = JSON.parse(raw);
          carta = parsed.carta || '';
          d = parsed.datosUsuario || {};
        }
      } catch (kvError) {
        console.error('Error recuperando de Redis:', kvError);
      }
    }

    if (!carta) {
      console.error('Pago recibido sin datos del escrito:', idSesion);
      await enviarAlerta(`Pago cobrado sin escrito — ${empresa}`, [
        'Se ha cobrado un pedido pero sus datos ya no estaban guardados, así que no se ha podido generar el escrito.',
        `Cliente: ${email}`,
        `Dirigido a: ${empresa}`,
        `Opción: ${opcion}`,
        `Sesión de Stripe: ${idSesion}`,
        'Al cliente se le ha avisado de que le contactaremos. Escríbele para que vuelva a generarlo sin coste o devuélvele el pago desde Stripe.'
      ]);
      await enviarAvisoCliente(email, 'Hemos recibido tu pago — ReclamoIA', 'Hemos recibido tu pago', [
        'Tu pago se ha recibido correctamente, pero ha surgido una incidencia técnica al preparar tu escrito.',
        'Nos pondremos en contacto contigo lo antes posible para resolverlo sin ningún coste adicional o, si lo prefieres, devolverte el importe.',
        'Si tienes cualquier duda, responde directamente a este email.'
      ]);
      await redis('set', `entregado:${idSesion}`, 'incidencia', 'EX', String(TREINTA_DIAS_EN_SEGUNDOS)).catch(() => {});
      await redis('del', `procesando:${idSesion}`).catch(() => {});
      return res.status(200).json({ received: true });
    }

    const fecha = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const nombre = d.nombre || '';
    const categoriaEmpresa = d.categoriaEmpresa || '';
    const tipoDestinatario = d.tipoDestinatario === 'persona' ? 'persona' : 'empresa';
    const datos = {
      nombre,
      documento: d.documento || '',
      direccion: d.direccion || '',
      cp: d.cp || '',
      ciudad: d.ciudad || '',
      telefono: d.telefono || '',
      email,
      empresa,
      categoriaEmpresa,
      tipo: d.tipo || 'particular',
      tipoDestinatario,
      domicilioDestinatario: d.domicilioDestinatario || '',
      representacion: d.representacion || 'propio',
      repNombre: d.repNombre || '',
      firmanteNombre: d.firmanteNombre || '',
      firmanteCargo: d.firmanteCargo || ''
    };

    let refExpediente = await redis('get', `ref:${idSesion}`).catch(() => null);
    if (!refExpediente) {
      refExpediente = generarRefExpediente();
      await redis('set', `ref:${idSesion}`, refExpediente, 'EX', String(TRES_DIAS_EN_SEGUNDOS)).catch(() => {});
    }

    let anexos = [];
    let anexosPerdidos = false;
    try {
      anexos = await obtenerAnexos(tempId);
    } catch (anexosError) {
      anexosPerdidos = true;
      console.error('No se pudieron recuperar los documentos anexos:', anexosError);
      await enviarAlerta(`Anexos no recuperados — ${refExpediente}`, [
        'El escrito se entregará sin los documentos que adjuntó el cliente, porque no se han podido recuperar.',
        `Motivo: ${anexosError.message}`,
        `Cliente: ${email}`,
        'Al cliente se le indica en el email que responda para recibirlos.'
      ]);
    }

    try {
      let pdfEscritoBase64 = await convertirAPdf(generarHTMLEscrito(carta, datos, refExpediente, anexos.map(a => a.nombre)));

      let anexosSueltos = [];
      if (anexos.length) {
        try {
          const union = await unirAnexos(pdfEscritoBase64, anexos, refExpediente);
          pdfEscritoBase64 = union.pdfBase64;
          anexosSueltos = union.noUnidos;
        } catch (unionError) {
          console.error('No se pudieron unir los anexos al escrito:', unionError);
          anexosSueltos = anexos.map((anexo, i) => ({ ...anexo, numero: i + 1 }));
        }
      }

      let pdfGuiaBase64 = null;
      if (opcion === 'completa') {
        const guiaData = { guia: seleccionarGuia(categoriaEmpresa || 'Otro', tipoDestinatario), fecha };
        pdfGuiaBase64 = await convertirAPdf(generarHTMLGuia(guiaData, datos, refExpediente));
      }

      const nombreArchivo = empresa.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
      const adjuntos = [{
        filename: `Escrito-Reclamacion-${nombreArchivo}.pdf`,
        content: pdfEscritoBase64,
        type: 'application/pdf'
      }];
      if (pdfGuiaBase64) {
        adjuntos.push({
          filename: `Guia-Presentacion-${nombreArchivo}.pdf`,
          content: pdfGuiaBase64,
          type: 'application/pdf'
        });
      }
      for (const suelto of anexosSueltos) {
        adjuntos.push({
          filename: `Documento-${suelto.numero}-${suelto.nombre}`,
          content: suelto.data,
          type: suelto.mediaType
        });
      }

      const anexosIncluidos = anexos.length - anexosSueltos.length;
      const avisoAnexos = anexosPerdidos
        ? 'No hemos podido incorporar al escrito los documentos que adjuntaste. Responde a este email y te lo enviamos con ellos.'
        : anexosSueltos.length
          ? 'Algunos de los documentos que aportaste no se han podido incorporar dentro del PDF (por ejemplo, porque están protegidos con contraseña), así que también te los enviamos adjuntos a este email. Preséntalos junto con el escrito.'
          : '';

      const nombreSaludo = (datos.tipo === 'empresa' && datos.firmanteNombre ? datos.firmanteNombre : nombre).split(' ')[0] || '';
      const porBurofax = tipoDestinatario === 'persona' || categoriaEmpresa === 'Deudas, préstamos e impagos';
      const pasoEnvio = porBurofax
        ? `2. Envíalo a ${escaparHTML(empresa)} por burofax con acuse de recibo y certificación de contenido${opcion === 'completa' ? ' (la guía adjunta te explica cómo)' : ''}`
        : `2. Envíalo a ${escaparHTML(empresa)} siguiendo las instrucciones${opcion === 'completa' ? ' de la guía adjunta' : ''}`;

      const htmlEmail = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f0f2f7;margin:0;padding:0;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#0D1B2A;padding:28px 32px;">
    <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA" style="height:36px;width:auto;">
  </div>
  <div style="padding:32px;">
    <h2 style="font-size:18px;color:#0D1B2A;margin-bottom:12px;">Tu ${opcion === 'completa' ? 'escrito y guía están listos' : 'escrito está listo'}, ${escaparHTML(nombreSaludo)}</h2>
    <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:16px;">
      Hemos generado tu escrito formal dirigido a <strong>${escaparHTML(empresa)}</strong>, con la legislación aplicable verificada.
      ${opcion === 'completa' ? 'También encontrarás adjunta la guía paso a paso para presentar tu reclamación correctamente.' : ''}
    </p>
    <div style="background:#fdf9f0;border:1px solid #C9A84C;border-radius:8px;padding:12px 16px;margin:20px 0;">
      <p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Fecha:</strong> ${escaparHTML(fecha)}</p>
      <p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Destinatario:</strong> ${escaparHTML(empresa)}</p>
      <p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Referencia del expediente:</strong> ${escaparHTML(refExpediente)}</p>
      ${anexosIncluidos > 0 ? `<p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Documentos anexos:</strong> ${anexosIncluidos}, incluidos al final del escrito</p>` : ''}
      ${opcion === 'completa' ? `<p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Guía de presentación:</strong> incluida en PDF adjunto</p>` : ''}
    </div>
    ${avisoAnexos ? `<p style="font-size:13px;color:#8a4a12;line-height:1.6;background:#fff6e8;border-radius:8px;padding:12px 14px;">${escaparHTML(avisoAnexos)}</p>` : ''}
    <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="font-size:13px;color:#0D1B2A;font-weight:bold;margin-bottom:8px;">¿Qué hago ahora?</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">1. Abre el PDF del escrito adjunto y revisa que todos los datos son correctos</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">${pasoEnvio}</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">3. Guarda siempre el justificante de envío</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">4. Si no responden en 15 días hábiles, sigue los pasos indicados${opcion === 'completa' ? ' en la guía' : ''}</p>
    </div>
    <p style="font-size:13px;color:#555;line-height:1.6;">¿Ves algún dato incorrecto en el escrito? Responde a este email y lo revisamos.</p>
    <p style="font-size:11px;color:#999;line-height:1.6;margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
      ReclamoIA es una herramienta de asistencia en la redacción de escritos. No presta servicios de asesoría jurídica.
    </p>
  </div>
  <div style="background:#f8f8f8;padding:16px 32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:2px 0;">ReclamoIA · reclamoia.es</p>
    <p style="font-size:11px;color:#aaa;margin:2px 0;">© 2026 ReclamoIA. Todos los derechos reservados.</p>
  </div>
</div>
</body>
</html>`;

      const { error: errorEnvio } = await resend.emails.send({
        from: 'ReclamoIA <hola@reclamoia.es>',
        to: email,
        subject: opcion === 'completa'
          ? `Tu escrito + guía de presentación — ${empresa}`
          : `Tu escrito de reclamación — ${empresa}`,
        html: htmlEmail,
        attachments: adjuntos
      });
      if (errorEnvio) throw new Error(`Resend: ${errorEnvio.message || JSON.stringify(errorEnvio)}`);

      console.log('Escrito entregado:', refExpediente, '| Opción:', opcion);

    } catch (entregaError) {
      console.error('Fallo en la entrega:', entregaError);
      await redis('expire', tempId, String(TRES_DIAS_EN_SEGUNDOS)).catch(() => {});
      await prolongarAnexos(tempId, TRES_DIAS_EN_SEGUNDOS).catch(() => {});
      await redis('del', `procesando:${idSesion}`).catch(() => {});
      await enviarAlerta(`Entrega fallida — ${empresa}`, [
        'Un cliente ha pagado y su escrito no se ha podido entregar todavía.',
        `Motivo: ${entregaError.message}`,
        `Cliente: ${email}`,
        `Opción: ${opcion}`,
        `Referencia: ${refExpediente}`,
        `Sesión de Stripe: ${idSesion}`,
        'Stripe reintentará la entrega automáticamente durante los próximos 3 días. Si recibes esta alerta varias veces para el mismo pedido, avisa a Claude para revisarlo.'
      ]);
      const primerAviso = await redis('set', `avisoretraso:${idSesion}`, '1', 'NX', 'EX', String(TRES_DIAS_EN_SEGUNDOS)).catch(() => null);
      if (primerAviso === 'OK') {
        await enviarAvisoCliente(email, 'Tu escrito está en preparación — ReclamoIA', 'Tu escrito está en preparación', [
          'Hemos recibido tu pago correctamente. Tu escrito está tardando un poco más de lo habitual por una incidencia técnica.',
          'No tienes que hacer nada: lo recibirás en este mismo correo en cuanto esté listo.',
          'Si tienes cualquier duda, responde directamente a este email.'
        ]);
      }
      return res.status(500).json({ error: 'Entrega fallida, se reintentará' });
    }

    await redis('set', `entregado:${idSesion}`, refExpediente, 'EX', String(TREINTA_DIAS_EN_SEGUNDOS))
      .catch(e => console.error('No se pudo marcar como entregado:', e));
    await borrarAnexos(tempId).catch(e => console.error('No se pudieron borrar los anexos:', e));
    await redis('del', tempId).catch(() => {});
    await redis('del', `procesando:${idSesion}`).catch(() => {});

    try {
      await guardarExpediente(refExpediente, {
        ref: refExpediente,
        fecha: new Date().toISOString(),
        categoria: categoriaEmpresa || 'Otro',
        tipoDestinatario,
        email,
        nombre: (datos.tipo === 'empresa' ? datos.firmanteNombre : nombre).split(' ')[0] || '',
        empresa,
        opcion,
        seguimientoEnviado: false
      });
      await programarSeguimiento(refExpediente);
    } catch (expedienteError) {
      console.error('Error guardando expediente persistente:', expedienteError);
      await enviarAlerta(`Expediente sin guardar — ${refExpediente}`, [
        'El escrito se entregó bien, pero no se guardó su expediente: no tendrá verificación ni email de seguimiento.',
        `Motivo: ${expedienteError.message}`,
        `Referencia: ${refExpediente}`
      ]);
    }
  }

  return res.status(200).json({ received: true });
}
