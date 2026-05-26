import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  maxDuration: 300
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { carta, datos } = req.body;

  if (!carta || !datos) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const {
    nombre, documento, direccion, cp, ciudad,
    telefono, email, empresa, categoriaEmpresa
  } = datos;

  const fecha = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const refInterna = `RY-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

  const escapar = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const cuerpoHTML = carta.split('\n').map(linea => {
    const e = escapar(linea.trimEnd());
    if (!e.trim()) return '<p style="margin:6px 0">&nbsp;</p>';

    const match = linea.trimEnd().match(/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO)(\.-)\s+(.+)$/);
    if (match) {
      const numero = escapar(match[1] + match[2]);
      const resto = escapar(match[3]);
      return `<p style="margin:10px 0 4px;"><strong>${numero}</strong> ${resto}</p>`;
    }

    if (/^(SOLICITO:|EXPONGO:)/.test(e)) {
      return `<p style="margin:14px 0 6px; font-weight:bold;">${e}</p>`;
    }

    if (/^(Muy señores|Atentamente)/.test(e)) {
      return `<p style="margin:14px 0 4px;">${e}</p>`;
    }

    if (/^Al amparo de/.test(e)) {
      return `<p style="margin:6px 0 4px; font-style:italic; color:#444;">${e}</p>`;
    }

    if (/^[—–]/.test(e)) {
      return `<p style="margin:4px 0 4px 20px;">${e}</p>`;
    }

    return `<p style="margin:5px 0; text-align:justify;">${e}</p>`;
  }).join('');

  const htmlEscrito = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
    padding: 40px 50px 60px;
    max-width: 800px;
    margin: 0 auto;
  }
  .remitente { margin-bottom: 20px; font-size: 10.5pt; line-height: 1.75; }
  .remitente p { margin: 1px 0; }
  hr { border: none; border-top: 0.5px solid #ccc; margin: 16px 0; }
  .destinatario { margin-bottom: 16px; font-size: 10.5pt; line-height: 1.75; }
  .destinatario p { margin: 1px 0; }
  .cuerpo { font-size: 11pt; line-height: 1.8; margin-bottom: 20px; }
  .firma { margin-top: 40px; font-size: 10.5pt; line-height: 1.7; }
  .firma-linea { width: 180px; border-top: 1px solid #333; margin: 35px 0 8px; }
  .pie-pagina {
    margin-top: 60px;
    padding-top: 8px;
    border-top: 0.5px solid #ddd;
    font-family: Arial, sans-serif;
    font-size: 7pt;
    color: #bbb;
    line-height: 1.6;
    text-align: center;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 22mm 20mm 22mm 25mm; size: A4; }
  }
</style>
</head>
<body>

<div class="remitente">
  <p><strong>${escapar(nombre)}</strong></p>
  <p>${escapar(documento)}</p>
  <p>${escapar(direccion)}, ${escapar(cp)} ${escapar(ciudad)}</p>
  <p>Tel.: ${escapar(telefono)}</p>
  <p>${escapar(email)}</p>
</div>

<hr>

<div class="destinatario">
  <p><strong>A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE</strong></p>
  <p><strong>${escapar(empresa.toUpperCase())}</strong></p>
</div>

<hr>

<div class="cuerpo">
  ${cuerpoHTML}
</div>

<div class="firma">
  <div class="firma-linea"></div>
  <p><strong>${escapar(nombre)}</strong></p>
  <p>${escapar(documento)}</p>
</div>

<div class="pie-pagina">
  <p>ReclamaYa · reclamaya.es | Este escrito tiene carácter de reclamación extrajudicial. ReclamaYa no presta servicios de asesoría jurídica.</p>
</div>

</body>
</html>`;

  const htmlEmail = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f0f2f7; margin: 0; padding: 0; }
  .contenedor { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.06); }
  .cabecera { background: #1a1a2e; padding: 28px 32px; }
  .logo { font-size: 22px; font-weight: 900; color: #fff; }
  .logo span { color: #5DCAA5; }
  .cuerpo-email { padding: 32px; }
  .titulo { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
  .texto { font-size: 14px; color: #444; line-height: 1.7; margin-bottom: 16px; }
  .ref-box { background: #f0f9f5; border: 1px solid #5DCAA5; border-radius: 8px; padding: 12px 16px; margin: 20px 0; }
  .ref-box p { font-size: 13px; color: #2a8a6a; margin: 3px 0; }
  .instrucciones { background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .instrucciones p { font-size: 13px; color: #555; margin: 6px 0; line-height: 1.6; }
  .instrucciones strong { color: #1a1a2e; }
  .aviso { font-size: 11px; color: #999; line-height: 1.6; margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; }
  .pie-email { background: #f8f8f8; padding: 16px 32px; text-align: center; }
  .pie-email p { font-size: 11px; color: #aaa; margin: 2px 0; }
</style>
</head>
<body>
<div class="contenedor">
  <div class="cabecera">
    <div class="logo">Reclama<span>Ya</span></div>
  </div>
  <div class="cuerpo-email">
    <p class="titulo">Tu escrito de reclamación está listo, ${escapar(nombre.split(' ')[0])}</p>
    <p class="texto">Hemos generado tu escrito de reclamación formal contra <strong>${escapar(empresa)}</strong> con legislación verificada en el BOE y EUR-Lex. Lo encontrarás adjunto a este email en formato PDF.</p>
    <div class="ref-box">
      <p>✓ <strong>Fecha:</strong> ${escapar(fecha)}</p>
      <p>✓ <strong>Destinatario:</strong> ${escapar(empresa)}</p>
      <p>✓ <strong>Legislación verificada:</strong> BOE · EUR-Lex</p>
    </div>
    <div class="instrucciones">
      <p><strong>¿Qué hago ahora con mi escrito?</strong></p>
      <p>1. Abre el PDF adjunto a este email</p>
      <p>2. Envíalo a ${escapar(empresa)} por un medio que deje constancia: email con acuse de recibo o correo certificado</p>
      <p>3. Guarda el justificante de envío — es fundamental si necesitas escalar la reclamación</p>
      <p>4. Si no obtienes respuesta en 15 días hábiles, acude al organismo regulador correspondiente</p>
    </div>
    <p class="aviso">ReclamaYa es una herramienta de asistencia en la redacción de escritos de reclamación. No presta servicios de asesoría jurídica.</p>
  </div>
  <div class="pie-email">
    <p>ReclamaYa · reclamaya.es</p>
    <p>© 2026 ReclamaYa. Todos los derechos reservados.</p>
  </div>
</div>
</body>
</html>`;

  try {
    res.status(200).json({
      ok: true,
      ref: refInterna,
      email: email,
      mensaje: 'Tu escrito está siendo procesado y lo recibirás en tu email en unos minutos.'
    });
  } catch (e) {
    // continuar aunque falle el envío de respuesta
  }

  try {
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: htmlEscrito,
        landscape: false,
        use_print: true,
        format: 'A4',
        margin: {
          top: '22mm',
          bottom: '22mm',
          left: '25mm',
          right: '20mm'
        }
      })
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new Error(`PDFShift error: ${errorText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    await resend.emails.send({
      from: 'ReclamaYa <onboarding@resend.dev>',
      to: email,
      subject: `Tu escrito de reclamación contra ${empresa} — ${fecha}`,
      html: htmlEmail,
      attachments: [
        {
          filename: `Escrito-Reclamacion-${empresa.replace(/\s+/g, '-')}.pdf`,
          content: pdfBase64,
          type: 'application/pdf'
        }
      ]
    });

  } catch (error) {
    console.error('Error generando PDF en background:', error);
  }
}
