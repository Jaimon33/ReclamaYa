// Avisos de Stripe. Solo se entrega si la firma es válida y el pago cuadra con el expediente.
import Stripe from 'stripe';
import { comando } from './_almacen.js';
import { leerCuerpo } from './_seguridad.js';
import { registrarPago, entregar, enviarAlerta } from './_pago.js';

export const config = { api: { bodyParser: false } };

const EVENTOS_PAGO = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  let evento;
  try {
    const cuerpo = await leerCuerpo(req, 1024 * 1024);
    evento = Stripe.webhooks.constructEvent(cuerpo, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Aviso de Stripe rechazado:', err.message);
    return res.status(400).json({ error: 'Firma no válida' });
  }

  if (!EVENTOS_PAGO.includes(evento.type)) return res.status(200).json({ recibido: true });

  try {
    if (await comando(['GET', `evento:${evento.id}`])) return res.status(200).json({ recibido: true, repetido: true });
    const sesion = evento.data.object;
    if (sesion.payment_status !== 'paid') return res.status(200).json({ recibido: true, pendiente: true });

    const { exp, rechazo } = await registrarPago(sesion);
    if (rechazo) {
      await comando(['SET', `evento:${evento.id}`, 'rechazado', 'EX', String(30 * 86400)]);
      return res.status(200).json({ recibido: true });
    }
    if (exp.estado !== 'entregado') {
      const resultado = await entregar(exp.id);
      if (resultado.enCurso) return res.status(200).json({ recibido: true, enCurso: true });
    }
    await comando(['SET', `evento:${evento.id}`, 'ok', 'EX', String(30 * 86400)]);
    return res.status(200).json({ recibido: true });
  } catch (error) {
    console.error('Error procesando el pago:', error.message);
    if (/Almacenamiento|Redis/.test(error.message)) {
      await enviarAlerta('La base de datos no responde al recibir un pago', [`Evento: ${evento.id}`, `Motivo: ${error.message}`, 'Stripe reintentará el aviso.']);
    }
    // Stripe reintenta el aviso; la entrega también se reintenta cuando el cliente abre su página.
    return res.status(500).json({ error: 'Se reintentará' });
  }
}
