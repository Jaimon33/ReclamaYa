export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const {
    tipo, nombre, documento, direccion, ciudad, cp,
    telefono, email, empresa, referencia, fechaHecho,
    problema, importe, objetivo, descripcion
  } = req.body;

  if (!nombre || !documento || !direccion || !ciudad || !cp ||
      !telefono || !email || !empresa || !problema || !objetivo || !descripcion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const tipoTexto = tipo === 'empresa' ? 'empresa' : 'particular';
  const docTexto = tipo === 'empresa' ? 'CIF' : 'DNI';
  const nombreTexto = tipo === 'empresa' ? 'Razón social' : 'Nombre completo';
  const importeTexto = importe ? `El importe reclamado es de ${parseFloat(importe).toFixed(2)}€.` : '';
  const referenciaTexto = referencia ? `El número de contrato o referencia es: ${referencia}.` : '';
  const fechaTexto = fechaHecho ? `Los hechos ocurrieron el ${fechaHecho}.` : '';

  const prompt = `Eres un experto en derecho del consumidor y administrativo español.
Redacta una carta de reclamación formal, profesional y contundente con los siguientes datos reales del reclamante. 
IMPORTANTE: Usa todos los datos proporcionados directamente en la carta, sin dejar ningún campo entre corchetes para rellenar después. La carta debe estar 100% completa y lista para enviar.

DATOS DEL RECLAMANTE:
- Tipo: ${tipoTexto}
- ${nombreTexto}: ${nombre}
- ${docTexto}: ${documento}
- Dirección: ${direccion}, ${cp} ${ciudad}
- Teléfono: ${telefono}
- Email: ${email}

DATOS DE LA RECLAMACIÓN:
- Destinatario: ${empresa}
- Motivo: ${problema}
- Objetivo: ${objetivo}
- ${importeTexto}
- ${referenciaTexto}
- ${fechaTexto}

DESCRIPCIÓN DEL CASO:
${descripcion}

INSTRUCCIONES PARA REDACTAR LA CARTA:
1. Encabezado con lugar (${ciudad}), fecha actual y datos completos del remitente
2. Dirigida al Servicio de Atención al Cliente de ${empresa}
3. Cuerpo con exposición clara de los hechos basada en la descripción proporcionada
4. Referencias legales concretas y vigentes aplicables al caso (Ley General de Telecomunicaciones, Ley de Consumidores, Reglamento CE 261/2004, LGT, LGSS, LGT, etc. según corresponda)
5. Solicitud formal y clara del objetivo indicado
6. Plazo máximo de respuesta de 15 días hábiles
7. Advertencia de acciones ante organismos reguladores competentes si no se atiende (CNMC, AEPD, AESA, OCU, Defensor del Pueblo, etc. según corresponda)
8. Cierre formal con nombre completo, ${docTexto} y datos de contacto reales ya incluidos

Devuelve únicamente el texto de la carta, sin explicaciones ni comentarios adicionales.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      return res.status(200).json({ carta: data.content[0].text });
    } else {
      throw new Error('Respuesta inesperada de la API');
    }
  } catch (error) {
    console.error('Error al llamar a Claude:', error);
    return res.status(500).json({ error: 'Error al generar la carta' });
  }
}
