import { Resend } from 'resend';
import { seleccionarGuia } from './guia.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOS_ANOS_EN_SEGUNDOS = 63072000;

function escaparHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function comandoRedis(partes) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const path = partes.map(p => encodeURIComponent(p)).join('/');
  const resp = await fetch(`${url}/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data.result;
}

async function marcarSeguimientoEnviado(ref, expediente) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const valor = JSON.stringify({ ...expediente, seguimientoEnviado: true });
  await fetch(`${url}/set/expediente:${ref}/${encodeURIComponent(valor)}?EX=${DOS_ANOS_EN_SEGUNDOS}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
}

function construirEmailSeguimiento(expediente) {
  const guia = seleccionarGuia(expediente.categoria, expediente.tipoDestinatario);
  const nombre = expediente.nombre || '';
  const empresa = expediente.empresa || 'la empresa reclamada';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f0f2f7;margin:0;padding:0;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#0D1B2A;padding:28px 32px;">
    <img src="https://reclamoia.es/logo-reclamoia.png" alt="ReclamoIA" style="height:36px;width:auto;">
  </div>
  <div style="padding:32px;">
    <h2 style="font-size:18px;color:#0D1B2A;margin-bottom:12px;">¿Has recibido respuesta de ${escaparHTML(empresa)}${nombre ? `, ${escaparHTML(nombre)}` : ''}?</h2>
    <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:16px;">
      Ha pasado el plazo legal habitual desde que generaste tu escrito de reclamación (Ref. <strong>${escaparHTML(expediente.ref)}</strong>) contra <strong>${escaparHTML(empresa)}</strong>. Si ya has recibido una respuesta satisfactoria, no necesitas hacer nada más.
    </p>
    <p style="font-size:14px;color:#444;line-height:1.7;margin-bottom:16px;">
      Si no has recibido respuesta, o la respuesta no te convence, este es el siguiente paso:
    </p>
    <div style="background:#fdf9f0;border:1px solid #C9A84C;border-radius:8px;padding:14px 16px;margin:20px 0;">
      <p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>${escaparHTML(guia.etiquetaOrganismo || 'Organismo competente')}:</strong> ${escaparHTML(guia.organismo)}</p>
      ${guia.enlace ? `<p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Cómo reclamar:</strong> ${escaparHTML(guia.enlace)}</p>` : ''}
      ${guia.telefono ? `<p style="font-size:13px;color:#8a6a1a;margin:3px 0;">✓ <strong>Teléfono:</strong> ${escaparHTML(guia.telefono)}</p>` : ''}
    </div>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">
      Si tienes dudas sobre cómo continuar, responde directamente a este email y te ayudamos.
    </p>
    <p style="font-size:13px;color:#0D1B2A;margin-top:24px;">— Jaime Porras<br><span style="color:#999;font-size:12px;">Fundador de ReclamoIA</span></p>
    <p style="font-size:11px;color:#999;line-height:1.6;margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
      ReclamoIA es una herramienta de asistencia en la redacción de escritos. No presta servicios de asesoría jurídica.
    </p>
  </div>
  <div style="background:#f8f8f8;padding:16px 32px;text-align:center;">
    <p style="font-size:11px;color:#aaa;margin:2px 0;">ReclamoIA · reclamoia.es</p>
    <p style="font-size:11px;color:#aaa;margin:2px 0;">Ref. expediente: ${escaparHTML(expediente.ref)}</p>
  </div>
</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'No autorizado' });
    }
  }

  const ahora = Math.floor(Date.now() / 1000);
  let procesados = 0;
  let errores = 0;

  try {
    const pendientes = await comandoRedis(['zrangebyscore', 'seguimientos:pendientes', '0', String(ahora)]);

    for (const ref of pendientes || []) {
      try {
        const raw = await comandoRedis(['get', `expediente:${ref}`]);
        if (!raw) {
          await comandoRedis(['zrem', 'seguimientos:pendientes', ref]);
          continue;
        }

        const expediente = JSON.parse(raw);
        if (expediente.seguimientoEnviado || !expediente.email) {
          await comandoRedis(['zrem', 'seguimientos:pendientes', ref]);
          continue;
        }

        await resend.emails.send({
          from: 'ReclamoIA <hola@reclamoia.es>',
          to: expediente.email,
          subject: `¿Has recibido respuesta de ${expediente.empresa || 'la empresa'}? — Ref. ${expediente.ref}`,
          html: construirEmailSeguimiento(expediente)
        });

        await marcarSeguimientoEnviado(ref, expediente);
        await comandoRedis(['zrem', 'seguimientos:pendientes', ref]);
        procesados++;

      } catch (itemError) {
        console.error(`Error procesando seguimiento ${ref}:`, itemError);
        errores++;
      }
    }
  } catch (error) {
    console.error('Error en cron de seguimiento:', error);
    return res.status(500).json({ error: 'Error ejecutando seguimiento' });
  }

  console.log(`Seguimiento ejecutado: ${procesados} enviados, ${errores} errores`);
  return res.status(200).json({ procesados, errores });
}
