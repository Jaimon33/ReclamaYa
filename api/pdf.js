export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { carta, datos } = req.body;

  if (!carta || !datos) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const { nombre, documento, direccion, cp, ciudad, telefono, email, empresa, categoriaEmpresa } = datos;

    const fecha = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const refInterna = `RY-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

    const lineas = carta.split('\n');

    const escaparXML = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const cuerpoHTML = lineas
      .map(linea => {
        const escapada = escaparXML(linea);
        if (escapada.trim() === '') return '<p style="margin:4px 0;">&nbsp;</p>';
        if (
          escapada.startsWith('PRIMERO') ||
          escapada.startsWith('SEGUNDO') ||
          escapada.startsWith('TERCERO') ||
          escapada.startsWith('SOLICITO') ||
          escapada.startsWith('EXPONGO') ||
          escapada.startsWith('ASUNTO') ||
          escapada.startsWith('REF.')
        ) {
          return `<p style="margin:8px 0; font-weight:bold;">${escapada}</p>`;
        }
        if (escapada.startsWith('—') || escapada.startsWith('-')) {
          return `<p style="margin:4px 0 4px 20px;">${escapada}</p>`;
        }
        return `<p style="margin:4px 0;">${escapada}</p>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 20mm 20mm 25mm 25mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.6;
  }
  .cabecera {
    border-bottom: 2.5px solid #1a1a2e;
    padding-bottom: 10px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .logo {
    font-family: Arial, sans-serif;
    font-size: 20pt;
    font-weight: 900;
    color: #1a1a2e;
    letter-spacing: -0.5px;
  }
  .logo span { color: #5DCAA5; }
  .ref {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #666;
    text-align: right;
    line-height: 1.7;
  }
  .bloque {
    margin-bottom: 16px;
    font-size: 10.5pt;
    line-height: 1.7;
  }
  .bloque p { margin: 1px 0; }
  .etiqueta {
    font-family: Arial, sans-serif;
    font-size: 7.5pt;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 3px;
  }
  .separador {
    border: none;
    border-top: 0.5px solid #ddd;
    margin: 14px 0;
  }
  .cuerpo {
    font-size: 11pt;
    line-height: 1.75;
    text-align: justify;
    margin-bottom: 20px;
  }
  .firma-seccion {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 0.5px solid #ddd;
  }
  .firma-linea {
    width: 180px;
    border-top: 1px solid #333;
    margin-bottom: 6px;
    margin-top: 30px;
  }
  .firma-datos {
    font-size: 10pt;
    line-height: 1.7;
  }
  .pie {
    margin-top: 30px;
    padding-top: 8px;
    border-top: 0.5px solid #ccc;
    font-family: Arial, sans-serif;
    font-size: 7pt;
    color: #999;
    line-height: 1.6;
  }
  .verificado {
    display: inline-block;
    background: #f0f9f5;
    border: 0.5px solid #5DCAA5;
    border-radius: 3px;
    padding: 2px 6px;
    font-family: Arial, sans-serif;
    font-size: 7pt;
    color: #2a8a6a;
    font-weight: 700;
    margin-bottom: 10px;
  }
</style>
</head>
<body>

<div class="cabecera">
  <div class="logo">Reclama<span>Ya</span></div>
  <div class="ref">
    <p><strong>Referencia:</strong> ${escaparXML(refInterna)}</p>
    <p><strong>Fecha:</strong> ${escaparXML(fecha)}</p>
    <p><strong>Categoría:</strong> ${escaparXML(categoriaEmpresa || 'General')}</p>
  </div>
</div>

<div class="verificado">✓ Legislación verificada — BOE · EUR-Lex · Organismos reguladores</div>

<div class="bloque">
  <div class="etiqueta">Datos del reclamante</div>
  <p><strong>${escaparXML(nombre)}</strong></p>
  <p>${escaparXML(documento)}</p>
  <p>${escaparXML(direccion)}, ${escaparXML(cp)} ${escaparXML(ciudad)}</p>
  <p>Tel.: ${escaparXML(telefono)}</p>
  <p>${escaparXML(email)}</p>
</div>

<hr class="separador">

<div class="bloque">
  <div class="etiqueta">Destinatario</div>
  <p><strong>A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE</strong></p>
  <p><strong>${escaparXML(empresa.toUpperCase())}</strong></p>
  <p>${escaparXML(ciudad)}, a ${escaparXML(fecha)}</p>
</div>

<hr class="separador">

<div class="cuerpo">
  ${cuerpoHTML}
</div>

<div class="firma-seccion">
  <div class="firma-linea"></div>
  <div class="firma-datos">
    <p><strong>${escaparXML(nombre)}</strong></p>
    <p>${escaparXML(documento)}</p>
    <p>${escaparXML(fecha)}</p>
  </div>
</div>

<div class="pie">
  <p>Documento generado por ReclamaYa | reclamaya.es | Referencia: ${escaparXML(refInterna)}</p>
  <p>Legislación verificada en fuentes oficiales: BOE (boe.es) · EUR-Lex (eur-lex.europa.eu)</p>
  <p>Este escrito tiene carácter de reclamación extrajudicial. ReclamaYa no presta servicios de asesoría jurídica.</p>
</div>

</body>
</html>`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        apiKey: 'demo'
      })
    });

    if (!pdfResponse.ok) {
      throw new Error('Error en servicio PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ReclamaYa-${empresa.replace(/\s+/g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.byteLength);
    return res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Error generando PDF:', error);
    return res.status(500).json({ error: 'Error al generar el PDF' });
  }
}
