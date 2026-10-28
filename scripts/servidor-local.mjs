// Servidor de desarrollo: sirve la web y ejecuta las funciones de /api como en Vercel.
// Sin credenciales usa almacenamiento en memoria y una pasarela de pago simulada que firma
// los avisos igual que Stripe. No se despliega (ver .vercelignore).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Stripe from 'stripe';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.PORT || 5050);
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_local_pruebas';
process.env.PORT = String(PUERTO);

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json'
};
const PRIVADO = /^\/(api|pruebas|scripts|node_modules|docs|\.)/;

function adaptarRespuesta(res) {
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (cuerpo) => { res.end(cuerpo); return res; };
  return res;
}

async function ejecutarFuncion(req, res, nombre) {
  const archivo = path.join(RAIZ, 'api', `${nombre}.js`);
  if (nombre.startsWith('_') || !fs.existsSync(archivo)) return adaptarRespuesta(res).status(404).json({ error: 'No existe' });
  const modulo = await import(pathToFileURL(archivo).href);
  req.query = Object.fromEntries(new URL(req.url, 'http://local').searchParams);
  try {
    await modulo.default(req, adaptarRespuesta(res));
  } catch (e) {
    console.error(`Error no controlado en /api/${nombre}:`, e);
    if (!res.headersSent) res.status(500).json({ error: 'Error interno' });
  }
}

async function pagoSimulado(req, res, url) {
  const { leerExpediente } = await import(pathToFileURL(path.join(RAIZ, 'api/_seguridad.js')).href);
  const id = url.searchParams.get('e');
  const exp = await leerExpediente(id);
  if (!exp?.pago) return adaptarRespuesta(res).status(404).json({ error: 'Sin pago pendiente' });
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!doctype html><meta name="viewport" content="width=device-width"><title>Pago simulado</title>
<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:16px">
<h1>Pasarela de pago simulada</h1><p>Solo existe en el servidor local. Importe: <b>${(exp.pago.importeCentimos / 100).toFixed(2)} €</b> · ${exp.pago.producto}</p>
<form method="post"><button style="font-size:18px;padding:12px 20px">Pagar (simulado)</button></form>
<p><a href="/reclamar.html#revisar">Cancelar y volver</a></p></body>`);
  }
  const sesion = {
    id: exp.pago.sesion, object: 'checkout.session', mode: 'payment', payment_status: 'paid', status: 'complete',
    currency: 'eur', amount_total: Number(url.searchParams.get('importe') || exp.pago.importeCentimos),
    client_reference_id: exp.id, metadata: { expediente: exp.id, producto: exp.pago.producto, referencia: exp.referencia },
    payment_intent: 'pi_simulado'
  };
  const evento = { id: `evt_${Date.now()}`, object: 'event', type: 'checkout.session.completed', data: { object: sesion } };
  const cuerpo = JSON.stringify(evento);
  const firma = Stripe.webhooks.generateTestHeaderString({ payload: cuerpo, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const r = await fetch(`http://localhost:${PUERTO}/api/webhook`, { method: 'POST', headers: { 'stripe-signature': firma, 'Content-Type': 'application/json' }, body: cuerpo });
  console.log('Webhook simulado:', r.status, await r.text());
  res.statusCode = 303;
  res.setHeader('Location', `/exito.html?e=${exp.id}`);
  return res.end();
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname.startsWith('/api/')) return await ejecutarFuncion(req, res, url.pathname.slice(5).replace(/\/$/, ''));
    if (url.pathname === '/__dev/pagar') return await pagoSimulado(req, res, url);
    if (url.pathname === '/__dev/guardar-icono' && req.method === 'POST') {
      // Solo para regenerar los iconos PNG desde el SVG con el lienzo del navegador.
      const trozos = [];
      for await (const t of req) trozos.push(t);
      const { archivo, base64 } = JSON.parse(Buffer.concat(trozos).toString());
      if (!/^[a-z0-9-]+\.png$/.test(archivo)) { res.statusCode = 400; return res.end(); }
      fs.writeFileSync(path.join(RAIZ, 'marca', archivo), Buffer.from(base64, 'base64'));
      res.statusCode = 204;
      return res.end();
    }
    if (PRIVADO.test(url.pathname)) { res.statusCode = 404; return res.end('No encontrado'); }
    let ruta = path.join(RAIZ, decodeURIComponent(url.pathname));
    if (!ruta.startsWith(RAIZ)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(ruta) && fs.statSync(ruta).isDirectory()) ruta = path.join(ruta, 'index.html');
    if (!fs.existsSync(ruta)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', TIPOS['.html']);
      return res.end(fs.readFileSync(path.join(RAIZ, '404.html')));
    }
    res.setHeader('Content-Type', TIPOS[path.extname(ruta)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(ruta).pipe(res);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end('Error');
  }
});

servidor.listen(PUERTO, () => console.log(`Servidor local en http://localhost:${PUERTO}`));
