import Stripe from 'stripe';
import { Resend } from 'resend';

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

function escaparHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generarHTMLEscrito(carta, datos) {
  const { nombre, documento, direccion, cp, ciudad, telefono, email, empresa } = datos;

  const cuerpoHTML = carta.split('\n').map(linea => {
    const l = escaparHTML(linea.trimEnd()).replace(/\*\*/g, '');
    if (!l.trim()) return '<p style="margin:5px 0">&nbsp;</p>';

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
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; font-size:11pt; color:#1a1a1a; background:#fff; padding:40px 50px 60px; max-width:800px; margin:0 auto; }
  .remitente { margin-bottom:20px; font-size:10.5pt; line-height:1.75; }
  .remitente p { margin:1px 0; }
  hr { border:none; border-top:0.5px solid #ccc; margin:16px 0; }
  .destinatario { margin-bottom:16px; font-size:10.5pt; line-height:1.75; }
  .destinatario p { margin:1px 0; }
  .fecha-lugar { margin-bottom:20px; font-size:10.5pt; }
  .cuerpo { font-size:11pt; line-height:1.8; margin-bottom:20px; }
  .firma { margin-top:32px; font-size:10.5pt; line-height:1.7; }
  .firma-linea { width:180px; border-top:1px solid #333; margin:30px 0 8px; }
  .pie { margin-top:50px; padding-top:8px; border-top:0.5px solid #ddd; font-family:Arial,sans-serif; font-size:7pt; color:#bbb; text-align:center; line-height:1.6; }
  @media print { body { padding:0; } @page { margin:22mm 20mm 22mm 25mm; size:A4; } }
</style>
</head>
<body>
<div class="remitente">
  <p><strong>${escaparHTML(nombre)}</strong></p>
  <p>${escaparHTML(documento)}</p>
  <p>${escaparHTML(direccion)}, ${escaparHTML(cp)} ${escaparHTML(ciudad)}</p>
  <p>Tel.: ${escaparHTML(telefono)}</p>
  <p>${escaparHTML(email)}</p>
</div>
<hr>
<div class="destinatario">
  <p><strong>A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE</strong></p>
  <p><strong>${escaparHTML(empresa.toUpperCase())}</strong></p>
</div>
<hr>
<div class="cuerpo">${cuerpoHTML}</div>
<div class="firma">
  <div class="firma-linea"></div>
  <p><strong>${escaparHTML(nombre)}</strong></p>
  <p>${escaparHTML(documento)}</p>
</div>
<div class="pie">
  <p>ReclamaYa · reclamaya.es | Este escrito tiene carácter de reclamación extrajudicial. ReclamaYa no presta servicios de asesoría jurídica.</p>
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
    const tempId = session.metadata?.tempId || '';

    let carta = '';
    let nombre = '';
    let documento = '';
    let direccion = '';
    let cp = '';
    let ciudad = '';
    let telefono = '';

    if (tempId) {
      try {
        const raw = await obtenerDeRedis(tempId);
        if (raw) {
          const parsed = JSON.parse(raw);
          carta = parsed.carta || '';
          const d = parsed.datosUsuario || {};
          nombre = d.nombre || '';
          documento = d.documento || '';
          direccion = d.direccion || '';
          cp = d.cp || '';
          ciudad = d.ciudad || '';
          telefono = d.telefono || '';
        }
      } catch (kvError) {
        console.error('Error recuperando de Redis:', kvError);
      }
    }

    const fecha = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    try {
      let pdfBase64 = null;
      const nombreArchivo = `Escrito-Reclamacion-${empresa.replace(/\s+/g, '-')}.pdf`;

      if (carta && nombre) {
        const datos = { nombre, documento, direccion, cp, ciudad, telefono, email, empresa };
        const htmlEscrito = generarHTMLEscrito(carta, datos);

        const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString('base64')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source: htmlEscrito,
            format: 'A4',
            margin: { top: '22mm', bottom: '22mm', left: '25mm', right: '20mm' }
          })
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
        } else {
          console.error('PDFShift error:', await pdfResponse.text());
        }
      }

      const htmlEmail = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f0f2f7;margin:0;padding:0;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a1a2e;padding:28px 32px;">
    <span style="font-size:22px;font-weight:900;color:#fff;">Reclama<span style="color:#5DCAA5;">Ya</span></span>
  </div>
  <div style="padding:32px;">
    <h2 style="font-size:18px;color:#1a1a2e;margin-bottom:12px;">Tu escrito está listo${nombre ? ', ' + nombre.split(' ')[0] : ''}</h2>
    <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:16px;">
      Hemos generado tu escrito de reclamación formal contra <strong>${empresa}</strong>. Lo encontrarás adjunto a este email en formato PDF.
    </p>
    <div style="background:#f6faf8;border:1px solid #c3ddd0;border-radius:8px;padding:12px 16px;margin:20px 0;">
      <p style="font-size:13px;color:#2d6a4f;margin:3px 0;">✓ <strong>Fecha:</strong> ${fecha}</p>
      <p style="font-size:13px;color:#2d6a4f;margin:3px 0;">✓ <strong>Destinatario:</strong> ${empresa}</p>
      <p style="font-size:13px;color:#2d6a4f;margin:3px 0;">✓ <strong>Legislación verificada:</strong> BOE · EUR-Lex</p>
    </div>
    <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="font-size:13px;color:#1a1a2e;font-weight:bold;margin-bottom:8px;">¿Qué hago ahora?</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">1. Abre el PDF adjunto</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">2. Envíalo a ${empresa} por email con acuse de recibo o correo certificado</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">3. Guarda el justificante de envío</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">4. Si no responden en 15 días hábiles, acude al organismo regulador</p>
    </div>
    <p style="font-size:11px;color:#999;line-height:1.6;margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
      ReclamaYa es una herramienta de asistencia en la redacción de escritos. No presta servicios de asesoría jurídica.
    </p>
  </div>
  <div style="background:#f8f8f8;padding:16px 32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:2px 0;">ReclamaYa · reclamaya.es</p>
  </div>
</div>
</body>
</html>`;

      const emailPayload = {
        from: 'ReclamaYa <onboarding@resend.dev>',
        to: email,
        subject: `Tu escrito de reclamación contra ${empresa}`,
        html: htmlEmail
      };

      if (pdfBase64) {
        emailPayload.attachments = [{
          filename: nombreArchivo,
          content: pdfBase64,
          type: 'application/pdf'
        }];
      }

      await resend.emails.send(emailPayload);
      console.log('Email enviado correctamente a:', email);

    } catch (emailError) {
      console.error('Error enviando email:', emailError);
    }
  }

  return res.status(200).json({ received: true });
}
