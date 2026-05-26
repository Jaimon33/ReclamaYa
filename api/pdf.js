export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { carta, datos } = req.body;

  if (!carta || !datos) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const { nombre, documento, direccion, cp, ciudad, telefono, email, empresa, categoriaEmpresa } = datos;

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
    const e = escapar(linea);
    if (!e.trim()) return '<p style="margin:5px 0">&nbsp;</p>';
    if (/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|SOLICITO|EXPONGO|ASUNTO|REF\.)/.test(e)) {
      return `<p style="margin:10px 0 6px;font-weight:bold;font-family:Arial,sans-serif;">${e}</p>`;
    }
    if (/^[—–-]/.test(e)) {
      return `<p style="margin:4px 0 4px 20px;">${e}</p>`;
    }
    return `<p style="margin:5px 0;text-align:justify;">${e}</p>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ReclamaYa — ${escapar(refInterna)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
    padding: 30px 40px 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  .cabecera {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2.5px solid #1a1a2e;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .logo {
    font-family: Arial, sans-serif;
    font-size: 22pt;
    font-weight: 900;
    color: #1a1a2e;
  }
  .logo span { color: #5DCAA5; }
  .ref {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #666;
    text-align: right;
    line-height: 1.7;
  }
  .verificado {
    display: inline-block;
    background: #f0f9f5;
    border: 0.5px solid #5DCAA5;
    border-radius: 3px;
    padding: 3px 8px;
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #2a8a6a;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .bloque {
    margin-bottom: 14px;
    font-size: 10.5pt;
    line-height: 1.7;
  }
  .etiqueta {
    font-family: Arial, sans-serif;
    font-size: 7pt;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 3px;
  }
  hr { border: none; border-top: 0.5px solid #ddd; margin: 14px 0; }
  .cuerpo { font-size: 11pt; line-height: 1.75; margin-bottom: 20px; }
  .firma { margin-top: 30px; padding-top: 14px; border-top: 0.5px solid #ddd; }
  .firma-linea { width: 180px; border-top: 1px solid #333; margin: 28px 0 6px; }
  .firma p { font-size: 10pt; line-height: 1.7; }
  .pie {
    margin-top: 30px;
    padding-top: 8px;
    border-top: 0.5px solid #ccc;
    font-family: Arial, sans-serif;
    font-size: 7pt;
    color: #999;
    line-height: 1.6;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 20mm 20mm 20mm 25mm; size: A4; }
  }
</style>
</head>
<body>

<div class="cabecera">
  <div class="logo">Reclama<span>Ya</span></div>
  <div class="ref">
    <p><strong>Referencia:</strong> ${escapar(refInterna)}</p>
    <p><strong>Fecha:</strong> ${escapar(fecha)}</p>
    <p><strong>Categoría:</strong> ${escapar(categoriaEmpresa || 'General')}</p>
  </div>
</div>

<div class="verificado">✓ Legislación verificada — BOE · EUR-Lex · Organismos reguladores</div>

<div class="bloque">
  <div class="etiqueta">Datos del reclamante</div>
  <p><strong>${escapar(nombre)}</strong></p>
  <p>${escapar(documento)}</p>
  <p>${escapar(direccion)}, ${escapar(cp)} ${escapar(ciudad)}</p>
  <p>Tel.: ${escapar(telefono)}</p>
  <p>${escapar(email)}</p>
</div>

<hr>

<div class="bloque">
  <div class="etiqueta">Destinatario</div>
  <p><strong>A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE</strong></p>
  <p><strong>${escapar(empresa.toUpperCase())}</strong></p>
  <p>${escapar(ciudad)}, a ${escapar(fecha)}</p>
</div>

<hr>

<div class="cuerpo">${cuerpoHTML}</div>

<div class="firma">
  <div class="firma-linea"></div>
  <p><strong>${escapar(nombre)}</strong></p>
  <p>${escapar(documento)}</p>
  <p>${escapar(fecha)}</p>
</div>

<div class="pie">
  <p>Documento generado por ReclamaYa | reclamaya.es | Ref: ${escapar(refInterna)}</p>
  <p>Legislación verificada: BOE (boe.es) · EUR-Lex (eur-lex.europa.eu)</p>
  <p>Este escrito tiene carácter de reclamación extrajudicial. ReclamaYa no presta servicios de asesoría jurídica.</p>
</div>

</body>
</html>`;

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ html, refInterna });
}
