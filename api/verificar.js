const FORMATO_REF = /^RC-\d{8}-[A-Z0-9]{4}$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const ref = (req.query.ref || '').toString().trim().toUpperCase();

  if (!ref || !FORMATO_REF.test(ref)) {
    return res.status(200).json({ valido: false });
  }

  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    const resp = await fetch(`${url}/get/expediente:${ref}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();

    if (!data.result) {
      return res.status(200).json({ valido: false });
    }

    const expediente = JSON.parse(data.result);
    return res.status(200).json({
      valido: true,
      ref: expediente.ref,
      fecha: expediente.fecha,
      categoria: expediente.categoria
    });

  } catch (error) {
    console.error('Error verificando documento:', error);
    return res.status(500).json({ error: 'Error al verificar el documento' });
  }
}
