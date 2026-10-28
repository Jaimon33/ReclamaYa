// Subida, borrado, orden y tipo de los documentos del cliente.
// Los archivos se envían en trozos de hasta 3 MB (límite de tamaño por petición del alojamiento).
import { LIMITES, RETENCION, CUPOS } from './_config.js';
import { guardarBinario, leerBinario, borrarBinario } from './_almacen.js';
import {
  enviar, leerCuerpo, leerCuerpoJSON, ipCliente, dentroDeCupo, generarId, resumen,
  expedienteAutorizado, guardarExpediente, credenciales, noAutorizado
} from './_seguridad.js';
import { validarArchivo, nombreSeguro } from './_archivos.js';
import { vistaPublica, TIPOS_DOCUMENTO } from './_expediente.js';
import { registrar } from './_metricas.js';
import { anularPagoPendiente } from './_pago.js';

export const config = { api: { bodyParser: false } };

const TAMANO_PARTE = 3 * 1024 * 1024;
const RE_SUBIDA = /^[A-Za-z0-9-]{8,40}$/;

function invalidarResumen(exp) {
  delete exp.resumen;
  delete exp.calculo;
}

async function subirParte(req, res, exp) {
  const subida = String(req.headers['x-subida'] || '');
  const parte = Number(req.headers['x-parte']);
  const partes = Number(req.headers['x-partes']);
  const maxPartes = Math.ceil(LIMITES.maxBytesArchivo / TAMANO_PARTE);
  if (!RE_SUBIDA.test(subida) || !Number.isInteger(parte) || !Number.isInteger(partes) || partes < 1 || partes > maxPartes || parte < 0 || parte >= partes) {
    return enviar(res, 400, { error: `El archivo supera el tamaño máximo de ${Math.round(LIMITES.maxBytesArchivo / 1048576)} MB.` });
  }
  if (exp.documentos.length >= LIMITES.maxArchivos) return enviar(res, 409, { error: `Puedes añadir como máximo ${LIMITES.maxArchivos} archivos.` });

  const buf = await leerCuerpo(req, TAMANO_PARTE + 1024);
  const base = `subida:${exp.id}:${subida}`;
  await guardarBinario(`${base}:${parte}`, buf, RETENCION.tramiteSubida);
  if (parte < partes - 1) return enviar(res, 202, { recibido: parte });

  const trozos = [];
  for (let i = 0; i < partes; i++) {
    const t = await leerBinario(`${base}:${i}`);
    if (!t) return enviar(res, 409, { error: 'La subida se interrumpió. Vuelve a intentarlo.' });
    trozos.push(t);
  }
  for (let i = 0; i < partes; i++) await borrarBinario(`${base}:${i}`).catch(() => {});
  const archivo = Buffer.concat(trozos);
  let nombre = 'documento';
  try {
    nombre = nombreSeguro(decodeURIComponent(String(req.headers['x-nombre'] || 'documento')));
  } catch { /* nombre por defecto */ }

  let info;
  try {
    info = await validarArchivo(archivo, nombre);
  } catch (e) {
    if (!e.usuario) console.error('Validación de archivo:', e.message);
    await registrar('error_anexo', exp.evaluacion?.producto);
    return enviar(res, 422, { error: e.usuario ? e.message : 'No hemos podido procesar este archivo.' });
  }
  const sha256 = resumen(archivo);
  if (exp.documentos.some(d => d.sha256 === sha256)) return enviar(res, 409, { error: `"${nombre}" ya está añadido.` });
  const bytesTotales = exp.documentos.reduce((s, d) => s + d.bytes, 0) + archivo.length;
  if (bytesTotales > LIMITES.maxBytesTotal) return enviar(res, 409, { error: `Entre todos los archivos superas ${Math.round(LIMITES.maxBytesTotal / 1048576)} MB. Quita alguno o sube solo las páginas necesarias.` });
  const paginasTotales = exp.documentos.reduce((s, d) => s + d.paginas, 0) + info.paginas;
  if (paginasTotales > LIMITES.maxPaginasTotal) return enviar(res, 409, { error: `Entre todos los archivos superas ${LIMITES.maxPaginasTotal} páginas. Sube solo las páginas necesarias.` });

  const tipoDoc = Object.keys(TIPOS_DOCUMENTO).includes(req.headers['x-tipo-doc']) ? req.headers['x-tipo-doc'] : 'otro';
  const doc = {
    id: generarId(), nombre, tipo: info.tipo, bytes: archivo.length, paginas: info.paginas,
    sha256, tipoDoc, subido: new Date().toISOString(), extraccion: null, extraccionEstado: 'pendiente'
  };
  await guardarBinario(`doc:${exp.id}:${doc.id}`, archivo, RETENCION.borrador);
  exp.documentos.push(doc);
  invalidarResumen(exp);
  await guardarExpediente(exp);
  return enviar(res, 201, { documento: doc.id, vista: vistaPublica(exp) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return enviar(res, 405, { error: 'Método no permitido' });
  try {
    const esJSON = String(req.headers['content-type'] || '').includes('application/json');
    const cuerpo = esJSON ? await leerCuerpoJSON(req, 20000) : {};
    const { id, clave } = credenciales(req, cuerpo);
    const exp = await expedienteAutorizado(id, clave);
    if (!exp) return noAutorizado(res);
    if (exp.estado !== 'borrador') return enviar(res, 409, { error: 'Este expediente ya está pagado y no se puede modificar.' });
    try {
      await anularPagoPendiente(exp);
    } catch (e) {
      if (e.pagado) return enviar(res, 409, { error: e.message, estado: 'pagado' });
      throw e;
    }

    if (!esJSON) {
      if (!(await dentroDeCupo('subida', ipCliente(req), CUPOS.subidasPorIpHora, 3600))) {
        return enviar(res, 429, { error: 'Demasiadas subidas seguidas. Espera un rato.' });
      }
      return await subirParte(req, res, exp);
    }

    const doc = exp.documentos.find(d => d.id === cuerpo.documento);
    switch (cuerpo.accion) {
      case 'eliminar':
        if (!doc) return enviar(res, 404, { error: 'Documento no encontrado' });
        await borrarBinario(`doc:${exp.id}:${doc.id}`).catch(() => {});
        exp.documentos = exp.documentos.filter(d => d.id !== doc.id);
        if (exp.datos?.facturas) exp.datos.facturas = exp.datos.facturas.filter(f => f.documento !== doc.id);
        break;
      case 'tipo':
        if (!doc || !Object.keys(TIPOS_DOCUMENTO).includes(cuerpo.tipoDoc)) return enviar(res, 400, { error: 'Tipo no válido' });
        doc.tipoDoc = cuerpo.tipoDoc;
        break;
      case 'ordenar': {
        const orden = Array.isArray(cuerpo.orden) ? cuerpo.orden : [];
        if (orden.length !== exp.documentos.length || !exp.documentos.every(d => orden.includes(d.id))) return enviar(res, 400, { error: 'Orden no válido' });
        exp.documentos.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id));
        break;
      }
      default:
        return enviar(res, 400, { error: 'Acción no válida' });
    }
    invalidarResumen(exp);
    await guardarExpediente(exp);
    return enviar(res, 200, { vista: vistaPublica(exp) });
  } catch (error) {
    if (error.estado === 413) return enviar(res, 413, { error: 'Este trozo del archivo es demasiado grande.' });
    console.error('Error en documentos:', error.message);
    return enviar(res, 500, { error: 'Ha fallado algo al guardar el archivo. Inténtalo de nuevo.' });
  }
}
