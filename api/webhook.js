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

function generarRefExpediente() {
  const fecha = new Date();
  const codigo = fecha.getFullYear().toString() +
    (fecha.getMonth() + 1).toString().padStart(2, '0') +
    fecha.getDate().toString().padStart(2, '0') +
    '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RC-${codigo}`;
}

function generarHTMLEscrito(carta, datos) {
  const { nombre, documento, direccion, cp, ciudad, telefono, email, empresa, categoriaEmpresa } = datos;
  const refExpediente = generarRefExpediente();

  const lineasRemitente = [`<p><strong>${escaparHTML(nombre)}</strong></p>`];
  if (documento) lineasRemitente.push(`<p>${escaparHTML(documento)}</p>`);
  if (direccion || ciudad || cp) {
    const domicilio = [escaparHTML(direccion), [escaparHTML(cp), escaparHTML(ciudad)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    lineasRemitente.push(`<p>${domicilio}</p>`);
  }
  if (telefono) lineasRemitente.push(`<p>Tel.: ${escaparHTML(telefono)}</p>`);
  if (email) lineasRemitente.push(`<p>${escaparHTML(email)}</p>`);

  const cuerpoHTML = carta.split('\n').map(linea => {
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
  .marca-agua { position:fixed; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0; }
  .marca-agua span { font-family:Arial,sans-serif; font-size:92px; font-weight:700; color:rgba(13,27,42,0.045); transform:rotate(-38deg); white-space:nowrap; letter-spacing:4px; }
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
  .pie { position:relative; z-index:1; margin-top:50px; padding-top:8px; border-top:0.5px solid #ddd; font-family:Arial,sans-serif; font-size:7pt; color:#bbb; text-align:center; line-height:1.6; }
  @media print { body { padding:0 50px 60px; } @page { margin:22mm 20mm 22mm 25mm; size:A4; } }
</style>
</head>
<body>
<div class="marca-agua"><span>RECLAMOIA</span></div>
<div class="contenido">
<div class="cabecera-formal">
  <div class="marca">
    <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA">
    <span class="marca-texto">Reclamo<span>IA</span> · Escrito de reclamación</span>
  </div>
  <div class="ref">Ref. expediente: ${refExpediente}<br>Categoría: ${escaparHTML(categoriaEmpresa || 'General')}</div>
</div>
<div class="remitente">
  ${lineasRemitente.join('\n  ')}
</div>
<hr>
<div class="destinatario">
  <p><strong>A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE</strong></p>
  <p><strong>${escaparHTML(empresa.toUpperCase())}</strong></p>
</div>
<div class="asunto">
  <strong>Asunto:</strong> Reclamación formal en materia de ${escaparHTML((categoriaEmpresa || 'consumo').toLowerCase())}
</div>
<hr>
<div class="cuerpo">${cuerpoHTML}</div>
<div class="firma">
  <div class="firma-linea"></div>
  <p><strong>${escaparHTML(nombre)}</strong></p>
  ${documento ? `<p>${escaparHTML(documento)}</p>` : ''}
</div>
</div>
<div class="pie">
  <p>ReclamoIA · reclamoia.es | Este escrito tiene carácter de reclamación extrajudicial. ReclamoIA no presta servicios de asesoría jurídica.</p>
</div>
</body>
</html>`;
}

function generarHTMLGuia(guiaData, datos) {
  const { nombre, empresa, categoriaEmpresa, ciudad } = datos;
  const { guia, fecha } = guiaData;

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
  body { font-family:'Times New Roman',Times,serif; font-size:11pt; color:#1a1a1a; background:#fff; padding:40px 50px 60px; max-width:800px; margin:0 auto; }
  @media print { body { padding:0; } @page { margin:22mm 20mm 22mm 25mm; size:A4; } }
</style>
</head>
<body>

<div style="border-top:4px solid #0D1B2A; padding-top:14px; border-bottom:2px solid #0D1B2A; padding-bottom:16px; margin-bottom:24px;">
  <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA" style="height:26px; width:auto; display:block; margin-bottom:10px;">
  <h1 style="font-family:Arial,sans-serif; font-size:18pt; font-weight:700; color:#0D1B2A; margin:0 0 4px;">GUÍA DE PRESENTACIÓN</h1>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#C9A84C; font-weight:600; margin:0;">Escrito de reclamación contra ${escaparHTML(empresa)} — ${escaparHTML(categoriaEmpresa)}</p>
</div>

<div style="background:#f0f4ff; border:1px solid #b0c4f0; border-radius:8px; padding:14px 16px; margin-bottom:24px;">
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0 0 4px;"><strong>Preparado para:</strong> ${escaparHTML(nombre)}</p>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0 0 4px;"><strong>Empresa reclamada:</strong> ${escaparHTML(empresa)}</p>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0 0 4px;"><strong>Categoría:</strong> ${escaparHTML(categoriaEmpresa)}</p>
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#1a3a6a; margin:0;"><strong>Organismo regulador:</strong> ${escaparHTML(guia.organismo)}</p>
</div>

<div style="background:#fdf9f0; border:1px solid #C9A84C; border-radius:8px; padding:14px 16px; margin-bottom:24px;">
  <p style="font-family:Arial,sans-serif; font-size:10pt; color:#8a6a1a; font-weight:700; margin:0 0 6px;">⚠️ LEE ESTO ANTES DE EMPEZAR</p>
  <p style="font-family:'Times New Roman',Times,serif; font-size:10.5pt; color:#555; line-height:1.6; margin:0;">Esta guía te explica exactamente qué hacer después de enviar tu escrito de reclamación a ${escaparHTML(empresa)}. Sigue los pasos en orden. No saltes al siguiente paso sin haber completado el anterior.</p>
</div>

${pasosHTML}

${guia.enlace ? `
<div style="margin-top:24px; padding:16px; background:#f0f4ff; border-radius:8px; border:1px solid #b0c4f0;">
  <p style="font-family:Arial,sans-serif; font-size:10pt; font-weight:700; color:#0D1B2A; margin:0 0 6px;">🔗 Enlace oficial del organismo regulador</p>
  <p style="font-family:'Times New Roman',Times,serif; font-size:10.5pt; color:#1a3a6a; margin:0;">${escaparHTML(guia.organismo)}: <strong>${escaparHTML(guia.enlace)}</strong></p>
  ${guia.telefono ? `<p style="font-family:'Times New Roman',Times,serif; font-size:10.5pt; color:#1a3a6a; margin:4px 0 0;">Teléfono: <strong>${escaparHTML(guia.telefono)}</strong></p>` : ''}
</div>
` : ''}

<div style="margin-top:40px; padding-top:12px; border-top:0.5px solid #ddd; font-family:Arial,sans-serif; font-size:7pt; color:#bbb; text-align:center; line-height:1.6;">
  <p>ReclamoIA · reclamoia.es | Esta guía es orientativa. ReclamoIA no presta servicios de asesoría jurídica.</p>
  <p>Los plazos y procedimientos están verificados a fecha ${escaparHTML(fecha)}. Se recomienda verificar posibles actualizaciones en las webs oficiales indicadas.</p>
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

    let carta = '';
    let nombre = '';
    let documento = '';
    let direccion = '';
    let cp = '';
    let ciudad = '';
    let telefono = '';
    let categoriaEmpresa = '';

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
          categoriaEmpresa = d.categoriaEmpresa || '';
        }
      } catch (kvError) {
        console.error('Error recuperando de Redis:', kvError);
      }
    }

    const fecha = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    try {
      const datos = { nombre, documento, direccion, cp, ciudad, telefono, email, empresa, categoriaEmpresa };

      const htmlEscrito = generarHTMLEscrito(carta, datos);
      const pdfEscritoResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
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

      let pdfEscritoBase64 = null;
      if (pdfEscritoResponse.ok) {
        const pdfBuffer = await pdfEscritoResponse.arrayBuffer();
        pdfEscritoBase64 = Buffer.from(pdfBuffer).toString('base64');
      }

      let pdfGuiaBase64 = null;
      if (opcion === 'completa' && categoriaEmpresa) {
        try {
          const { default: guiaHandler } = await import('./guia.js');
const guiaReq = { method: 'POST', body: { categoria: categoriaEmpresa, empresa, ciudad, nombre, fecha } };
const guiaData = { guia: null, fecha };

await new Promise((resolve) => {
  const guiaRes = {
    status: () => ({ json: (data) => { Object.assign(guiaData, data); resolve(); } })
  };
  guiaHandler(guiaReq, guiaRes);
});

if (guiaData.guia) {
  const htmlGuia = generarHTMLGuia(guiaData, datos);

            const pdfGuiaResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString('base64')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                source: htmlGuia,
                format: 'A4',
                margin: { top: '22mm', bottom: '22mm', left: '25mm', right: '20mm' }
              })
            });

            if (pdfGuiaResponse.ok) {
              const guiaBuffer = await pdfGuiaResponse.arrayBuffer();
              pdfGuiaBase64 = Buffer.from(guiaBuffer).toString('base64');
            }
          }
        } catch (guiaError) {
          console.error('Error generando guía:', guiaError);
        }
      }

      const adjuntos = [];
      if (pdfEscritoBase64) {
        adjuntos.push({
          filename: `Escrito-Reclamacion-${empresa.replace(/\s+/g, '-')}.pdf`,
          content: pdfEscritoBase64,
          type: 'application/pdf'
        });
      }
      if (pdfGuiaBase64) {
        adjuntos.push({
          filename: `Guia-Presentacion-${empresa.replace(/\s+/g, '-')}.pdf`,
          content: pdfGuiaBase64,
          type: 'application/pdf'
        });
      }

      const htmlEmail = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f0f2f7;margin:0;padding:0;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#0D1B2A;padding:28px 32px;">
    <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA" style="height:36px;width:auto;">
  </div>
  <div style="padding:32px;">
    <h2 style="font-size:18px;color:#0D1B2A;margin-bottom:12px;">Tu ${opcion === 'completa' ? 'escrito y guía están listos' : 'escrito está listo'}, ${escaparHTML(nombre.split(' ')[0] || '')}</h2>
    <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:16px;">
      Hemos generado tu escrito de reclamación formal contra <strong>${escaparHTML(empresa)}</strong> con legislación verificada en el BOE y EUR-Lex.
      ${opcion === 'completa' ? 'También encontrarás adjunta la guía paso a paso para presentar tu reclamación correctamente.' : ''}
    </p>
    <div style="background:#fdf9f0;border:1px solid #C9A84C;border-radius:8px;padding:12px 16px;margin:20px 0;">
      <p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Fecha:</strong> ${escaparHTML(fecha)}</p>
      <p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Destinatario:</strong> ${escaparHTML(empresa)}</p>
      <p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Legislación verificada:</strong> BOE · EUR-Lex</p>
      ${opcion === 'completa' ? `<p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Guía de presentación:</strong> incluida en PDF adjunto</p>` : ''}
    </div>
    <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="font-size:13px;color:#0D1B2A;font-weight:bold;margin-bottom:8px;">¿Qué hago ahora?</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">1. Abre el PDF del escrito adjunto</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">2. Envíalo a ${escaparHTML(empresa)} siguiendo las instrucciones${opcion === 'completa' ? ' de la guía adjunta' : ''}</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">3. Guarda siempre el justificante de envío</p>
      <p style="font-size:13px;color:#555;margin:6px 0;">4. Si no responden en 15 días hábiles, sigue los pasos indicados${opcion === 'completa' ? ' en la guía' : ''}</p>
    </div>
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

      await resend.emails.send({
        from: 'ReclamoIA <hola@reclamoia.es>',
        to: email,
        subject: opcion === 'completa'
          ? `Tu escrito + guía de presentación contra ${empresa}`
          : `Tu escrito de reclamación contra ${empresa}`,
        html: htmlEmail,
        attachments: adjuntos
      });

      console.log('Email enviado correctamente a:', email, '| Opción:', opcion);

    } catch (emailError) {
      console.error('Error enviando email:', emailError);
    }
  }

  return res.status(200).json({ received: true });
}
