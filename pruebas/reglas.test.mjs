import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fechaEfectivaBaja, sumarMeses, sumarDiasHabiles, evaluarCaso, calcularImportes, validarFactura, euros
} from '../api/_reglas.js';
import { documentoValido } from '../api/_expediente.js';
import { importe, limpiarExtraccion, sugerirImporteServicio } from '../api/_extraccion.js';
import { orientacionJpeg, detectarTipo } from '../api/_archivos.js';

const base = {
  titular: 'si', tipoTitular: 'particular', operador: 'Vodafone', servicio: 'fibra',
  viaBaja: 'operador', pruebaBaja: 'confirmacion', fechaSolicitud: '2026-09-01',
  conceptos: ['cuota'], situaciones: [], reclamado: 'no', fechaPrimeraFactura: '2026-10-05'
};

test('fecha efectiva: dos días hábiles, saltando fin de semana y festivos nacionales', () => {
  assert.equal(fechaEfectivaBaja('2026-10-23'), '2026-10-27'); // viernes -> martes
  assert.equal(fechaEfectivaBaja('2026-12-04'), '2026-12-09'); // 8 de diciembre festivo
  assert.equal(sumarDiasHabiles('2026-04-01', 2), '2026-04-06'); // Viernes Santo 2026 = 3 de abril
  assert.equal(fechaEfectivaBaja('2026-09-01', '2026-09-30'), '2026-09-30'); // fecha pedida posterior
  assert.equal(fechaEfectivaBaja('2026-09-01', '2026-09-02'), '2026-09-03'); // no puede ser antes del mínimo
});

test('plazos en meses de fecha a fecha', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2026-08-15', 3), '2026-11-15');
});

test('recorrido A: primera reclamación', () => {
  const ev = evaluarCaso(base, '2026-10-20');
  assert.equal(ev.estado, 'A');
  assert.equal(ev.producto, 'operador');
  assert.equal(ev.fechas.efectiva, '2026-09-03');
  assert.equal(ev.fechas.limiteReclamarOperador, '2026-11-05');
});

test('aviso si ha pasado más de un mes desde la factura, pero sigue en A', () => {
  const ev = evaluarCaso(base, '2026-11-20');
  assert.equal(ev.estado, 'A');
  assert.ok(ev.avisos.some(a => a.includes('podría no admitir')));
});

test('recorrido B: sin respuesta tras un mes y dentro de los tres meses', () => {
  const ev = evaluarCaso({ ...base, reclamado: 'si', fechaReclamacion: '2026-09-15', pruebaReclamacion: 'referencia', respuesta: 'sin_respuesta' }, '2026-10-28');
  assert.equal(ev.estado, 'B');
  assert.equal(ev.fechas.limiteOaut, '2027-01-15');
});

test('B no disponible aún: el operador está dentro de su mes', () => {
  const ev = evaluarCaso({ ...base, reclamado: 'si', fechaReclamacion: '2026-10-10', pruebaReclamacion: 'referencia', respuesta: 'sin_respuesta' }, '2026-10-28');
  assert.equal(ev.estado, 'incompleto');
  assert.ok(ev.faltan.some(f => f.codigo === 'esperar_respuesta'));
});

test('B con respuesta insatisfactoria y plazo vencido queda excluido', () => {
  const ev = evaluarCaso({ ...base, reclamado: 'si', fechaReclamacion: '2026-05-01', pruebaReclamacion: 'escrito', respuesta: 'insatisfactoria', fechaRespuesta: '2026-05-20' }, '2026-10-28');
  assert.equal(ev.estado, 'excluido');
  assert.ok(ev.excluyen.some(f => f.codigo === 'plazo_oaut_vencido'));
});

test('reclamación previa sin prueba: se reconduce a A', () => {
  const ev = evaluarCaso({ ...base, reclamado: 'si', fechaReclamacion: '2026-09-15', pruebaReclamacion: 'ninguna', respuesta: 'sin_respuesta' }, '2026-10-28');
  assert.equal(ev.estado, 'A');
});

test('exclusiones: portabilidad, empresa, solo permanencia, morosos', () => {
  assert.equal(evaluarCaso({ ...base, viaBaja: 'portabilidad' }, '2026-10-20').estado, 'excluido');
  assert.equal(evaluarCaso({ ...base, tipoTitular: 'empresa' }, '2026-10-20').estado, 'excluido');
  assert.equal(evaluarCaso({ ...base, conceptos: ['permanencia'] }, '2026-10-20').estado, 'excluido');
  assert.equal(evaluarCaso({ ...base, situaciones: ['morosos'] }, '2026-10-20').estado, 'excluido');
});

test('incompleto sin prueba de baja, con explicación útil', () => {
  const ev = evaluarCaso({ ...base, pruebaBaja: 'ninguna' }, '2026-10-20');
  assert.equal(ev.estado, 'incompleto');
  assert.match(ev.faltan.map(f => f.mensaje).join(' '), /número de referencia/);
});

test('solucionado: no hace falta reclamar', () => {
  const ev = evaluarCaso({ ...base, reclamado: 'si', fechaReclamacion: '2026-09-15', pruebaReclamacion: 'referencia', respuesta: 'solucionado' }, '2026-10-28');
  assert.equal(ev.estado, 'nada');
});

test('respuestas no válidas se descartan', () => {
  const ev = evaluarCaso({ ...base, servicio: '<script>', fechaSolicitud: '2026-02-30' }, '2026-10-20');
  assert.equal(ev.estado, 'incompleto');
  assert.equal(ev.respuestas.servicio, '');
  assert.equal(ev.respuestas.fechaSolicitud, '');
});

test('importes: factura emitida tras la baja que cubre días anteriores se prorratea', () => {
  const { lineas, total } = calcularImportes([
    { numero: 'F1', fechaEmision: '2026-09-05', periodoDesde: '2026-08-01', periodoHasta: '2026-08-31', importeServicio: 30 },
    { numero: 'F2', fechaEmision: '2026-09-05', periodoDesde: '2026-09-01', periodoHasta: '2026-09-30', importeServicio: 30 },
    { numero: 'F3', fechaEmision: '2026-10-05', periodoDesde: '2026-10-01', periodoHasta: '2026-10-31', importeServicio: 30 }
  ], '2026-09-03');
  assert.equal(lineas[0].tipo, 'fuera');
  assert.equal(lineas[1].tipo, 'parcial');
  assert.equal(lineas[1].diasReclamables, 27);
  assert.equal(lineas[1].reclamado, 27);
  assert.equal(lineas[2].reclamado, 30);
  assert.equal(total, 57);
});

test('validación de factura', () => {
  assert.deepEqual(validarFactura({ fechaEmision: '2026-10-01', periodoDesde: '2026-10-01', periodoHasta: '2026-10-31', importeServicio: 20, importeTotal: 25 }, '2026-10-28'), []);
  assert.ok(validarFactura({ fechaEmision: '2026-10-01', periodoDesde: '2026-10-31', periodoHasta: '2026-10-01', importeServicio: 20 }, '2026-10-28').length);
  assert.ok(validarFactura({ fechaEmision: '2026-10-01', periodoDesde: '2026-10-01', periodoHasta: '2026-10-31', importeServicio: 30, importeTotal: 25 }, '2026-10-28').length);
});

test('DNI y NIE', () => {
  assert.ok(documentoValido('12345678Z'));
  assert.ok(!documentoValido('12345678A'));
  assert.ok(documentoValido('X1234567L'));
});

test('importes extraídos en formatos españoles', () => {
  assert.equal(importe('1.234,56'), 1234.56);
  assert.equal(importe('39,95 €'), 39.95);
  assert.equal(importe('39.95'), 39.95);
  assert.equal(importe('abc'), null);
  assert.equal(euros(1234.5), '1.234,50 €');
});

test('extracción: se descartan fechas inválidas, páginas inexistentes y se marca texto con instrucciones', () => {
  const x = limpiarExtraccion({
    tipoDocumento: 'factura', legible: true, operador: 'Vodafone', titularDocumento: '12345678-z',
    lineas: ['600000000', '600000000'],
    factura: { numero: 'A1', fechaEmision: '2026-13-01', periodoDesde: '2026-10-01', periodoHasta: '2026-10-31', importeTotal: '36,30', pagina: 9, conceptos: [] },
    baja: {}, reclamacion: {}, respuesta: {}, dudas: [], contieneInstrucciones: true
  }, 2);
  assert.equal(x.factura.fechaEmision, '');
  assert.equal(x.factura.pagina, 0);
  assert.equal(x.factura.importeTotal, 36.3);
  assert.equal(x.titularDocumento, '12345678Z');
  assert.deepEqual(x.lineas, ['600000000']);
  assert.equal(x.contieneInstrucciones, true);
});

test('sugerencia de importe: separa penalizaciones y terminales', () => {
  const s = sugerirImporteServicio({ importeTotal: 60, conceptos: [
    { descripcion: 'Cuota Fibra 600Mb', importe: 30 },
    { descripcion: 'Cuota terminal financiado', importe: 20 }
  ] });
  assert.equal(s.importe, 30);
  assert.ok(s.revisar);
  assert.deepEqual(s.excluidos, ['Cuota terminal financiado']);
  // Conceptos sin IVA y línea de IVA aparte: la cuota se propone con su parte de impuestos.
  const conIva = sugerirImporteServicio({ importeTotal: 54.45, conceptos: [
    { descripcion: 'Cuota Fibra 600Mb + fijo', importe: 30 },
    { descripcion: 'Cuota terminal financiado 12/24', importe: 15 },
    { descripcion: 'IVA 21%', importe: 9.45 }
  ] });
  assert.equal(conIva.importe, 36.3);
});

test('tipos de archivo por contenido y orientación EXIF', () => {
  assert.equal(detectarTipo(Buffer.from('%PDF-1.7\n')), 'application/pdf');
  assert.equal(detectarTipo(Buffer.from('<html>')), null);
  // JPEG mínimo con un segmento EXIF (big endian) que indica orientación 6.
  const tiff = Buffer.from([0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0]);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe1]), Buffer.from([(app1.length + 2) >> 8, (app1.length + 2) & 255]), app1, Buffer.from([0xff, 0xd9])]);
  assert.equal(detectarTipo(jpeg), 'image/jpeg');
  assert.equal(orientacionJpeg(jpeg), 6);
});
