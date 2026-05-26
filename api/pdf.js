import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { pdfBase64, nombreArchivo, datos, nombreEmpresa } = req.body;

  if (!pdfBase64 || !datos) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const { nombre, email, empresa } = datos;

  const fecha = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const escapar = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

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
      <p>3. Guarda el justificante de envío — fundamental si necesitas escalar la reclamación</p>
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
    await resend.emails.send({
      from: 'ReclamaYa <onboarding@resend.dev>',
      to: email,
      subject: `Tu escrito de reclamación contra ${empresa} — ${fecha}`,
      html: htmlEmail,
      attachments: [
        {
          filename: nombreArchivo || `Escrito-Reclamacion-${empresa.replace(/\s+/g, '-')}.pdf`,
          content: pdfBase64,
          type: 'application/pdf'
        }
      ]
    });

    return res.status(200).json({ ok: true, email });

  } catch (error) {
    console.error('Error enviando email:', error);
    return res.status(500).json({ error: 'Error al enviar el email' });
  }
}
