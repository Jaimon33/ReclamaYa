// Almacenamiento privado en Upstash Redis (API REST). Todo se guarda con caducidad.
// En local, sin credenciales, usa memoria del proceso para poder probar el flujo.
import { enLocal } from './_config.js';

// Upstash limita el tamaño de cada petición: los archivos se guardan en trozos.
const TAMANO_TROZO = 700000;

const memoria = new Map();

function memoriaVigente(clave) {
  const e = memoria.get(clave);
  if (!e) return null;
  if (e.caduca && e.caduca < Date.now()) {
    memoria.delete(clave);
    return null;
  }
  return e;
}

function comandoMemoria([orden, ...args]) {
  const op = orden.toUpperCase();
  const clave = args[0];
  switch (op) {
    case 'GET': return memoriaVigente(clave)?.valor ?? null;
    case 'SET': {
      const [, valor, ...opciones] = args;
      const nx = opciones.includes('NX');
      if (nx && memoriaVigente(clave)) return null;
      const iEx = opciones.indexOf('EX');
      const caduca = iEx >= 0 ? Date.now() + Number(opciones[iEx + 1]) * 1000 : null;
      memoria.set(clave, { valor: String(valor), caduca });
      return 'OK';
    }
    case 'DEL': return args.reduce((n, c) => n + (memoria.delete(c) ? 1 : 0), 0);
    case 'EXPIRE': {
      const e = memoriaVigente(clave);
      if (!e) return 0;
      e.caduca = Date.now() + Number(args[1]) * 1000;
      return 1;
    }
    case 'INCR': {
      const e = memoriaVigente(clave);
      const valor = Number(e?.valor || 0) + 1;
      memoria.set(clave, { valor: String(valor), caduca: e?.caduca ?? null });
      return valor;
    }
    case 'GETDEL': {
      const v = memoriaVigente(clave)?.valor ?? null;
      memoria.delete(clave);
      return v;
    }
    case 'ZADD': {
      const e = memoriaVigente(clave) || { valor: '{}', caduca: null };
      const z = JSON.parse(e.valor);
      z[args[2]] = Number(args[1]);
      memoria.set(clave, { valor: JSON.stringify(z), caduca: e.caduca });
      return 1;
    }
    case 'ZRANGEBYSCORE': {
      const z = JSON.parse(memoriaVigente(clave)?.valor || '{}');
      return Object.entries(z).filter(([, s]) => s >= Number(args[1]) && s <= Number(args[2])).map(([m]) => m);
    }
    case 'ZREM': {
      const e = memoriaVigente(clave);
      if (!e) return 0;
      const z = JSON.parse(e.valor);
      delete z[args[1]];
      e.valor = JSON.stringify(z);
      return 1;
    }
    default: throw new Error(`Orden no soportada en memoria: ${op}`);
  }
}

export async function comando(args) {
  const url = process.env.KV_REST_API_URL;
  if (!url) {
    if (enLocal()) return comandoMemoria(args.map(String));
    throw new Error('Almacenamiento no configurado');
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args.map(String))
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.error) throw new Error(`Redis ${args[0]} falló: ${data.error || resp.status}`);
  return data.result;
}

export async function leerJSON(clave) {
  const raw = await comando(['GET', clave]);
  return raw ? JSON.parse(raw) : null;
}

export async function guardarJSON(clave, valor, segundos) {
  await comando(['SET', clave, JSON.stringify(valor), 'EX', String(segundos)]);
}

// Bloqueo breve para que dos procesos no hagan lo mismo a la vez (p. ej. dos avisos de pago).
export async function bloquear(clave, segundos) {
  return (await comando(['SET', `bloqueo:${clave}`, '1', 'NX', 'EX', String(segundos)])) === 'OK';
}

export async function desbloquear(clave) {
  await comando(['DEL', `bloqueo:${clave}`]).catch(() => {});
}

export async function guardarBinario(clave, buffer, segundos) {
  const base64 = Buffer.from(buffer).toString('base64');
  const partes = Math.max(1, Math.ceil(base64.length / TAMANO_TROZO));
  for (let i = 0; i < partes; i++) {
    await comando(['SET', `${clave}:p${i}`, base64.slice(i * TAMANO_TROZO, (i + 1) * TAMANO_TROZO), 'EX', String(segundos)]);
  }
  await comando(['SET', `${clave}:partes`, String(partes), 'EX', String(segundos)]);
}

export async function leerBinario(clave) {
  const partes = Number(await comando(['GET', `${clave}:partes`]));
  if (!partes) return null;
  let base64 = '';
  for (let i = 0; i < partes; i++) {
    const trozo = await comando(['GET', `${clave}:p${i}`]);
    if (trozo == null) throw new Error(`Falta un fragmento de ${clave}`);
    base64 += trozo;
  }
  return Buffer.from(base64, 'base64');
}

export async function borrarBinario(clave) {
  const partes = Number(await comando(['GET', `${clave}:partes`])) || 0;
  const claves = [`${clave}:partes`];
  for (let i = 0; i < partes; i++) claves.push(`${clave}:p${i}`);
  await comando(['DEL', ...claves]);
}

export async function prolongarBinario(clave, segundos) {
  const partes = Number(await comando(['GET', `${clave}:partes`])) || 0;
  await comando(['EXPIRE', `${clave}:partes`, String(segundos)]);
  for (let i = 0; i < partes; i++) await comando(['EXPIRE', `${clave}:p${i}`, String(segundos)]);
}
