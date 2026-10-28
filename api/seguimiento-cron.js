// Recordatorio único tras una reclamación al operador: si no ha respondido, explica el siguiente paso.
// También atiende los recordatorios pendientes de los escritos generalistas anteriores.
import { Resend } from 'resend';
import { MARCA, PRESTADOR, urlBase } from './_config.js';
import { comando, leerJSON } from './_almacen.js';
import { NORMAS_VIGILADAS } from './_reglas.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function plantilla(titulo, parrafos) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#17212b">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;padding:28px">
<p style="font-weight:bold;color:${MARCA.colorPrincipal};margin:0 0 16px">${esc(MARCA.nombre)}</p>
<h1 style="font-size:19px;margin:0 0 12px">${esc(titulo)}</h1>
${parrafos.map(p => `<p style="line-height:1.6;font-size:14px">${p}</p>`).join('\n')}
<p style="font-size:11px;color:#888;line-height:1.5;margin-top:24px">Te escribimos una sola vez por tu pedido. ${esc(PRESTADOR.titular)} · ${esc(PRESTADOR.email)}</p>
</div></body></html>`;
}

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const ahora = String(Math.floor(Date.now() / 1000));
  let enviados = 0;
  let errores = 0;

  for (const id of (await comando(['ZRANGEBYSCORE', 'seguimientos:v2', '0', ahora])) || []) {
    try {
      const s = await leerJSON(`seguimiento:${id}`);
      if (s && resend) {
        await resend.emails.send({
          from: `${MARCA.nombre} <${PRESTADOR.email}>`,
          to: s.email,
          subject: `¿Te ha respondido ${s.operador}? · ${s.referencia}`,
          html: plantilla(`¿Te ha respondido ${s.operador}?`, [
            'Hace unas semanas preparaste tu reclamación por cobros posteriores a la baja. Si el operador ya te ha devuelto el dinero, no tienes que hacer nada más.',
            'Si no te ha respondido en un mes desde que la presentaste, o su respuesta no lo resuelve, puedes acudir gratis a la Oficina de Atención al Usuario de Telecomunicaciones. Tienes tres meses desde la respuesta o desde que terminó ese mes.',
            `Si quieres, podemos preparar el expediente con el formulario oficial cumplimentado: <a href="${urlBase()}/reclamar.html">comprobar mi caso</a>.`
          ])
        });
      }
      await comando(['ZREM', 'seguimientos:v2', id]);
      await comando(['DEL', `seguimiento:${id}`]);
      enviados++;
    } catch (e) {
      console.error('Seguimiento fallido:', e.message);
      errores++;
    }
  }

  // Recordatorios de los escritos anteriores a la especialización (expedientes RC-...).
  for (const ref of (await comando(['ZRANGEBYSCORE', 'seguimientos:pendientes', '0', ahora])) || []) {
    try {
      const exp = await leerJSON(`expediente:${ref}`);
      if (exp && !exp.seguimientoEnviado && exp.email && resend) {
        await resend.emails.send({
          from: `ReclamoIA <${PRESTADOR.email}>`,
          to: exp.email,
          subject: `¿Has recibido respuesta de ${exp.empresa || 'la empresa'}? — Ref. ${exp.ref}`,
          html: plantilla(`¿Has recibido respuesta de ${exp.empresa || 'la empresa'}?`, [
            `Ha pasado el plazo habitual desde que generaste tu escrito (ref. ${esc(exp.ref)}). Si ya te han respondido de forma satisfactoria, no necesitas hacer nada más.`,
            'Si no, el siguiente paso es el organismo indicado en la guía que te enviamos con el escrito. Si tienes dudas, responde a este correo.'
          ])
        });
        await comando(['SET', `expediente:${ref}`, JSON.stringify({ ...exp, seguimientoEnviado: true }), 'KEEPTTL']);
      }
      await comando(['ZREM', 'seguimientos:pendientes', ref]);
      enviados++;
    } catch (e) {
      console.error('Seguimiento anterior fallido:', e.message);
      errores++;
    }
  }

  const normas = await vigilarNormas(resend);
  return res.status(200).json({ enviados, errores, normas });
}

// Consulta real al BOE: avisa si una norma en la que se basan las reglas se ha modificado o derogado.
async function vigilarNormas(resend) {
  const cambios = [];
  for (const n of NORMAS_VIGILADAS) {
    try {
      const r = await fetch(`https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/${n.id}/metadatos`, { headers: { Accept: 'application/json' } });
      const d = (await r.json()).data?.[0];
      if (!r.ok || !d) throw new Error(`respuesta ${r.status}`);
      if (d.vigencia_agotada === 'S' || d.estatus_derogacion === 'S') cambios.push(`${n.nombre}: figura como derogada o sin vigencia.`);
      else if (d.fecha_actualizacion !== n.actualizacion) cambios.push(`${n.nombre}: actualizada en el BOE (${d.fecha_actualizacion}; revisada: ${n.actualizacion}).`);
    } catch (e) {
      cambios.push(`${n.nombre}: no se ha podido consultar el BOE (${e.message}).`);
    }
  }
  if (cambios.length && resend && !(await comando(['GET', `aviso-normas:${cambios.join('|').length}:${new Date().toISOString().slice(0, 7)}`]))) {
    await resend.emails.send({
      from: `${MARCA.nombre} <${PRESTADOR.email}>`,
      to: process.env.ALERTAS_EMAIL || PRESTADOR.email,
      subject: 'Aviso: revisar la normativa de las reglas',
      text: ['El control diario del BOE ha detectado:', ...cambios, '', 'Revisa api/_reglas.js (FUENTES y NORMAS_VIGILADAS) y las plantillas antes de seguir vendiendo.'].join('\n')
    }).catch(e => console.error('Aviso de normas no enviado:', e.message));
    await comando(['SET', `aviso-normas:${cambios.join('|').length}:${new Date().toISOString().slice(0, 7)}`, '1', 'EX', String(31 * 86400)]);
  }
  return cambios;
}
