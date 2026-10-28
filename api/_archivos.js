// Validación de archivos por su contenido real, no por la extensión ni el tipo que declara el navegador.
import { PDFDocument } from 'pdf-lib';
import { LIMITES } from './_config.js';

export function detectarTipo(buf) {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  const marca = buf.subarray(4, 12).toString('latin1');
  if (/^ftyp(heic|heix|mif1|msf1|hevc)/.test(marca)) return 'image/heic';
  return null;
}

// Orientación EXIF de un JPEG (1 = normal). Las fotos del móvil suelen venir giradas "en los metadatos".
export function orientacionJpeg(buf) {
  let i = 2;
  while (i + 4 < buf.length) {
    if (buf[i] !== 0xff) return 1;
    const marcador = buf[i + 1];
    const largo = buf.readUInt16BE(i + 2);
    if (marcador === 0xe1 && buf.subarray(i + 4, i + 10).toString('latin1') === 'Exif\0\0') {
      const tiff = i + 10;
      const le = buf.subarray(tiff, tiff + 2).toString('latin1') === 'II';
      const leer16 = (p) => (le ? buf.readUInt16LE(p) : buf.readUInt16BE(p));
      const leer32 = (p) => (le ? buf.readUInt32LE(p) : buf.readUInt32BE(p));
      const ifd = tiff + leer32(tiff + 4);
      const entradas = leer16(ifd);
      for (let e = 0; e < entradas; e++) {
        const p = ifd + 2 + e * 12;
        if (p + 12 > buf.length) break;
        if (leer16(p) === 0x0112) {
          const v = leer16(p + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    if (marcador === 0xda) return 1;
    i += 2 + largo;
  }
  return 1;
}

function errorUsuario(mensaje) {
  const e = new Error(mensaje);
  e.usuario = true;
  return e;
}

// Comprueba que el archivo se puede leer e incorporar al PDF final. Devuelve su tipo y número de páginas.
export async function validarArchivo(buf, nombre) {
  if (!buf.length) throw errorUsuario('El archivo está vacío.');
  if (buf.length > LIMITES.maxBytesArchivo) throw errorUsuario(`El archivo supera el tamaño máximo de ${Math.round(LIMITES.maxBytesArchivo / 1048576)} MB.`);
  const tipo = detectarTipo(buf);
  if (tipo === 'image/heic') {
    throw errorUsuario('Las fotos HEIC de iPhone no se pueden incorporar todavía. Vuelve a elegir la foto desde el botón de subir (el iPhone la convierte a JPG automáticamente) o haz una captura de pantalla.');
  }
  if (!tipo || !LIMITES.formatos.includes(tipo)) {
    throw errorUsuario(`"${nombre}" no es un PDF, JPG ni PNG válido.`);
  }

  if (tipo === 'application/pdf') {
    let doc;
    try {
      doc = await PDFDocument.load(buf, { updateMetadata: false });
    } catch (e) {
      if (/encrypt/i.test(e.message)) throw errorUsuario('Este PDF está protegido con contraseña. Descárgalo de nuevo sin protección desde el área de cliente o haz capturas de las páginas.');
      throw errorUsuario('No hemos podido abrir este PDF. Puede estar dañado: descárgalo de nuevo o haz capturas de las páginas.');
    }
    const paginas = doc.getPageCount();
    if (!paginas) throw errorUsuario('El PDF no tiene páginas.');
    if (paginas > LIMITES.maxPaginasPdf) throw errorUsuario(`El PDF tiene ${paginas} páginas; el máximo es ${LIMITES.maxPaginasPdf}. Sube solo las páginas necesarias.`);
    // Prueba de copia: si falla aquí, fallaría al montar el expediente.
    const prueba = await PDFDocument.create();
    await prueba.copyPages(doc, [0]);
    return { tipo, paginas };
  }

  const prueba = await PDFDocument.create();
  try {
    const img = tipo === 'image/png' ? await prueba.embedPng(buf) : await prueba.embedJpg(buf);
    if (img.width < 200 || img.height < 200) throw errorUsuario('La imagen es demasiado pequeña para leerse bien. Sube una foto o captura más grande.');
  } catch (e) {
    if (e.usuario) throw e;
    throw errorUsuario('No hemos podido leer esta imagen. Prueba a hacer una captura de pantalla o a exportarla de nuevo como JPG.');
  }
  return { tipo, paginas: 1 };
}

export function nombreSeguro(nombre) {
  const limpio = String(nombre || 'documento').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
  return (limpio || 'documento').slice(0, 100);
}
