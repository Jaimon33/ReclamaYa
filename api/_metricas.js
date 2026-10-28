// Medición mínima y anónima: solo contadores diarios por evento y producto.
// No guarda documentos, datos personales, IP ni el contenido de los escritos.
import { comando } from './_almacen.js';
import { hoy } from './_reglas.js';

export const EVENTOS = [
  'inicio', 'elegible', 'incompleto', 'excluido', 'documentos_completos',
  'llegada_pago', 'pago_confirmado', 'entrega', 'error_extraccion',
  'error_anexo', 'error_pago', 'error_entrega'
];

const PRODUCTOS_VALIDOS = ['operador', 'oaut', '-'];

export async function registrar(evento, producto = '-') {
  if (!EVENTOS.includes(evento)) return;
  const p = PRODUCTOS_VALIDOS.includes(producto) ? producto : '-';
  const clave = `met:${hoy()}:${evento}:${p}`;
  try {
    const n = await comando(['INCR', clave]);
    if (Number(n) === 1) await comando(['EXPIRE', clave, String(400 * 86400)]);
  } catch (e) {
    console.error('No se pudo registrar la métrica', evento, e.message);
  }
}
