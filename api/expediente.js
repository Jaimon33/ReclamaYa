// Expediente: comprobar el caso (sin datos personales), crearlo, leerlo, confirmar datos y borrarlo.
import crypto from 'node:crypto';
import { CUPOS, VERSION_PLANTILLAS } from './_config.js';
import { evaluarCaso, limpiarRespuestas } from './_reglas.js';
import { comando, borrarBinario } from './_almacen.js';
import {
  enviar, leerCuerpoJSON, ipCliente, dentroDeCupo, generarId, generarClave, resumen,
  expedienteAutorizado, guardarExpediente, credenciales, noAutorizado, claveExpediente
} from './_seguridad.js';
import { limpiarDatos, validarDatos, vistaPublica, construirResumen } from './_expediente.js';
import { registrar, EVENTOS } from './_metricas.js';
import { anularPagoPendiente } from './_pago.js';

function referencia() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'R-' + Array.from(crypto.randomBytes(8), b => alfabeto[b % alfabeto.length]).join('');
}

function evaluacionPublica(ev) {
  const { respuestas, ...resto } = ev;
  return resto;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return enviar(res, 405, { error: 'Método no permitido' });
  let cuerpo;
  try {
    cuerpo = await leerCuerpoJSON(req, 100000);
  } catch (e) {
    return enviar(res, e.estado || 400, { error: 'Petición no válida' });
  }

  try {
    switch (cuerpo.accion) {
      case 'evaluar': {
        // No se guarda nada: solo se aplican las reglas a las respuestas.
        const ev = evaluarCaso(cuerpo.respuestas);
        await registrar(['A', 'B'].includes(ev.estado) ? 'elegible' : ev.estado === 'excluido' ? 'excluido' : 'incompleto', ev.producto || '-');
        return enviar(res, 200, { evaluacion: evaluacionPublica(ev) });
      }

      case 'evento': {
        if (cuerpo.evento !== 'inicio' || !EVENTOS.includes(cuerpo.evento)) return enviar(res, 400, { error: 'Evento no válido' });
        if (await dentroDeCupo('evento', ipCliente(req), 60, 3600)) await registrar('inicio');
        return enviar(res, 200, { ok: true });
      }

      case 'crear': {
        if (!(await dentroDeCupo('crear', ipCliente(req), CUPOS.expedientesPorIpHora, 3600))) {
          return enviar(res, 429, { error: 'Demasiados intentos. Espera un rato y vuelve a probar.' });
        }
        const ev = evaluarCaso(cuerpo.respuestas);
        if (!['A', 'B'].includes(ev.estado)) return enviar(res, 409, { evaluacion: evaluacionPublica(ev) });
        const clave = generarClave();
        const exp = {
          id: generarId(),
          claveHash: resumen(clave),
          referencia: referencia(),
          creado: new Date().toISOString(),
          estado: 'borrador',
          respuestas: ev.respuestas,
          evaluacion: evaluacionPublica(ev),
          documentos: [],
          extracciones: 0,
          versionPlantillas: VERSION_PLANTILLAS
        };
        await guardarExpediente(exp);
        return enviar(res, 201, { expediente: exp.id, clave, vista: vistaPublica(exp) });
      }

      case 'leer': {
        const { id, clave } = credenciales(req, cuerpo);
        const exp = await expedienteAutorizado(id, clave);
        if (!exp) return noAutorizado(res);
        return enviar(res, 200, { vista: vistaPublica(exp) });
      }

      case 'respuestas': {
        const { id, clave } = credenciales(req, cuerpo);
        const exp = await expedienteAutorizado(id, clave);
        if (!exp) return noAutorizado(res);
        if (exp.estado !== 'borrador') return enviar(res, 409, { error: 'Este expediente ya está pagado y no se puede modificar.' });
        await anularPagoPendiente(exp);
        const ev = evaluarCaso(cuerpo.respuestas);
        exp.respuestas = limpiarRespuestas(cuerpo.respuestas);
        exp.evaluacion = evaluacionPublica(ev);
        delete exp.resumen;
        delete exp.calculo;
        await guardarExpediente(exp);
        return enviar(res, 200, { vista: vistaPublica(exp) });
      }

      case 'confirmar': {
        const { id, clave } = credenciales(req, cuerpo);
        const exp = await expedienteAutorizado(id, clave);
        if (!exp) return noAutorizado(res);
        if (exp.estado !== 'borrador') return enviar(res, 409, { error: 'Este expediente ya está pagado y no se puede modificar.' });
        await anularPagoPendiente(exp);
        const datos = limpiarDatos(cuerpo.datos, exp);
        const { errores, avisos, calculo, evaluacion, respuestas } = validarDatos(datos, exp);
        exp.datos = datos;
        if (errores.length) {
          delete exp.resumen;
          delete exp.calculo;
          await guardarExpediente(exp);
          return enviar(res, 422, { errores, avisos, vista: vistaPublica(exp) });
        }
        // Con los datos confirmados, las fechas leídas de los documentos pasan a ser las del caso.
        exp.respuestas = respuestas;
        exp.evaluacion = evaluacionPublica(evaluacion);
        exp.calculo = calculo;
        exp.resumen = { ...construirResumen(exp, datos, calculo), avisos };
        await guardarExpediente(exp);
        await registrar('documentos_completos', evaluacion.producto);
        return enviar(res, 200, { vista: vistaPublica(exp) });
      }

      case 'borrar': {
        const { id, clave } = credenciales(req, cuerpo);
        const exp = await expedienteAutorizado(id, clave);
        if (!exp) return noAutorizado(res);
        if (exp.estado !== 'borrador') return enviar(res, 409, { error: 'Los expedientes pagados se borran automáticamente a los 30 días. Si quieres borrarlo antes, escríbenos.' });
        for (const doc of exp.documentos) await borrarBinario(`doc:${exp.id}:${doc.id}`).catch(() => {});
        await comando(['DEL', claveExpediente(exp.id)]);
        return enviar(res, 200, { borrado: true });
      }

      default:
        return enviar(res, 400, { error: 'Acción no válida' });
    }
  } catch (error) {
    if (error.pagado) return enviar(res, 409, { error: error.message, estado: 'pagado' });
    console.error('Error en expediente:', error.message);
    return enviar(res, 500, { error: 'Ha fallado algo en el servidor. Inténtalo de nuevo en un momento.' });
  }
}
