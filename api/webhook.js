import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: false
  }
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const empresa = session.metadata?.empresa || 'la empresa';
    const opcion = session.metadata?.opcion || 'basica';

    const asunto = opcion === 'completa'
      ? `Tu escrito + guía de presentación contra ${empresa}`
      : `Tu escrito de reclamación contra ${empresa}`;

    try {
      await resend.emails.send({
        from: 'ReclamaYa <onboarding@resend.dev>',
        to: email,
        subject: asunto,
        html: `
          <div style="font-family:Arial,sans-serif; max-width:560px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden;">
            <div style="background:#1a1a2e; padding:24px 32px;">
              <span style="font-size:20px; font-weight:900; color:#fff;">Reclama<span style="color:#5DCAA5;">Ya</span></span>
            </div>
            <div style="padding:32px;">
              <h2 style="font-size:18px; color:#1a1a2e; margin-bottom:12px;">Pago confirmado ✓</h2>
              <p style="font-size:14px; color:#444; line-height:1.7; margin-bottom:16px;">
                Hemos recibido tu pago correctamente. En unos instantes recibirás un email con tu escrito adjunto en PDF.
              </p>
              <p style="font-size:14px; color:#444; line-height:1.7;">
                Si en 5 minutos no lo has recibido, revisa la carpeta de spam o escríbenos a <a href="mailto:hola@reclamaya.es">hola@reclamaya.es</a>.
              </p>
            </div>
            <div style="background:#f8f8f8; padding:16px 32px; text-align:center;">
              <p style="font-size:11px; color:#aaa; margin:0;">ReclamaYa · reclamaya.es</p>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error enviando email de confirmación:', emailError);
    }
  }

  return res.status(200).json({ received: true });
}
