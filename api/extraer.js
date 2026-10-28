// Lee un documento con IA y devuelve la propuesta de datos actualizada para que el cliente la confirme.
import { CUPOS } from './_config.js';
import { leerBinario } from './_almacen.js';
import {
  enviar, leerCuerpoJSON, ipCliente, dentroDeCupo, expedienteAutorizado, guardarExpediente, credenciales, noAutorizado
} from './_seguridad.js';
import { extraccionDisponible, extraerDocumento, limpiarExtraccion } from './_extraccion.js';
import { vistaPublica } from './_expediente.js';
import { registrar } from './_metricas.js';

const TIPO_SUGERIDO = { factura: 'factura', prueba_baja: 'prueba_baja', reclamacion: 'reclamacion', respuesta_operador: 'respuesta_operador', contrato: 'contrato' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return enviar(res, 405, { error: 'Método no permitido' });
  try {
    const cuerpo = await leerCuerpoJSON(req, 5000);
    const { id, clave } = credenciales(req, cuerpo);
    const exp = await expedienteAutorizado(id, clave);
    if (!exp) return noAutorizado(res);
    if (exp.estado !== 'borrador') return enviar(res, 409, { error: 'Este expediente ya está pagado.' });
    const doc = exp.documentos.find(d => d.id === cuerpo.documento);
    if (!doc) return enviar(res, 404, { error: 'Documento no encontrado' });
    if (doc.extraccion) return enviar(res, 200, { vista: vistaPublica(exp) });

    if (!extraccionDisponible()) {
      doc.extraccionEstado = 'no_disponible';
      await guardarExpediente(exp);
      return enviar(res, 200, { vista: vistaPublica(exp), aviso: 'La lectura automática no está disponible ahora. Escribe los datos tú mismo; es rápido.' });
    }
    if (exp.extracciones >= CUPOS.extraccionesPorExpediente || !(await dentroDeCupo('extraer', ipCliente(req), CUPOS.extraccionesPorIpDia, 86400))) {
      doc.extraccionEstado = 'no_disponible';
      await guardarExpediente(exp);
      return enviar(res, 200, { vista: vistaPublica(exp), aviso: 'Has alcanzado el máximo de lecturas automáticas. Escribe los datos que falten.' });
    }

    const bytes = await leerBinario(`doc:${exp.id}:${doc.id}`);
    if (!bytes) return enviar(res, 410, { error: 'El archivo ha caducado. Vuelve a subirlo.' });
    exp.extracciones = (exp.extracciones || 0) + 1;
    try {
      const bruto = await extraerDocumento(bytes, doc.tipo);
      doc.extraccion = limpiarExtraccion(bruto, doc.paginas);
      doc.extraccionEstado = 'hecha';
      // Si el cliente no eligió tipo, se sugiere el que se ha detectado; puede cambiarlo.
      if (doc.tipoDoc === 'otro' && TIPO_SUGERIDO[doc.extraccion.tipoDocumento]) doc.tipoDoc = TIPO_SUGERIDO[doc.extraccion.tipoDocumento];
    } catch (e) {
      console.error('Extracción fallida:', e.message);
      doc.extraccionEstado = 'error';
      await registrar('error_extraccion', exp.evaluacion?.producto);
    }
    // Re-leer por si mientras tanto se subió o borró otro documento.
    const actual = await expedienteAutorizado(id, clave);
    if (!actual) return noAutorizado(res);
    const destino = actual.documentos.find(d => d.id === doc.id);
    if (destino) {
      destino.extraccion = doc.extraccion;
      destino.extraccionEstado = doc.extraccionEstado;
      destino.tipoDoc = doc.tipoDoc;
    }
    actual.extracciones = exp.extracciones;
    await guardarExpediente(actual);
    return enviar(res, 200, {
      vista: vistaPublica(actual),
      aviso: doc.extraccionEstado === 'error' ? `No hemos podido leer "${doc.nombre}" automáticamente. Escribe los datos tú mismo.` : undefined
    });
  } catch (error) {
    console.error('Error en extraer:', error.message);
    return enviar(res, 500, { error: 'Ha fallado la lectura. Puedes escribir los datos tú mismo.' });
  }
}
