export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { empresa, problema, objetivo, importe, nombre, ciudad } = req.body;

  if (!empresa || !problema || !objetivo || !nombre || !ciudad) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const importeTexto = importe
    ? `El importe reclamado es de ${parseFloat(importe).toFixed(2)}€.`
    : '';

  const prompt = `Eres un experto en derecho del consumidor y administrativo español. 
Redacta una carta de reclamación formal, profesional y contundente con los siguientes datos:

- Remitente: ${nombre}, con domicilio en ${ciudad}
- Destinatario: ${empresa}
- Motivo de la reclamación: ${problema}
- Objetivo que se quiere conseguir: ${objetivo}
- ${importeTexto}

La carta debe:
1. Tener formato formal con lugar, fecha y datos del remitente
2. Incluir referencias legales concretas y aplicables al caso (leyes españolas vigentes)
3. Ser firme y profesional, dejando claro que el remitente conoce sus derechos
4. Incluir un plazo máximo de respuesta de 15 días hábiles
5. Mencionar las consecuencias de no atender la reclamación (organismos reguladores, acciones legales)
6. Terminar con firma y datos de contacto en formato [TU TELÉFONO] y [TU EMAIL] para que el usuario los complete
7. Usar los campos [TU DNI], [Nº CONTRATO/REFERENCIA] y [FECHA DEL HECHO] donde corresponda

Devuelve únicamente el texto de la carta, sin explicaciones adicionales.`;

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
        max_tokens: 1500,
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
