// Configuración del servidor. Lo público (marca, precios, límites) vive en config-publica.js.
export { MARCA, PRESTADOR, PRODUCTOS, LIMITES, formatearPrecio } from '../config-publica.js';

export const MONEDA = 'eur';

// Modelo de IA para leer facturas y comprobantes. Solo extrae datos: el escrito sale de plantillas.
export const MODELO_EXTRACCION = 'claude-opus-5-5';

// Conservación (en segundos). Coherente con la política de privacidad publicada.
export const RETENCION = {
  borrador: 48 * 3600,           // expediente sin pagar: respuestas y documentos
  tramiteSubida: 3600,           // trozos de un archivo a medio subir
  entregables: 30 * 86400,       // documentos pagados y archivos aportados, disponibles para descargar
  registroPedido: 5 * 365 * 86400, // registro mínimo del pedido, sin documentos (obligaciones fiscales y reclamaciones)
  billeteDescarga: 120           // enlace de un solo uso para abrir un PDF
};

// Máximo de lecturas automáticas con IA por expediente y por dirección IP al día.
export const CUPOS = {
  extraccionesPorExpediente: 15,
  extraccionesPorIpDia: 40,
  expedientesPorIpHora: 20,
  subidasPorIpHora: 120
};

export const VERSION_PLANTILLAS = '2026-10-28.1';

export function urlBase() {
  if (process.env.URL_PUBLICA) return process.env.URL_PUBLICA.replace(/\/$/, '');
  if (process.env.VERCEL_ENV === 'production') return 'https://reclamoia.es';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 5050}`;
}

export function enProduccion() {
  return process.env.VERCEL_ENV === 'production';
}

export function enLocal() {
  return !process.env.VERCEL;
}
