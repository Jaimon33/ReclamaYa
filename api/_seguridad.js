import crypto from 'node:crypto';
import { comando, leerJSON, guardarJSON } from './_almacen.js';
import { RETENCION } from './_config.js';

const RE_ID = /^[A-Za-z0-9_-]{22}$/;
const RE_CLAVE = /^[A-Za-z0-9_-]{43}$/;

export function generarId() {
  return crypto.randomBytes(16).toString('base64url');
}

export function generarClave() {
  return crypto.randomBytes(32).toString('base64url');
}

export function resumen(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

function iguales(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function enviar(res, estado, cuerpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(estado).json(cuerpo);
}

export async function leerCuerpo(req, maxBytes) {
  const trozos = [];
  let total = 0;
  for await (const trozo of req) {
    const b = typeof trozo === 'string' ? Buffer.from(trozo) : trozo;
    total += b.length;
    if (total > maxBytes) {
      const error = new Error('Cuerpo demasiado grande');
      error.estado = 413;
      throw error;
    }
    trozos.push(b);
  }
  return Buffer.concat(trozos);
}

export async function leerCuerpoJSON(req, maxBytes = 200000) {
  const buf = await leerCuerpo(req, maxBytes);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    const error = new Error('JSON no válido');
    error.estado = 400;
    throw error;
  }
}

export function ipCliente(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'desconocida');
}

// Ventana fija: true si todavía se permite la acción.
export async function dentroDeCupo(nombre, sujeto, maximo, segundos) {
  const clave = `cupo:${nombre}:${resumen(String(sujeto)).slice(0, 32)}`;
  const n = Number(await comando(['INCR', clave]));
  if (n === 1) await comando(['EXPIRE', clave, String(segundos)]);
  return n <= maximo;
}

export function claveExpediente(id) {
  return `exp:${id}`;
}

export async function leerExpediente(id) {
  if (!RE_ID.test(String(id || ''))) return null;
  return leerJSON(claveExpediente(id));
}

// Carga el expediente solo si la clave secreta coincide. Nunca indica cuál de los dos falló.
export async function expedienteAutorizado(id, clave) {
  if (!RE_ID.test(String(id || '')) || !RE_CLAVE.test(String(clave || ''))) return null;
  const exp = await leerJSON(claveExpediente(id));
  if (!exp || !iguales(exp.claveHash, resumen(clave))) return null;
  return exp;
}

export function segundosRetencion(exp) {
  return ['borrador', 'pago_pendiente'].includes(exp.estado) ? RETENCION.borrador : RETENCION.entregables;
}

export async function guardarExpediente(exp) {
  exp.actualizado = new Date().toISOString();
  await guardarJSON(claveExpediente(exp.id), exp, segundosRetencion(exp));
}

export function credenciales(req, cuerpo = {}) {
  return {
    id: cuerpo.expediente || req.headers['x-expediente'] || '',
    clave: cuerpo.clave || req.headers['x-clave'] || ''
  };
}

export function noAutorizado(res) {
  return enviar(res, 404, { error: 'No encontramos este expediente o ha caducado.' });
}
