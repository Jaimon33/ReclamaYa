// Estado del pedido tras el pago. Acceso con la clave del expediente (misma pestaña)
// o con el enlace personal enviado por email. Si el pago está confirmado y la entrega falló, la reintenta.
import { enviar, leerCuerpoJSON, noAutorizado, dentroDeCupo, ipCliente } from './_seguridad.js';
import { comprobarPagoPendiente, entregar, expedienteDeLaPeticion } from './_pago.js';
import { PRODUCTOS } from './_config.js';
import { fechaLarga } from './_reglas.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return enviar(res, 405, { error: 'Método no permitido' });
  try {
    if (!(await dentroDeCupo('estado', ipCliente(req), 300, 3600))) return enviar(res, 429, { error: 'Demasiadas consultas seguidas.' });
    const cuerpo = await leerCuerpoJSON(req, 5000);
    let exp = await expedienteDeLaPeticion(req, cuerpo);
    if (!exp) return noAutorizado(res);

    // El servidor pregunta a Stripe si el aviso de pago aún no ha llegado.
    if (exp.estado === 'borrador' && exp.pago?.sesion) exp = await comprobarPagoPendiente(exp);
    if (['pagado', 'error_entrega'].includes(exp.estado)) {
      try {
        const r = await entregar(exp.id);
        if (r.exp) exp = r.exp;
      } catch {
        /* el estado indica el error y se reintentará en la siguiente consulta */
      }
    }

    const producto = exp.pago ? PRODUCTOS[exp.pago.producto] : null;
    return enviar(res, 200, {
      estado: exp.estado === 'borrador' ? (exp.pago ? 'esperando_pago' : 'sin_pago') : exp.estado,
      referencia: exp.referencia,
      producto: producto ? { codigo: producto.codigo, nombre: producto.nombre } : null,
      email: exp.estado === 'entregado' ? exp.datos.titular.email.replace(/^(.).*(@.*)$/, '$1•••$2') : null,
      emailEnviado: exp.entrega?.emailEnviado ?? null,
      archivos: exp.estado === 'entregado' ? exp.entrega.archivos : [],
      anexos: exp.estado === 'entregado' && exp.pago.producto === 'oaut' ? exp.documentos.map((d, i) => ({ codigo: `anexo-${i + 1}`, nombre: `Anexo ${i + 1} · ${d.nombre}`, bytes: d.bytes })) : [],
      limiteOaut: exp.pago?.producto === 'oaut' ? fechaLarga(exp.evaluacion.fechas.limiteOaut) : null,
      operador: exp.respuestas.operador === 'Otro' ? exp.respuestas.operadorOtro : exp.respuestas.operador
    });
  } catch (error) {
    console.error('Error en estado:', error.message);
    return enviar(res, 500, { error: 'No hemos podido consultar el estado. Vuelve a intentarlo.' });
  }
}
