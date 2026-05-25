import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

function generarHTMLEscrito(carta, datos) {
  const { nombre, documento, ciudad, telefono, email, empresa, categoria } = datos;
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const refInterna = `RY-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
    padding: 0;
  }
  .pagina {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm 20mm 20mm 25mm;
    position: relative;
  }
  .cabecera {
    border-bottom: 2px solid #1a1a2e;
    padding-bottom: 12px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .cabecera-logo {
    font-family: Arial, sans-serif;
    font-size: 18pt;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: -0.5px;
  }
  .cabecera-logo span {
    color: #5DCAA5;
  }
  .cabecera-ref {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #666;
    text-align: right;
    line-height: 1.6;
  }
  .remitente {
    margin-bottom: 20px;
    line-height: 1.7;
  }
  .remitente p {
    font-size: 10.5pt;
  }
  .destinatario {
    margin-bottom: 20px;
    line-height: 1.7;
  }
  .destinatario p {
    font-size: 10.5pt;
  }
  .fecha-lugar {
    margin-bottom: 20px;
    font-size: 10.5pt;
  }
  .asunto {
    background: #f5f5f5;
    border-left: 3px solid #1a1a2e;
    padding: 8px 12px;
    margin-bottom: 20px;
    font-family: Arial, sans-serif;
    font-size: 10pt;
    font-weight: 700;
    color: #1a1a2e;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .cuerpo {
    line-height: 1.8;
    font-size: 11pt;
    text-align: justify;
    margin-bottom: 20px;
    white-space: pre-wrap;
  }
  .firma {
    margin-top: 30px;
    padding-top: 20px;
  }
  .firma-linea {
    width: 200px;
    border-top: 1px solid #1a1a1a;
    margin-bottom: 6px;
  }
  .firma p {
    font-size: 10pt;
    line-height: 1.6;
  }
  .pie {
    position: fixed;
    bottom: 15mm;
    left: 25mm;
    right: 20mm;
    border-top: 0.5px solid #ccc;
    padding-top: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pie p {
    font-family: Arial, sans-serif;
    font-size: 7pt;
    color: #999;
  }
  .sello {
    width: 60px;
    height: 60px;
    border: 2px solid #1a1a2e;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0.15;
    flex-shrink: 0;
  }
  .sello-texto {
    font-family: Arial, sans-serif;
    font-size: 6pt;
    font-weight: 700;
    color: #1a1a2e;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.3;
  }
</style>
</head>
<body>
<div class="pagina">

  <div class="cabecera">
    <div class="cabecera-logo">Reclama<span>Ya</span></div>
    <div class="cabecera-ref">
      <p>Referencia: ${refInterna}</p>
      <p>Fecha: ${fecha}</p>
      <p>Legislación verificada: BOE · EUR-Lex · ${categoria || 'Organismos reguladores'}</p>
    </div>
  </div>

  <div class="remitente">
    <p><strong>${nombre}</strong></p>
    <p>DNI/CIF: ${documento}</p>
    <p>${datos.direccion}, ${datos.cp} ${ciudad}</p>
    <p>Tel.: ${telefono}</p>
    <p>Email: ${email}</p>
  </div>

  <div class="destinatario">
    <p><strong>A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE</strong></p>
    <p><strong>${empresa.toUpperCase()}</strong></p>
  </div>

  <div class="fecha-lugar">
    <p>${ciudad}, a ${fecha}</p>
  </div>

  <div class="cuerpo">${carta}</div>

  <div class="firma">
    <div class="firma-linea"></div>
    <p><strong>${nombre}</strong></p>
    <p>DNI/CIF: ${documento}</p>
    <p>${fecha}</p>
  </div>

  <div class="pie">
    <div>
      <p>Documento generado por ReclamaYa | reclamaya.es</p>
      <p>Este escrito tiene carácter de reclamación extrajudicial. ReclamaYa no presta servicios de asesoría jurídica.</p>
      <p>Legislación verificada en fuentes oficiales: BOE (boe.es) · EUR-Lex (eur-lex.europa.eu)</p>
    </div>
    <div class="sello">
      <div class="sello-texto">RECLAMA<br>YA<br>VERIFIED</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { carta, datos } = req.body;

  if (!carta || !datos) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const html = generarHTMLEscrito(carta, datos);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ReclamaYa-${datos.empresa.replace(/\s+/g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    return res.send(Buffer.from(pdf));

  } catch (error) {
    console.error('Error generando PDF:', error);
    return res.status(500).json({ error: 'Error al generar el PDF' });
  }
}
