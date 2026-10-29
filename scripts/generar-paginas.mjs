// Genera las páginas secundarias con la misma cabecera y pie. Las condiciones salen de
// api/_condiciones.js, la misma fuente que el PDF de confirmación del pedido.
// Uso: node scripts/generar-paginas.mjs (y revisar el resultado antes de publicar)
import fs from 'node:fs';
import { MARCA, PRESTADOR, PRODUCTOS, LIMITES, formatearPrecio, formatearMegas } from '../config-publica.js';
import { seccionesCondiciones, VERSION_CONDICIONES } from '../api/_condiciones.js';
import { FUENTES } from '../api/_reglas.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pagina({ archivo, titulo, descripcion, canonica = true, indexar = true, cuerpo, scripts = '' }) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)} — ${esc(MARCA.nombre)}</title>
  <meta name="description" content="${esc(descripcion)}">
${canonica ? `  <link rel="canonical" href="https://${MARCA.dominio}/${archivo === 'index.html' ? '' : archivo}">\n` : ''}${indexar ? '' : '  <meta name="robots" content="noindex">\n'}  <meta name="theme-color" content="#0E0B2B">
  <link rel="icon" href="/favicon.svg?v=lc2" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico?v=lc2" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=lc2">
  <link rel="preload" href="/fuentes/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fuentes/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/estilos.css">
  <script type="module" src="/sitio.js"></script>
${scripts}</head>
<body>
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  <header class="cabecera">
    <div class="contenedor">
      <a class="marca" href="/"><img src="/marca/simbolo.svg" alt="" width="38" height="38"><span data-marca>${esc(MARCA.nombre)}</span></a>
      <nav class="navegacion" aria-label="Principal"><a href="/#precio">Precio</a><a href="/#preguntas">Ayuda</a></nav>
    </div>
  </header>
  <main id="contenido" class="pagina-clara legal">
    <div class="mancha violeta" style="width:520px;height:520px;top:-200px;right:-200px"></div>
    <div class="mancha violeta" style="width:420px;height:420px;bottom:-160px;left:-200px"></div>
    <div class="contenedor estrecho" style="padding-top:32px">
      <div class="paso-tarjeta">
${cuerpo}
      </div>
    </div>
  </main>
  <footer class="pie">
    <div class="contenedor">
      <a class="marca" href="/"><img src="/marca/simbolo.svg" alt="" width="38" height="38"><span data-marca>${esc(MARCA.nombre)}</span></a>
      <p>Un servicio de ${esc(PRESTADOR.web)} prestado por ${esc(PRESTADOR.titular)}, NIF ${esc(PRESTADOR.nif)}, ${esc(PRESTADOR.domicilio)}.</p>
      <nav class="enlaces" aria-label="Información legal">
        <a href="/legal.html">Aviso legal</a><a href="/privacidad.html">Privacidad</a><a href="/privacidad.html#cookies">Cookies</a><a href="/condiciones-venta.html">Condiciones</a><a data-email href="mailto:${esc(PRESTADOR.email)}">Contacto</a>
      </nav>
      <p>Preparamos documentación: no prestamos asesoramiento jurídico ni te representamos. No somos un organismo público ni estamos vinculados a ninguna compañía.</p>
    </div>
  </footer>
</body>
</html>
`;
  fs.writeFileSync(archivo, html);
}

const p = (t) => `      <p>${t}</p>`;
const h2 = (t) => `      <h2>${t}</h2>`;
const ul = (items) => `      <ul>\n${items.map(i => `        <li>${i}</li>`).join('\n')}\n      </ul>`;
const cta = '      <p style="margin-top:24px"><a class="boton violeta ancho" href="/reclamar.html">Empieza tu reclamación</a></p>';

// ——— Condiciones ———
pagina({
  archivo: 'condiciones-venta.html',
  titulo: 'Condiciones de contratación',
  descripcion: `Condiciones del servicio de preparación de reclamaciones por cobros posteriores a la baja de ${MARCA.nombre}.`,
  cuerpo: [
    '      <h1>Condiciones de contratación</h1>',
    `      <p class="fecha">Versión ${VERSION_CONDICIONES}. Recibirás una copia en PDF con la confirmación de tu pedido.</p>`,
    ...seccionesCondiciones().flatMap(s => [h2(esc(s.titulo)), ...s.parrafos.map(t => p(esc(t)))])
  ].join('\n')
});

// ——— Privacidad ———
pagina({
  archivo: 'privacidad.html',
  titulo: 'Política de privacidad',
  descripcion: 'Qué datos tratamos, para qué, durante cuánto tiempo y con qué proveedores.',
  cuerpo: [
    '      <h1>Política de privacidad</h1>',
    `      <p class="fecha">Actualizada el 28 de octubre de 2026. Pendiente de revisión por un profesional de protección de datos.</p>`,
    h2('1. Responsable'),
    p(`${esc(PRESTADOR.titular)}, NIF ${esc(PRESTADOR.nif)}, ${esc(PRESTADOR.domicilio)}. Correo: <a href="mailto:${esc(PRESTADOR.email)}">${esc(PRESTADOR.email)}</a>. ${esc(MARCA.nombre)} es el nombre comercial del servicio.`),
    h2('2. Qué datos tratamos y para qué'),
    ul([
      '<strong>Comprobación del caso (paso 1).</strong> Tus respuestas no incluyen datos identificativos. Si tu caso no encaja, no las guardamos. Si continúas, se guardan con tu expediente.',
      '<strong>Expediente (pasos 2 y 3).</strong> Nombre, DNI, NIE o CIF, domicilio si lo das, el resumen de tu caso si lo escribes, datos del contrato y de la baja, los documentos que subes (facturas, pruebas, reclamaciones) y el email que indicas al pagar. Los usamos solo para preparar la documentación que pides. Base: ejecución del contrato o aplicación de medidas precontractuales a tu petición (art. 6.1.b RGPD).',
      '<strong>Lectura automática de documentos.</strong> Para proponerte los datos de tus facturas enviamos cada documento a la API de Anthropic, que actúa como encargado del tratamiento. Tratamos lo que devuelve como una propuesta que tú confirmas. El contenido de tus archivos no se usa para dar órdenes al sistema.',
      '<strong>Pago.</strong> Lo gestiona Stripe. No vemos ni guardamos los datos de tu tarjeta.',
      '<strong>Emails.</strong> Te enviamos el enlace de descarga y la confirmación del pedido. Si compras la reclamación a la compañía, te enviamos un único recordatorio a los 35 días con el siguiente paso; puedes pedirnos que no lo hagamos (interés legítimo, art. 6.1.f RGPD).',
      '<strong>Registro del pedido.</strong> Guardamos un registro mínimo (referencia, producto, importe, fecha, email y versión de condiciones, reglas y plantillas, sin documentos) para cumplir obligaciones fiscales y atender reclamaciones (art. 6.1.c y 6.1.f RGPD).',
      '<strong>Medición.</strong> Contamos de forma anónima y agregada cuántas personas inician, encajan, pagan o reciben su pedido, y los errores. No usamos herramientas de analítica ni publicidad de terceros.'
    ]),
    h2('3. Cuánto tiempo'),
    `      <div class="tabla-scroll"><table>
        <thead><tr><th>Datos</th><th>Plazo</th></tr></thead>
        <tbody>
          <tr><td>Expediente sin pagar (respuestas, datos y documentos)</td><td>Se borra automáticamente a las 48 horas de la última modificación. Puedes borrarlo antes desde el formulario.</td></tr>
          <tr><td>Expediente pagado: tus documentos y los documentos generados</td><td>30 días desde la entrega, para que puedas descargarlos. Después se borran automáticamente.</td></tr>
          <tr><td>Datos para el recordatorio (email, referencia y compañía)</td><td>Hasta el envío del recordatorio, como máximo 45 días.</td></tr>
          <tr><td>Registro mínimo del pedido</td><td>5 años.</td></tr>
          <tr><td>Pedidos anteriores al 28/10/2026 (servicio generalista)</td><td>Se mantiene la referencia mínima anunciada entonces (referencia, fecha, categoría y email) hasta 24 meses.</td></tr>
          <tr><td>Contadores anónimos</td><td>Hasta 400 días.</td></tr>
        </tbody>
      </table></div>`,
    p('Stripe y Resend conservan sus propios registros del pago y del envío de emails según sus políticas.'),
    h2('4. Proveedores (encargados del tratamiento)'),
    ul([
      'Vercel Inc. — alojamiento de la web y de las funciones del servidor (EE. UU.).',
      'Upstash Inc. — almacenamiento privado y temporal de expedientes y documentos.',
      'Anthropic PBC — lectura automática de documentos (EE. UU.).',
      'Stripe Payments Europe Ltd. — pago.',
      'Resend Inc. — envío de emails (EE. UU.).'
    ]),
    p('Cuando un proveedor trata datos fuera del Espacio Económico Europeo, la transferencia se ampara en el Marco de Privacidad de Datos UE-EE. UU. si el proveedor está adherido o, en su defecto, en las cláusulas contractuales tipo de la Comisión Europea (art. 46 RGPD). No vendemos ni cedemos tus datos con fines comerciales. Tú decides si presentas la documentación a tu compañía o a la Oficina; nosotros no se la enviamos.'),
    h2('5. Decisiones automatizadas'),
    p('La comprobación del paso 1 aplica reglas automáticas para decidir si podemos preparar tu caso. No produce efectos jurídicos sobre ti ni decide tu reclamación. Si no estás de acuerdo con el resultado, escríbenos y lo revisará una persona.'),
    h2('6. Seguridad'),
    ul([
      'Los documentos se guardan en almacenamiento privado, nunca en rutas públicas, y caducan solos.',
      'El acceso a tu expediente exige una clave aleatoria que solo tiene tu navegador; las descargas usan enlaces de un solo uso.',
      'El escrito completo no se envía al navegador antes del pago.',
      'Los archivos se validan por su contenido y con límites de tamaño y páginas.'
    ]),
    h2('7. Tus derechos'),
    p(`Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a <a href="mailto:${esc(PRESTADOR.email)}">${esc(PRESTADOR.email)}</a>. Si no te atendemos bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`),
    '      <h2 id="cookies">8. Cookies y almacenamiento en tu navegador</h2>',
    p('No usamos cookies propias ni de terceros para analítica o publicidad. El formulario guarda tus respuestas y la clave de tu expediente en el almacenamiento de sesión del navegador, que se borra al cerrar la pestaña; es imprescindible para el servicio que pides. Stripe puede usar cookies en su propia página de pago.')
  ].join('\n')
});

// ——— Aviso legal ———
pagina({
  archivo: 'legal.html',
  titulo: 'Aviso legal',
  descripcion: 'Identidad del prestador y condiciones de uso de la web.',
  cuerpo: [
    '      <h1>Aviso legal</h1>',
    h2('Titular'),
    `      <div class="tabla-scroll"><table><tbody>
        <tr><th>Titular</th><td>${esc(PRESTADOR.titular)}</td></tr>
        <tr><th>NIF</th><td>${esc(PRESTADOR.nif)}</td></tr>
        <tr><th>Domicilio</th><td>${esc(PRESTADOR.domicilio)}</td></tr>
        <tr><th>Email</th><td><a href="mailto:${esc(PRESTADOR.email)}">${esc(PRESTADOR.email)}</a></td></tr>
        <tr><th>Web</th><td>${esc(PRESTADOR.web)}</td></tr>
        <tr><th>Nombre comercial</th><td>${esc(MARCA.nombre)}</td></tr>
      </tbody></table></div>`,
    h2('Qué es este servicio'),
    p(`${esc(MARCA.nombre)} prepara documentación para reclamar cuotas de telefonía o fibra cobradas después de una baja. No es un despacho de abogados, no presta asesoramiento jurídico personalizado, no representa a nadie y no es un organismo público ni está vinculado a la Administración ni a ninguna compañía telefónica.`),
    h2('Uso de la web'),
    p('Debes usar la web de buena fe, con datos y documentos veraces y propios. No está permitido intentar acceder a expedientes ajenos, sobrecargar el servicio ni introducir código malicioso.'),
    h2('Propiedad intelectual'),
    p('El diseño, los textos, las plantillas y el logotipo de la web pertenecen a su titular. Los documentos que generas son para tu uso en tu reclamación.'),
    h2('Responsabilidad'),
    p('Revisamos las reglas y fuentes que aplicamos, con la fecha de revisión indicada en cada documento, pero la normativa puede cambiar. Revisa siempre los documentos antes de presentarlos.'),
    h2('Ley aplicable'),
    p('Se aplica la ley española.')
  ].join('\n')
});

// ——— Ejemplo ———
pagina({
  archivo: 'ejemplo.html',
  titulo: 'Ejemplo completo de reclamación',
  descripcion: 'Ejemplo ficticio completo de una reclamación por cobros posteriores a la baja de la fibra: cálculo, escrito y anexos.',
  cuerpo: [
    '      <h1>Ejemplo completo (ficticio)</h1>',
    p('Todos los datos son inventados, también la compañía. El PDF se ha generado con el mismo sistema que usan los pedidos reales y lleva la marca «EJEMPLO FICTICIO».'),
    h2('El caso'),
    ul([
      'Ana pidió la baja de su fibra por teléfono el miércoles 3 de junio de 2026 y recibió un SMS con el número de referencia.',
      'La baja debía ser efectiva dos días hábiles después: el viernes 5 de junio.',
      'El 8 de junio le llegó la factura de junio (del 1 al 30), de 36,30 €. El 1 de julio, la de julio entera, también de 36,30 €.'
    ]),
    h2('El cálculo'),
    `      <div class="tabla-scroll"><table>
        <thead><tr><th>Factura</th><th>Periodo</th><th class="num">Importe</th><th class="num">Se reclama</th></tr></thead>
        <tbody>
          <tr><td>F-EJ-0601</td><td>01/06 – 30/06 (25 de 30 días posteriores a la baja)</td><td class="num">36,30 €</td><td class="num">30,25 €</td></tr>
          <tr><td>F-EJ-0701</td><td>01/07 – 31/07 (todo el periodo)</td><td class="num">36,30 €</td><td class="num">36,30 €</td></tr>
        </tbody>
        <tfoot><tr><td colspan="3" class="total">Total</td><td class="num total">66,55 €</td></tr></tfoot>
      </table></div>`,
    p('La factura de junio se emitió después de la baja, pero cubre días anteriores: por eso solo se reclama la parte posterior.'),
    h2('Lo que recibe'),
    ul([
      '<a href="/ejemplo/ejemplo-reclamacion.pdf">Reclamación a la compañía con índice y anexos (PDF)</a>',
      '<a href="/ejemplo/ejemplo-guia.pdf">Guía de presentación (PDF)</a>',
      'La confirmación del pedido con las condiciones.'
    ]),
    p(`Si la compañía no responde en un mes o no lo soluciona, el expediente para la Oficina (${formatearPrecio(PRODUCTOS.oaut.precioCentimos)}) incluye el formulario oficial cumplimentado, un escrito explicativo, la relación de importes, los anexos numerados (también por separado) y la guía para presentarlo por internet o en papel.`),
    cta
  ].join('\n')
});

// ——— 404 ———
pagina({
  archivo: '404.html',
  titulo: 'Página no encontrada',
  descripcion: 'Esta página no existe.',
  canonica: false,
  indexar: false,
  cuerpo: ['      <h1>Esta página no existe</h1>', p('El enlace puede estar roto o la página se ha movido.'), '      <p><a class="boton violeta" href="/">Ir al inicio</a></p>'].join('\n')
});

// ——— Verificación de escritos antiguos ———
pagina({
  archivo: 'verificar.html',
  titulo: 'Verificar un escrito anterior',
  descripcion: 'Comprueba la referencia de un escrito generado por ReclamoIA antes del 28 de octubre de 2026.',
  indexar: false,
  scripts: '  <script type="module" src="/verificar.js"></script>\n',
  cuerpo: [
    '      <h1>Verificar un escrito anterior</h1>',
    p('Los escritos generados por ReclamoIA antes del 28 de octubre de 2026 llevan una referencia del tipo RC-20260923-XXXX. Escríbela para comprobar que existe.'),
    '      <form id="form-verificar" class="tarjeta"><div class="campo"><label for="ref">Referencia</label><input type="text" id="ref" autocapitalize="characters" placeholder="RC-20260923-XXXX"></div><button class="boton violeta" type="submit">Verificar</button></form>',
    '      <div id="resultado" aria-live="polite" style="margin-top:16px"></div>'
  ].join('\n')
});

// ——— Páginas de categorías antiguas: se conservan con información útil y real ———
pagina({
  archivo: 'reclamar-compania-telefonica.html',
  titulo: 'Reclamar a tu compañía de teléfono o fibra si te cobran después de la baja',
  descripcion: 'Qué dice la ley si te siguen cobrando después de dar de baja tu línea, cómo reclamar y en qué plazos.',
  cuerpo: [
    '      <h1>Te siguen cobrando después de dar de baja tu teléfono o fibra</h1>',
    p(`El artículo 7 del Real Decreto 899/2009 establece: «${esc(FUENTES.rd899_art7.cita)}» La baja debe surtir efecto, como tarde, dos días hábiles después de pedirla.`),
    h2('Cómo reclamar'),
    ul([
      'Reclama por escrito a la compañía, con la prueba de la baja y las facturas, y pide el número de referencia de tu reclamación.',
      'La compañía tiene un mes para responder.',
      'Si no responde o no lo soluciona, tienes tres meses para acudir a la Oficina de Atención al Usuario de Telecomunicaciones del Ministerio, de forma gratuita.',
      'Ojo: una factura emitida después de la baja puede cobrar días anteriores. Solo es indebido lo que corresponde a después de la fecha efectiva.'
    ]),
    p(`Puedes hacerlo por tu cuenta. Si prefieres que preparemos la documentación (escrito, cálculo, anexos y guía), cuesta ${formatearPrecio(PRODUCTOS.operador.precioCentimos)}, tanto la reclamación a la compañía como el expediente para la Oficina.`),
    cta
  ].join('\n')
});

for (const [archivo, titulo, texto, organismo, enlace] of [
  ['reclamar-banco.html', 'Reclamar a un banco', 'Para reclamar a un banco, primero dirígete por escrito a su servicio de atención al cliente. Si no responde en plazo o no estás de acuerdo, puedes acudir gratis al Banco de España.', 'Portal del Cliente Bancario del Banco de España', 'https://clientebancario.bde.es'],
  ['reclamar-retraso-vuelo.html', 'Reclamar por un retraso o cancelación de vuelo', 'Para reclamar por un retraso, una cancelación o una denegación de embarque, primero reclama a la aerolínea. Si no responde o no estás de acuerdo, puedes acudir gratis a la Agencia Estatal de Seguridad Aérea.', 'Agencia Estatal de Seguridad Aérea (AESA)', 'https://www.seguridadaerea.gob.es']
]) {
  pagina({
    archivo,
    titulo,
    descripcion: `${titulo}: por dónde empezar y a qué organismo acudir.`,
    cuerpo: [
      `      <h1>${esc(titulo)}</h1>`,
      '      <p class="mensaje aviso">Ya no preparamos este tipo de reclamaciones: ahora solo preparamos reclamaciones por cobros de telefonía o fibra posteriores a la baja.</p>',
      p(esc(texto)),
      p(`Información oficial: <a href="${enlace}" rel="noopener">${esc(organismo)}</a>.`),
      p('Si tu problema es con una compañía de teléfono o fibra que te sigue cobrando después de la baja, <a href="/">aquí te explicamos cómo te ayudamos</a>.')
    ].join('\n')
  });
}

console.log('Páginas generadas. Límites de documentos publicados:', LIMITES.maxArchivos, 'archivos,', formatearMegas(LIMITES.maxBytesArchivo));
