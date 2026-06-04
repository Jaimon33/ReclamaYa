import Stripe from 'stripe';
import { Resend } from 'resend';
import jsPDF from 'jspdf';

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

function generarPDFBase64(carta, datos) {
  const { nombre, documento, direccion, cp, ciudad, telefono, email, empresa } = datos;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margenIzq = 25;
  const margenDer = 20;
  const anchoUtil = 210 - margenIzq - margenDer;
  let y = 22;

  const addTexto = (texto, opciones = {}) => {
    const { fontSize = 11, bold = false, italic = false, color = [26, 26, 26], marginTop = 0, indent = 0 } = opciones;
    y += marginTop;
    if (y > 267) { doc.addPage(); y = 22; }
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    if (bold && italic) doc.setFont('times', 'bolditalic');
    else if (bold) doc.setFont('times', 'bold');
    else if (italic) doc.setFont('times', 'italic');
    else doc.setFont('times', 'normal');
    const lineas = doc.splitTextToSize(texto, anchoUtil - indent);
    lineas.forEach((linea, i) => {
      if (y > 267) { doc.addPage(); y = 22; }
      doc.text(linea, margenIzq + indent, y);
      if (i < lineas.length - 1) y += 6;
    });
    y += 6;
  };

  const addLinea = (marginTop = 4) => {
    y += marginTop;
    if (y > 267) { doc.addPage(); y = 22; }
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margenIzq, y, 210 - margenDer, y);
    y += 4;
  };

  addTexto(nombre, { bold: true });
  addTexto(documento);
  addTexto(`${direccion}, ${cp} ${ciudad}`);
  addTexto(`Tel.: ${telefono}`);
  addTexto(email);
  addLinea(4);
  addTexto('A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE', { bold: true });
  addTexto(empresa.toUpperCase(), { bold: true });
  addLinea(4);

  const lineas = carta.split('\n');
  for (const linea of lineas) {
    const l = linea.trim().replace(/\*\*/g, '');
    if (!l) { y += 3; continue; }

    const match = l.match(/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO)(\.-)\s+(.+)$/);
    if (match) {
      if (y > 267) { doc.addPage(); y = 22; }
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.setTextColor(26, 26, 26);
      const numero = match[1] + match[2];
      const anchoNumero = doc.getTextWidth(numero + ' ');
      doc.text(numero, margenIzq, y);
      doc.setFont('times', 'normal');
      const restoLineas = doc.splitTextToSize(match[3], anchoUtil - anchoNumero);
      restoLineas.forEach((rl, i) => {
        if (y > 267) { doc.addPage(); y = 22; }
        doc.text(rl, margenIzq + anchoNumero, y);
        if (i < restoLineas.length - 1) y += 6;
      });
      y += 7;
      continue;
    }

    if (/^(SOLICITO:|EXPONGO:)/.test(l)) { addTexto(l, { bold: true, marginTop: 4 }); continue; }
    if (/^Al amparo de/.test(l)) { addTexto(l, { italic: true, color: [80, 80, 80], indent: 5 }); continue; }
    if (/^[—–]/.test(l)) { addTexto(l, { indent: 8 }); continue; }
    if (/^(Muy señores|Atentamente)/.test(l)) { addTexto(l, { marginTop: 4 }); continue; }
    addTexto(l);
  }

  y += 15;
  if (y > 250) { doc.addPage(); y = 22; }
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(margenIzq, y, margenIzq + 50, y);
  y += 6;
  addTexto(nombre, { bold: true });
  addTexto(documento);

  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(
      'ReclamaYa · reclamaya.es | Este escrito tiene carácter de reclamación extrajudicial.',
      105, 287, { align: 'center', maxWidth: anchoUtil }
    );
  }

  return doc.output('datauristring').split(',')[1];
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
    const nombre = session.metadata?.nombre || '';
    const documento = session.metadata?.documento || '';
    const direccion = session.metadata?.direccion || '';
    const cp = session.metadata?.cp || '';
    const ciudad = session.metadata?.ciudad || '';
    const telefono = session.metadata?.telefono || '';
    const tempId = session.metadata?.tempId || '';
let carta = '';
let datosCompletos = {};

if (tempId) {
  try {
    const { kv } = await import('@vercel/kv');
    const datos = await kv.get(tempId);
    if (datos) {
      const parsed = JSON.parse(datos);
      carta = parsed.carta || '';
      datosCompletos = parsed.datosUsuario || {};
    }
  } catch (kvError) {
    console.error('Error recuperando de KV:', kvError);
  }
}

const nombre = datosCompletos.nombre || session.metadata?.nombre || '';
const documento = datosCompletos.documento || session.metadata?.documento || '';
const direccion = datosCompletos.direccion || session.metadata?.direccion || '';
const cp = datosCompletos.cp || session.metadata?.cp || '';
const ciudad = datosCompletos.ciudad || session.metadata?.ciudad || '';
const telefono = datosCompletos.telefono || session.metadata?.telefono || '';

    const fecha = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    try {
      let pdfBase64 = null;
      let nombreArchivo = `Escrito-Reclamacion-${empresa.replace(/\s+/g, '-')}.pdf`;

      if (carta && nombre) {
        const datos = { nombre, documento, direccion, cp, ciudad, telefono, email, empresa };
        pdfBase64 = generarPDFBase64(carta, datos);
      }

      const htmlEmail = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif; background:#f0f2f7; margin:0; padding:0;">
<div style="max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden;">
  <div style="background:#1a1a2e; padding:28px 32px;">
    <span style="font-size:22px; font-weight:900; color:#fff;">Reclama<span style="color:#5DCAA5;">Ya</span></span>
  </div>
  <div style="padding:32px;">
    <h2 style="font-size:18px; color:#1a1a2e; margin-bottom:12px;">Tu escrito está listo, ${nombre.split(' ')[0]}</h2>
    <p style="font-size:14px; color:#444; line-height:1.7; margin-bottom:16px;">
      Hemos generado tu escrito de reclamación formal contra <strong>${empresa}</strong>. Lo encontrarás adjunto a este email en formato PDF.
    </p>
    <div style="background:#f6faf8; border:1px solid #c3ddd0; border-radius:8px; padding:12px 16px; margin:20px 0;">
      <p style="font-size:13px; color:#2d6a4f; margin:3px 0;">✓ <strong>Fecha:</strong> ${fecha}</p>
      <p style="font-size:13px; color:#2d6a4f; margin:3px 0;">✓ <strong>Destinatario:</strong> ${empresa}</p>
      <p style="font-size:13px; color:#2d6a4f; margin:3px 0;">✓ <strong>Legislación verificada:</strong> BOE · EUR-Lex</p>
    </div>
    <div style="background:#f8f8f8; border-radius:8px; padding:16px; margin:20px 0;">
      <p style="font-size:13px; color:#555; margin:6px 0;"><strong>¿Qué hago ahora?</strong></p>
      <p style="font-size:13px; color:#555; margin:6px 0;">1. Abre el PDF adjunto</p>
      <p style="font-size:13px; color:#555; margin:6px 0;">2. Envíalo a ${empresa} por email con acuse de recibo o correo certificado</p>
      <p style="font-size:13px; color:#555; margin:6px 0;">3. Guarda el justificante de envío</p>
      <p style="font-size:13px; color:#555; margin:6px 0;">4. Si no responden en 15 días, acude al organismo regulador</p>
    </div>
    <p style="font-size:11px; color:#999; line-height:1.6; margin-top:20px; padding-top:16px; border-top:1px solid #eee;">
      ReclamaYa es una herramienta de asistencia en la redacción de escritos. No presta servicios de asesoría jurídica.
    </p>
  </div>
  <div style="background:#f8f8f8; padding:16px 32px; text-align:center;">
    <p style="font-size:11px; color:#aaa; margin:2px 0;">ReclamaYa · reclamaya.es</p>
    <p style="font-size:11px; color:#aaa; margin:2px 0;">© 2026 ReclamaYa. Todos los derechos reservados.</p>
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

    } catch (emailError) {
      console.error('Error enviando email:', emailError);
    }
  }

  return res.status(200).json({ received: true });
}
