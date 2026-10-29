// Crea el pago en Stripe. Antes comprueba el expediente y prepara una prueba completa de los
// documentos (sin guardarla) para no cobrar si algún archivo no se puede incorporar.
import { PRODUCTOS, MONEDA, urlDeVuelta, enLocal } from './_config.js';
import { leerBinario } from './_almacen.js';
import { enviar, leerCuerpoJSON, expedienteAutorizado, guardarExpediente, credenciales, noAutorizado } from './_seguridad.js';
import { validarDatos } from './_expediente.js';
import { generarEntregables, prepararAnexos } from './_entregables.js';
import { VERSION_CONDICIONES } from './_condiciones.js';
import { clienteStripe, registrarPago } from './_pago.js';
import { registrar } from './_metricas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return enviar(res, 405, { error: 'Método no permitido' });
  try {
    const cuerpo = await leerCuerpoJSON(req, 5000);
    const { id, clave } = credenciales(req, cuerpo);
    const exp = await expedienteAutorizado(id, clave);
    if (!exp) return noAutorizado(res);
    if (exp.estado !== 'borrador') return enviar(res, 409, { error: 'Este expediente ya está pagado.', estado: exp.estado });
    if (cuerpo.aceptaCondiciones !== true || cuerpo.ejecucionInmediata !== true) {
      return enviar(res, 400, { error: 'Para continuar tienes que aceptar las condiciones y pedir que preparemos los documentos de inmediato.' });
    }
    if (!exp.datos || !exp.resumen) return enviar(res, 409, { error: 'Revisa y confirma tus datos antes de pagar.' });

    const { errores, evaluacion } = validarDatos(exp.datos, exp);
    if (errores.length) return enviar(res, 422, { errores });
    const producto = PRODUCTOS[evaluacion.producto];

    const stripe = clienteStripe();
    if (stripe && exp.pago?.sesion) {
      const anterior = await stripe.checkout.sessions.retrieve(exp.pago.sesion);
      if (anterior.payment_status === 'paid') {
        await registrarPago(anterior);
        return enviar(res, 409, { error: 'Este expediente ya está pagado.', estado: 'pagado' });
      }
      if (anterior.status === 'open') await stripe.checkout.sessions.expire(anterior.id).catch(() => {});
    }

    // Prueba completa: si un anexo no se puede incorporar, se detecta aquí y no se cobra.
    const aceptacion = { version: VERSION_CONDICIONES, fecha: new Date().toISOString(), ejecucionInmediata: true };
    try {
      const binarios = [];
      for (const doc of exp.documentos) {
        const b = await leerBinario(`doc:${exp.id}:${doc.id}`);
        if (!b) throw Object.assign(new Error(`"${doc.nombre}" ha caducado. Vuelve a subirlo.`), { usuario: true });
        binarios.push(b);
      }
      const prueba = { ...exp, aceptacion, pago: { producto: producto.codigo, importeCentimos: producto.precioCentimos, pagadoEn: aceptacion.fecha } };
      await generarEntregables(prueba, prepararAnexos(prueba, binarios));
    } catch (e) {
      console.error('Prueba de generación fallida:', e.message);
      await registrar('error_anexo', producto.codigo);
      return enviar(res, 422, { errores: [e.usuario ? e.message : 'No hemos podido montar el documento con tus archivos. Revisa que se abren bien, quita el que dé problemas o súbelo de nuevo. No se te ha cobrado nada.'] });
    }

    exp.aceptacion = aceptacion;
    const base = urlDeVuelta(req);
    let url;
    if (stripe) {
      const sesion = await stripe.checkout.sessions.create({
        mode: 'payment',
        locale: 'es',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: MONEDA,
            unit_amount: producto.precioCentimos,
            product_data: { name: producto.nombre, description: `Preparación documental · ref. ${exp.referencia}` }
          }
        }],
        client_reference_id: exp.id,
        metadata: { expediente: exp.id, producto: producto.codigo, referencia: exp.referencia },
        payment_intent_data: { metadata: { expediente: exp.id, producto: producto.codigo, referencia: exp.referencia } },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${base}/exito.html?e=${exp.id}`,
        cancel_url: `${base}/reclamar.html#revisar`
      });
      exp.pago = { sesion: sesion.id, producto: producto.codigo, importeCentimos: producto.precioCentimos, creada: new Date().toISOString(), origen: base };
      url = sesion.url;
    } else if (enLocal()) {
      // Solo en local y sin claves: pasarela simulada del servidor de desarrollo.
      exp.pago = { sesion: `cs_simulada_${exp.id}`, producto: producto.codigo, importeCentimos: producto.precioCentimos, creada: new Date().toISOString(), origen: base };
      url = `${base}/__dev/pagar?e=${exp.id}`;
    } else {
      throw new Error('Stripe no configurado');
    }
    await guardarExpediente(exp);
    await registrar('llegada_pago', producto.codigo);
    return enviar(res, 200, { url });
  } catch (error) {
    console.error('Error creando el pago:', error.message);
    await registrar('error_pago');
    return enviar(res, 500, { error: 'No hemos podido abrir el pago. Inténtalo de nuevo en un momento.' });
  }
}
