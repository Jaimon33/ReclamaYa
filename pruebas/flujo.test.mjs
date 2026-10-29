// Prueba de extremo a extremo contra el servidor local: recorridos A y B, protección del escrito
// antes del pago, avisos de Stripe firmados (válidos, duplicados, manipulados) y acceso entre expedientes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import Stripe from 'stripe';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const PUERTO = 5099;
const URL_BASE = `http://localhost:${PUERTO}`;
const SECRETO = 'whsec_local_pruebas';
const SALIDA = process.env.SALIDA_PRUEBAS || path.join(process.cwd(), 'pruebas', 'salida');
let servidor;
const respuestasAntesDelPago = [];

before(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const entorno = { ...process.env, PORT: String(PUERTO), STRIPE_WEBHOOK_SECRET: SECRETO };
  for (const v of ['KV_REST_API_URL', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'ANTHROPIC_API_KEY', 'VERCEL']) delete entorno[v];
  servidor = spawn(process.execPath, ['scripts/servidor-local.mjs'], { env: entorno, stdio: ['ignore', 'pipe', 'pipe'] });
  servidor.stderr.on('data', d => process.stderr.write(`[servidor] ${d}`));
  await new Promise((ok) => servidor.stdout.on('data', d => String(d).includes('Servidor local') && ok()));
});

after(() => servidor?.kill());

async function api(ruta, cuerpo, { guardar = true } = {}) {
  const r = await fetch(`${URL_BASE}/api/${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const texto = await r.text();
  if (guardar) respuestasAntesDelPago.push(texto);
  return { estado: r.status, datos: texto ? JSON.parse(texto) : {} };
}

async function subir(cred, nombre, bytes, tipoDoc) {
  const r = await fetch(`${URL_BASE}/api/documentos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream', 'x-expediente': cred.expediente, 'x-clave': cred.clave,
      'x-subida': `prueba-${Math.random().toString(36).slice(2, 10)}`, 'x-parte': '0', 'x-partes': '1',
      'x-nombre': encodeURIComponent(nombre), 'x-tipo-doc': tipoDoc
    },
    body: bytes
  });
  const texto = await r.text();
  respuestasAntesDelPago.push(texto);
  return { estado: r.status, datos: JSON.parse(texto) };
}

async function pdfDePrueba(lineas, paginas = 1) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < paginas; p++) {
    const pg = doc.addPage([595, 842]);
    lineas.forEach((l, i) => pg.drawText(`${l}${p ? ` (pág. ${p + 1})` : ''}`, { x: 50, y: 780 - i * 18, size: 12, font: f }));
  }
  return Buffer.from(await doc.save());
}

// PNG RGB sin dependencias: rectángulo con bandas para comprobar que no se recorta.
function pngDePrueba(ancho, alto) {
  const crc = (b) => zlib.crc32(b);
  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    const td = Buffer.concat([Buffer.from(tipo), datos]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td) >>> 0);
    return Buffer.concat([largo, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4); ihdr[8] = 8; ihdr[9] = 2;
  const filas = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3);
    for (let x = 0; x < ancho; x++) {
      const borde = x < 10 || y < 10 || x >= ancho - 10 || y >= alto - 10;
      const v = borde ? 0 : (Math.floor(y / 40) % 2 ? 230 : 255);
      fila[1 + x * 3] = v; fila[2 + x * 3] = borde ? 0 : v; fila[3 + x * 3] = borde ? 180 : v;
    }
    filas.push(fila);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(Buffer.concat(filas))), trozo('IEND', Buffer.alloc(0))
  ]);
}

async function avisoStripe(sesion, idEvento = `evt_${Math.random().toString(36).slice(2)}`, secreto = SECRETO) {
  const cuerpo = JSON.stringify({ id: idEvento, object: 'event', type: 'checkout.session.completed', data: { object: sesion } });
  const firma = Stripe.webhooks.generateTestHeaderString({ payload: cuerpo, secret: secreto });
  const r = await fetch(`${URL_BASE}/api/webhook`, { method: 'POST', headers: { 'stripe-signature': firma, 'Content-Type': 'application/json' }, body: cuerpo });
  return { estado: r.status, datos: await r.json() };
}

function sesionPara(cred, producto, importe) {
  return {
    id: `cs_simulada_${cred.expediente}`, object: 'checkout.session', mode: 'payment', payment_status: 'paid',
    currency: 'eur', amount_total: importe, client_reference_id: cred.expediente,
    metadata: { expediente: cred.expediente, producto }, payment_intent: 'pi_prueba', customer_details: { email: 'cliente@example.com' }
  };
}

async function descargar(cuerpo, archivo) {
  const { estado, datos } = await api('descargar', { ...cuerpo, archivo }, { guardar: false });
  if (estado !== 200) return { estado };
  const r = await fetch(`${URL_BASE}${datos.url}`);
  return { estado: r.status, bytes: Buffer.from(await r.arrayBuffer()), url: datos.url };
}

const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
const dias = (n) => { const d = new Date(`${HOY}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const respuestasA = { tipoTitular: 'persona', operador: 'Vodafone', caso: 'primera' };

const credA = {};
const credB = {};

test('comprobación sin datos personales y sin guardar nada', async () => {
  const r = await api('expediente', { accion: 'evaluar', respuestas: { ...respuestasA, caso: '' } });
  assert.equal(r.estado, 200);
  assert.equal(r.datos.evaluacion.estado, 'incompleto');
  const excl = await api('expediente', { accion: 'crear', respuestas: { ...respuestasA, operador: '' } });
  assert.equal(excl.estado, 409);
  assert.equal(excl.datos.expediente, undefined);
});

test('recorrido A completo: documentos, confirmación, pago y entrega', async () => {
  const c = await api('expediente', { accion: 'crear', respuestas: respuestasA });
  assert.equal(c.estado, 201);
  Object.assign(credA, { expediente: c.datos.expediente, clave: c.datos.clave });

  const factura = await pdfDePrueba(['VODAFONE ESPAÑA S.A.U.', 'Factura nº FV-0001', `Periodo ${dias(-40)} a ${dias(-11)}`, 'Total 36,30 €'], 2);
  const s1 = await subir(credA, 'factura octubre.pdf', factura, 'factura');
  assert.equal(s1.estado, 201, JSON.stringify(s1.datos));
  const s2 = await subir(credA, 'captura baja.png', pngDePrueba(900, 1600), 'prueba_baja');
  assert.equal(s2.estado, 201, JSON.stringify(s2.datos));
  const falso = await subir(credA, 'malicioso.pdf', Buffer.from('<html><script>alert(1)</script></html>'), 'otro');
  assert.equal(falso.estado, 422);
  const repetido = await subir(credA, 'otra vez.pdf', factura, 'factura');
  assert.equal(repetido.estado, 409);

  const docs = s2.datos.vista.documentos;
  assert.equal(docs.length, 2);
  const ex = await api('extraer', { ...credA, documento: docs[0].id });
  assert.equal(ex.estado, 200);
  assert.match(ex.datos.aviso, /no está disponible/);

  const datos = {
    titular: { nombre: 'Lucía Martín Pérez', documento: '12345678A', localidad: 'Madrid' },
    resumenCaso: 'Pedí la baja por teléfono y me siguen cobrando la fibra.', numeroCliente: 'C-998877', lineas: '910000000', fechas: {},
    facturas: [{ documento: docs[0].id, numero: 'FV-0001', fechaEmision: dias(-10), periodoDesde: dias(-40), periodoHasta: dias(-11), importeTotal: 36.3, importeServicio: 36.3 }]
  };
  const malo = await api('expediente', { accion: 'confirmar', ...credA, datos });
  assert.equal(malo.estado, 422);
  assert.ok(malo.datos.errores.some(e => e.includes('DNI')));
  datos.titular.documento = '12345678Z';
  datos.fechas.solicitud = dias(-60);
  const ok = await api('expediente', { accion: 'confirmar', ...credA, datos });
  assert.equal(ok.estado, 200, JSON.stringify(ok.datos));
  assert.ok(ok.datos.vista.resumen.total > 0);

  const sinAceptar = await api('checkout', { ...credA });
  assert.equal(sinAceptar.estado, 400);
  const sinEmail = await api('checkout', { ...credA, aceptaCondiciones: true, ejecucionInmediata: true });
  assert.equal(sinEmail.estado, 400, 'sin email no se abre el pago');
  const pago = await api('checkout', { ...credA, email: 'lucia@example.com', aceptaCondiciones: true, ejecucionInmediata: true });
  assert.equal(pago.estado, 200, JSON.stringify(pago.datos));
  assert.match(pago.datos.url, /__dev\/pagar/);

  const antes = await api('estado', credA);
  assert.equal(antes.datos.estado, 'esperando_pago');
  assert.deepEqual(antes.datos.archivos, []);
  assert.equal((await api('descargar', { ...credA, archivo: 'reclamacion' })).estado, 409);

  // Nada de lo enviado al navegador antes del pago contiene el texto del escrito.
  const todo = respuestasAntesDelPago.join('\n');
  for (const marca of ['se abstendrá de facturar', 'Solicito', 'Fundamentos', 'presento esta reclamación', '%PDF']) {
    assert.ok(!todo.includes(marca), `Se ha filtrado "${marca}" antes del pago`);
  }

  // Firma manipulada, importe incorrecto y sesión ajena: no se entrega.
  assert.equal((await avisoStripe(sesionPara(credA, 'operador', 1399), 'evt_x', 'whsec_otro')).estado, 400);
  assert.equal((await avisoStripe(sesionPara(credA, 'operador', 100))).estado, 200);
  assert.equal((await avisoStripe({ ...sesionPara(credA, 'operador', 1399), id: 'cs_otra' })).estado, 200);
  assert.equal((await api('estado', credA)).datos.estado, 'esperando_pago');

  const primero = await avisoStripe(sesionPara(credA, 'operador', 1399), 'evt_pago_a');
  assert.equal(primero.estado, 200, JSON.stringify(primero.datos));
  const repetidoAviso = await avisoStripe(sesionPara(credA, 'operador', 1399), 'evt_pago_a');
  assert.equal(repetidoAviso.datos.repetido, true);
  const tardio = await avisoStripe(sesionPara(credA, 'operador', 1399), 'evt_pago_a_bis');
  assert.equal(tardio.estado, 200);

  const despues = await api('estado', credA, { guardar: false });
  assert.equal(despues.datos.estado, 'entregado');
  assert.deepEqual(despues.datos.archivos.map(a => a.codigo), ['reclamacion', 'guia', 'confirmacion', 'factura']);
  assert.equal(despues.datos.email, 'l•••@example.com', 'se usa el email escrito antes de pagar');

  const d = await descargar(credA, 'reclamacion');
  assert.equal(d.estado, 200);
  assert.equal(d.bytes.subarray(0, 5).toString(), '%PDF-');
  fs.writeFileSync(path.join(SALIDA, 'A-reclamacion.pdf'), d.bytes);
  const pdf = await PDFDocument.load(d.bytes);
  // Escrito (1-2 págs.) + separador + 2 págs. de factura + separador + imagen.
  assert.ok(pdf.getPageCount() >= 6, `páginas: ${pdf.getPageCount()}`);
  assert.equal((await fetch(`${URL_BASE}${d.url}`)).status, 410, 'el billete es de un solo uso');
  for (const a of ['guia', 'confirmacion', 'factura']) fs.writeFileSync(path.join(SALIDA, `A-${a}.pdf`), (await descargar(credA, a)).bytes);

  assert.equal((await api('expediente', { accion: 'confirmar', ...credA, datos }, { guardar: false })).estado, 409);
});

test('recorrido B: expediente para la Oficina con formulario oficial', async () => {
  const respuestasB = { ...respuestasA, tipoTitular: 'empresa', caso: 'segunda' };
  const c = await api('expediente', { accion: 'crear', respuestas: respuestasB });
  assert.equal(c.estado, 201, JSON.stringify(c.datos));
  assert.equal(c.datos.vista.evaluacion.estado, 'B');
  Object.assign(credB, { expediente: c.datos.expediente, clave: c.datos.clave });

  const f = await subir(credB, 'factura.pdf', await pdfDePrueba(['Factura FV-0002', 'Total 29,99 €']), 'factura');
  await subir(credB, 'email baja.pdf', await pdfDePrueba(['Confirmamos su solicitud de baja', 'Ref. BAJA-123']), 'prueba_baja');
  await subir(credB, 'reclamacion.pdf', await pdfDePrueba(['Reclamación nº REC-555']), 'reclamacion');
  const idFactura = f.datos.documento;

  const datos = {
    fechas: { solicitud: dias(-60), reclamacion: dias(-45) },
    titular: { nombre: 'Telecomunicaciones Ejemplo SL', documento: 'B12345674', firmante: 'Pedro Gómez Ruiz', domicilio: 'Calle Mayor 1, 2º A', cp: '28013', localidad: 'Madrid', provincia: 'Madrid' },
    canalBaja: 'web', bajaReferencia: 'BAJA-123', reclamacionReferencia: 'REC-555', lineas: '600111222',
    facturas: [{ documento: idFactura, numero: 'FV-0002', fechaEmision: dias(-50), periodoDesde: dias(-55), periodoHasta: dias(-26), importeTotal: 29.99, importeServicio: 29.99 }]
  };
  const ok = await api('expediente', { accion: 'confirmar', ...credB, datos });
  assert.equal(ok.estado, 200, JSON.stringify(ok.datos));
  const pago = await api('checkout', { ...credB, email: 'pedro@example.com', aceptaCondiciones: true, ejecucionInmediata: true });
  assert.equal(pago.estado, 200, JSON.stringify(pago.datos));

  // Las credenciales de B no sirven para A ni al revés.
  assert.equal((await api('estado', { expediente: credA.expediente, clave: credB.clave }, { guardar: false })).estado, 404);
  assert.equal((await api('descargar', { expediente: credA.expediente, clave: credB.clave, archivo: 'reclamacion' }, { guardar: false })).estado, 404);

  assert.equal((await avisoStripe(sesionPara(credB, 'oaut', 1399))).estado, 200); // importe del otro producto
  assert.equal((await api('estado', credB)).datos.estado, 'esperando_pago');
  assert.equal((await avisoStripe(sesionPara(credB, 'oaut', 2990), 'evt_pago_b')).estado, 200);

  const e = await api('estado', credB, { guardar: false });
  assert.equal(e.datos.estado, 'entregado');
  assert.deepEqual(e.datos.archivos.map(a => a.codigo), ['expediente', 'formulario', 'explicacion', 'guia', 'confirmacion', 'factura']);
  assert.equal(e.datos.anexos.length, 3);

  const exp = await descargar(credB, 'expediente');
  fs.writeFileSync(path.join(SALIDA, 'B-expediente.pdf'), exp.bytes);
  const form = (await PDFDocument.load(exp.bytes)).getForm();
  assert.equal(form.getTextField('NIFNIE').getText(), 'B12345674');
  assert.equal(form.getTextField('Representante NIF/NIE').getText() ?? '', '');
  assert.equal(form.getTextField('Representante Nombre y Apellidos').getText(), 'Pedro Gómez Ruiz');
  assert.equal(form.getRadioGroup('Group1').getSelected(), 'Opción3');
  assert.equal(form.getCheckBox('anexo coincide').isChecked(), false, 'la declaración la marca el reclamante');
  assert.match(form.getTextField('Pretensiones del solicitante devolución tramitar baja').getText(), /devolución de/);
  for (const a of ['formulario', 'explicacion', 'guia', 'anexo-1']) {
    const r = await descargar(credB, a);
    assert.equal(r.estado, 200, a);
    fs.writeFileSync(path.join(SALIDA, `B-${a}.pdf`), r.bytes);
  }
});
