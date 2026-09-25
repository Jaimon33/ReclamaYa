import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_ANEXOS = 10;
// Límite en caracteres base64 (~3 MB de archivos) para no superar los 4,5 MB por petición de Vercel.
export const MAX_CARACTERES_ANEXOS = 4200000;
// Upstash limita el tamaño de cada petición, así que cada archivo se guarda en trozos.
const TAMANO_TROZO = 700000;

const A4 = [595.28, 841.89];
const AZUL = rgb(13 / 255, 27 / 255, 42 / 255);
const GRIS = rgb(0.45, 0.45, 0.45);

async function comando(args) {
  const resp = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(`Redis ${args[0]} falló: ${data.error || resp.status}`);
  return data.result;
}

export function esAnexable(documento) {
  return documento && (documento.tipo === 'pdf' || documento.tipo === 'imagen');
}

export function validarAnexos(anexos) {
  if (!Array.isArray(anexos)) return [];
  const validos = anexos
    .filter(a => a && TIPOS_PERMITIDOS.includes(a.mediaType) && typeof a.data === 'string' && a.data.length > 0)
    .slice(0, MAX_ANEXOS)
    .map(a => ({ nombre: String(a.nombre || 'documento').slice(0, 120), mediaType: a.mediaType, data: a.data }));
  const total = validos.reduce((suma, a) => suma + a.data.length, 0);
  if (total > MAX_CARACTERES_ANEXOS) throw new Error('Los documentos adjuntos superan el tamaño máximo');
  return validos;
}

async function leerIndice(tempId) {
  const raw = await comando(['GET', `${tempId}:anexos`]);
  return raw ? JSON.parse(raw) : [];
}

function clavesDe(tempId, indice) {
  const claves = [`${tempId}:anexos`];
  indice.forEach((meta, i) => {
    for (let j = 0; j < meta.partes; j++) claves.push(`${tempId}:anexo:${i}:${j}`);
  });
  return claves;
}

export async function guardarAnexos(tempId, anexos, segundos) {
  const indice = [];
  for (const [i, anexo] of anexos.entries()) {
    const partes = Math.ceil(anexo.data.length / TAMANO_TROZO);
    for (let j = 0; j < partes; j++) {
      const trozo = anexo.data.slice(j * TAMANO_TROZO, (j + 1) * TAMANO_TROZO);
      await comando(['SET', `${tempId}:anexo:${i}:${j}`, trozo, 'EX', String(segundos)]);
    }
    indice.push({ nombre: anexo.nombre, mediaType: anexo.mediaType, partes });
  }
  await comando(['SET', `${tempId}:anexos`, JSON.stringify(indice), 'EX', String(segundos)]);
}

export async function obtenerAnexos(tempId) {
  const indice = await leerIndice(tempId);
  const anexos = [];
  for (const [i, meta] of indice.entries()) {
    let data = '';
    for (let j = 0; j < meta.partes; j++) {
      const trozo = await comando(['GET', `${tempId}:anexo:${i}:${j}`]);
      if (trozo == null) throw new Error(`Falta un fragmento del documento nº ${i + 1}`);
      data += trozo;
    }
    anexos.push({ nombre: meta.nombre, mediaType: meta.mediaType, data });
  }
  return anexos;
}

export async function borrarAnexos(tempId) {
  const indice = await leerIndice(tempId);
  for (const clave of clavesDe(tempId, indice)) await comando(['DEL', clave]);
}

export async function prolongarAnexos(tempId, segundos) {
  const indice = await leerIndice(tempId);
  for (const clave of clavesDe(tempId, indice)) await comando(['EXPIRE', clave, String(segundos)]);
}

// Las fuentes estándar de PDF solo admiten caracteres latinos; el resto se elimina del rótulo.
function textoImprimible(texto) {
  return String(texto).normalize('NFC').replace(/[^\x20-\x7E -ÿ–—‘’“”…€]/g, '').trim() || 'documento';
}

function escribirCentrado(pagina, texto, fuente, tamano, y, color) {
  const ancho = fuente.widthOfTextAtSize(texto, tamano);
  pagina.drawText(texto, { x: (pagina.getWidth() - ancho) / 2, y, size: tamano, font: fuente, color });
}

function recortarAlAncho(texto, fuente, tamano, anchoMax) {
  if (fuente.widthOfTextAtSize(texto, tamano) <= anchoMax) return texto;
  let recortado = texto;
  while (recortado.length > 4 && fuente.widthOfTextAtSize(`${recortado}…`, tamano) > anchoMax) {
    recortado = recortado.slice(0, -1);
  }
  return `${recortado}…`;
}

function anadirPortada(doc, fuentes, numero, nombre, refExpediente) {
  const pagina = doc.addPage(A4);
  const { width, height } = pagina.getSize();
  pagina.drawRectangle({ x: 60, y: height - 64, width: width - 120, height: 4, color: AZUL });
  escribirCentrado(pagina, textoImprimible(`Anexo al escrito · Ref. expediente ${refExpediente}`), fuentes.normal, 10, height / 2 + 60, GRIS);
  escribirCentrado(pagina, `DOCUMENTO Nº ${numero}`, fuentes.negrita, 30, height / 2, AZUL);
  const nombreVisible = recortarAlAncho(textoImprimible(nombre), fuentes.normal, 12, width - 140);
  escribirCentrado(pagina, nombreVisible, fuentes.normal, 12, height / 2 - 34, GRIS);
}

async function anadirImagen(doc, fuentes, numero, anexo, bytes) {
  const imagen = anexo.mediaType === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  const pagina = doc.addPage(A4);
  const { width, height } = pagina.getSize();
  const margen = 50;
  const titulo = recortarAlAncho(textoImprimible(`DOCUMENTO Nº ${numero} · ${anexo.nombre}`), fuentes.negrita, 11, width - margen * 2);
  pagina.drawText(titulo, { x: margen, y: height - margen, size: 11, font: fuentes.negrita, color: AZUL });
  const altoDisponible = height - margen * 2 - 24;
  const anchoDisponible = width - margen * 2;
  const escala = Math.min(anchoDisponible / imagen.width, altoDisponible / imagen.height, 1);
  const ancho = imagen.width * escala;
  const alto = imagen.height * escala;
  pagina.drawImage(imagen, {
    x: (width - ancho) / 2,
    y: margen + (altoDisponible - alto) / 2,
    width: ancho,
    height: alto
  });
}

// Añade cada documento del cliente tras el escrito, sin alterar sus páginas originales.
// Los que no se pueden unir (PDF protegidos o dañados) se devuelven para enviarlos aparte.
export async function unirAnexos(pdfEscritoBase64, anexos, refExpediente) {
  const doc = await PDFDocument.load(Buffer.from(pdfEscritoBase64, 'base64'));
  const fuentes = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold)
  };
  const noUnidos = [];

  for (const [i, anexo] of anexos.entries()) {
    const numero = i + 1;
    const bytes = Buffer.from(anexo.data, 'base64');
    try {
      if (anexo.mediaType === 'application/pdf') {
        const origen = await PDFDocument.load(bytes);
        const paginas = await doc.copyPages(origen, origen.getPageIndices());
        anadirPortada(doc, fuentes, numero, anexo.nombre, refExpediente);
        paginas.forEach(pagina => doc.addPage(pagina));
      } else {
        await anadirImagen(doc, fuentes, numero, anexo, bytes);
      }
    } catch (error) {
      noUnidos.push({ ...anexo, numero, motivo: error.message });
    }
  }

  return { pdfBase64: Buffer.from(await doc.save()).toString('base64'), noUnidos };
}
