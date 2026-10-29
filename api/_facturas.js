// Facturas con numeración correlativa por año: LC 001-26, LC 002-26… El número se asigna una sola
// vez por pedido, al confirmarse el pago. Fuera de producción se usa una serie de pruebas aparte
// para no consumir números reales.
import { comando } from './_almacen.js';
import { enProduccion } from './_config.js';

export const IVA = 21;
const CONSERVACION = 6 * 365 * 86400; // seis años (art. 30 del Código de Comercio)

export function serieFacturas() {
  return enProduccion() ? 'LC' : 'PRUEBA';
}

export function numeroFactura(serie, n, anio) {
  return `${serie} ${String(n).padStart(3, '0')}-${String(anio).slice(-2)}`;
}

// Base e IVA a partir del total con IVA incluido, en céntimos y sin descuadres de redondeo.
export function desglose(totalCentimos) {
  const base = Math.round(totalCentimos / (1 + IVA / 100));
  return { base, cuota: totalCentimos - base, total: totalCentimos };
}

// Asigna número a la factura del pedido (idempotente: si ya tiene, la devuelve tal cual).
export async function asignarFactura(exp) {
  if (exp.factura) return exp.factura;
  const fecha = (exp.pago?.pagadoEn || new Date().toISOString()).slice(0, 10);
  const anio = Number(fecha.slice(0, 4));
  const serie = serieFacturas();
  const n = Number(await comando(['INCR', `facturas:contador:${serie}:${anio}`]));
  const t = exp.datos.titular;
  const factura = {
    numero: numeroFactura(serie, n, anio),
    fecha,
    serie,
    importes: desglose(exp.pago.importeCentimos),
    cliente: {
      nombre: t.nombre, documento: t.documento,
      domicilio: [t.domicilio, [t.cp, t.localidad].filter(Boolean).join(' '), t.provincia].filter(Boolean).join(', ')
    },
    producto: exp.pago.producto,
    referencia: exp.referencia
  };
  // Registro de facturas emitidas (libro registro), sin documentos del cliente.
  await comando(['SET', `factura:${factura.numero}`, JSON.stringify(factura), 'EX', String(CONSERVACION)]);
  await comando(['RPUSH', `facturas:registro:${serie}:${anio}`, factura.numero]);
  exp.factura = factura;
  return factura;
}
