// Descarga de documentos pagados. POST con credenciales -> billete de un solo uso (2 minutos);
// GET con el billete -> el archivo. Así ni la clave ni el token viajan en una URL.
import crypto from 'node:crypto';
import { RETENCION } from './_config.js';
import { comando, leerBinario } from './_almacen.js';
import { enviar, leerCuerpoJSON, noAutorizado, dentroDeCupo, ipCliente, leerExpediente } from './_seguridad.js';
import { expedienteDeLaPeticion } from './_pago.js';

const RE_BILLETE = /^[A-Za-z0-9_-]{32}$/;

function localizar(exp, codigo) {
  const archivo = exp.entrega?.archivos?.find(a => a.codigo === codigo);
  if (archivo) return { clave: `ent:${exp.id}:${codigo}`, nombre: archivo.nombre, tipo: 'application/pdf' };
  const m = /^anexo-(\d{1,2})$/.exec(codigo);
  if (m && exp.pago?.producto === 'oaut') {
    const doc = exp.documentos[Number(m[1]) - 1];
    if (doc) {
      const ext = doc.tipo === 'application/pdf' ? 'pdf' : doc.tipo === 'image/png' ? 'png' : 'jpg';
      const base = doc.nombre.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 40);
      return { clave: `doc:${exp.id}:${doc.id}`, nombre: `Anexo-${m[1]}-${base}.${ext}`, tipo: doc.tipo };
    }
  }
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      if (!(await dentroDeCupo('descarga', ipCliente(req), 200, 3600))) return enviar(res, 429, { error: 'Demasiadas descargas seguidas.' });
      const cuerpo = await leerCuerpoJSON(req, 5000);
      const exp = await expedienteDeLaPeticion(req, cuerpo);
      if (!exp) return noAutorizado(res);
      if (exp.estado !== 'entregado') return enviar(res, 409, { error: 'Los documentos aún no están listos.' });
      if (!localizar(exp, String(cuerpo.archivo || ''))) return enviar(res, 404, { error: 'Archivo no encontrado' });
      const billete = crypto.randomBytes(24).toString('base64url');
      await comando(['SET', `billete:${billete}`, JSON.stringify({ e: exp.id, a: cuerpo.archivo }), 'EX', String(RETENCION.billeteDescarga)]);
      return enviar(res, 200, { url: `/api/descargar?b=${billete}` });
    }

    if (req.method === 'GET') {
      const billete = String(req.query?.b || new URL(req.url, 'http://x').searchParams.get('b') || '');
      if (!RE_BILLETE.test(billete)) return enviar(res, 404, { error: 'Enlace no válido' });
      const raw = await comando(['GETDEL', `billete:${billete}`]);
      if (!raw) return enviar(res, 410, { error: 'Este enlace de descarga ya se usó o ha caducado. Vuelve a pulsar el botón de descarga.' });
      const { e, a } = JSON.parse(raw);
      const exp = await leerExpediente(e);
      const destino = exp && exp.estado === 'entregado' ? localizar(exp, a) : null;
      const bytes = destino ? await leerBinario(destino.clave) : null;
      if (!bytes) return enviar(res, 410, { error: 'El documento ya no está disponible.' });
      res.setHeader('Content-Type', destino.tipo);
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('Content-Disposition', `attachment; filename="${destino.nombre}"`);
      res.setHeader('Cache-Control', 'no-store, private');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.status(200);
      return res.end(bytes);
    }
    return enviar(res, 405, { error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en descarga:', error.message);
    return enviar(res, 500, { error: 'No hemos podido preparar la descarga.' });
  }
}
