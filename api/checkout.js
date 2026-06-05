import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function guardarEnRedis(key, valor) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  const response = await fetch(`${url}/set/${key}/${encodeURIComponent(valor)}?EX=3600`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log('Redis set response:', JSON.stringify(data));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { opcion, email, empresa, carta, datosUsuario } = req.body;

  if (!opcion || !email) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const priceId = opcion === 'completa'
    ? process.env.STRIPE_PRICE_COMPLETO
    : process.env.STRIPE_PRICE_ESCRITO;

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const tempId = `carta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await guardarEnRedis(tempId, JSON.stringify({ carta, datosUsuario }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      customer_email: email,
      metadata: {
        empresa: empresa || '',
        opcion: opcion,
        tempId: tempId
      },
      success_url: `${baseUrl}/exito.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/reclamar.html`
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Error creando sesión Stripe:', error);
    return res.status(500).json({ error: 'Error al procesar el pago' });
  }
}
