// Genera el ejemplo público con datos ficticios, usando el mismo generador que los pedidos reales.
// Cada página lleva la marca "EJEMPLO FICTICIO". Uso: node scripts/generar-ejemplo.mjs
import fs from 'node:fs';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { generarEntregables, prepararAnexos } from '../api/_entregables.js';
import { evaluarCaso, calcularImportes } from '../api/_reglas.js';

async function pdfFicticio(lineas) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const p = doc.addPage([595, 842]);
  p.drawText('OPERADORA EJEMPLO, S.A. (empresa ficticia)', { x: 50, y: 780, size: 13, font: b });
  lineas.forEach((l, i) => p.drawText(l, { x: 50, y: 740 - i * 20, size: 11, font: f }));
  return Buffer.from(await doc.save());
}

async function marcarEjemplo(bytes) {
  const doc = await PDFDocument.load(bytes);
  const f = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    p.drawText('EJEMPLO FICTICIO', { x: width / 2 - 190, y: height / 2 - 120, size: 52, font: f, color: rgb(0.8, 0.15, 0.1), opacity: 0.18, rotate: degrees(35) });
  }
  return Buffer.from(await doc.save());
}

const respuestas = {
  titular: 'si', tipoTitular: 'particular', operador: 'Otro', operadorOtro: 'Operadora Ejemplo', servicio: 'fibra',
  viaBaja: 'operador', pruebaBaja: 'referencia', fechaSolicitud: '2026-06-03', fechaDeseada: '',
  conceptos: ['cuota'], situaciones: [], reclamado: 'no', fechaPrimeraFactura: '2026-06-08'
};
const evaluacion = evaluarCaso(respuestas, '2026-07-06');
const facturaJunio = await pdfFicticio(['Factura n.º F-EJ-0601 · Emitida el 08/06/2026', 'Periodo: 01/06/2026 a 30/06/2026', 'Cuota fibra 600 Mb ........ 30,00 €', 'IVA 21 % .................. 6,30 €', 'Total ..................... 36,30 €']);
const facturaJulio = await pdfFicticio(['Factura n.º F-EJ-0701 · Emitida el 01/07/2026', 'Periodo: 01/07/2026 a 31/07/2026', 'Cuota fibra 600 Mb ........ 30,00 €', 'IVA 21 % .................. 6,30 €', 'Total ..................... 36,30 €']);
const sms = await pdfFicticio(['Captura del SMS recibido el 03/06/2026:', '"Hemos registrado tu solicitud de baja.', 'Referencia: BJ-000000. Operadora Ejemplo."']);

const documentos = [
  { id: 'd1', nombre: 'factura-junio.pdf', tipo: 'application/pdf', paginas: 1, tipoDoc: 'factura' },
  { id: 'd2', nombre: 'factura-julio.pdf', tipo: 'application/pdf', paginas: 1, tipoDoc: 'factura' },
  { id: 'd3', nombre: 'sms-baja.pdf', tipo: 'application/pdf', paginas: 1, tipoDoc: 'prueba_baja' }
];
const datos = {
  titular: { nombre: 'Ana Ejemplo Ficticia', documento: '00000000T', email: 'ana@ejemplo.invalid', telefono: '', domicilio: 'Calle Inventada 1', cp: '28000', localidad: 'Madrid', provincia: 'Madrid' },
  numeroCliente: 'CL-000000', lineas: '910 000 000', razonSocialOperador: '', canalBaja: 'telefono', bajaReferencia: 'BJ-000000',
  facturas: [
    { documento: 'd1', numero: 'F-EJ-0601', fechaEmision: '2026-06-08', periodoDesde: '2026-06-01', periodoHasta: '2026-06-30', importeTotal: 36.3, importeServicio: 36.3 },
    { documento: 'd2', numero: 'F-EJ-0701', fechaEmision: '2026-07-01', periodoDesde: '2026-07-01', periodoHasta: '2026-07-31', importeTotal: 36.3, importeServicio: 36.3 }
  ]
};
const exp = {
  referencia: 'R-EJEMPLO', respuestas, evaluacion, documentos, datos, fechaDocumento: '2026-07-06',
  calculo: calcularImportes(datos.facturas, evaluacion.fechas.efectiva),
  pago: { producto: 'operador', importeCentimos: 1399, pagadoEn: '2026-07-06T10:00:00Z' },
  aceptacion: { fecha: '2026-07-06T10:00:00Z', version: 'ejemplo' }
};
const archivos = await generarEntregables(exp, prepararAnexos(exp, [facturaJunio, facturaJulio, sms]));
fs.mkdirSync('ejemplo', { recursive: true });
fs.writeFileSync('ejemplo/ejemplo-reclamacion.pdf', await marcarEjemplo(archivos.find(a => a.codigo === 'reclamacion').bytes));
fs.writeFileSync('ejemplo/ejemplo-guia.pdf', await marcarEjemplo(archivos.find(a => a.codigo === 'guia').bytes));
console.log('Fecha efectiva:', evaluacion.fechas.efectiva, '· Total reclamado:', exp.calculo.total);
