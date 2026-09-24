const FUENTES_POR_CATEGORIA = {
  'Telecomunicaciones': {
    fuentes: ['BOE', 'EUR-Lex', 'CNMC'],
    especialidad: 'derecho del consumidor y telecomunicaciones',
    reserva: 'interponer la correspondiente reclamación ante la Oficina de Atención al Usuario de Telecomunicaciones, así como a ejercer cuantas acciones legales procedan',
    leyes: [
      'Ley 11/2022, de 28 de junio, General de Telecomunicaciones',
      'Real Decreto 899/2009, de 22 de mayo, Carta de derechos del usuario de servicios de comunicaciones electrónicas',
      'Reglamento (UE) 2015/2120 sobre acceso a internet abierto',
    ]
  },
  'Energía y suministros': {
    fuentes: ['BOE', 'EUR-Lex', 'CNMC'],
    especialidad: 'derecho del consumidor y del sector energético',
    reserva: 'interponer las correspondientes reclamaciones ante los servicios de consumo de la Comunidad Autónoma, la Junta Arbitral de Consumo o la Comisión Nacional de los Mercados y la Competencia, así como a ejercer cuantas acciones legales procedan',
    leyes: [
      'Ley 24/2013, de 26 de diciembre, del Sector Eléctrico',
      'Real Decreto 1955/2000 sobre distribución, suministro y autorización de instalaciones eléctricas',
      'Directiva 2019/944/UE sobre normas comunes para el mercado interior de la electricidad',
    ]
  },
  'Aerolíneas y transporte': {
    fuentes: ['BOE', 'EUR-Lex', 'AESA'],
    especialidad: 'derecho del consumidor y derechos de los pasajeros',
    reserva: 'interponer la correspondiente reclamación ante la Agencia Estatal de Seguridad Aérea (AESA), así como a ejercer cuantas acciones legales procedan',
    leyes: [
      'Reglamento (CE) nº 261/2004 sobre compensación y asistencia a pasajeros aéreos',
      'Convenio de Montreal de 1999 sobre transporte aéreo internacional',
      'Ley 48/1960, de 21 de julio, sobre Navegación Aérea',
    ]
  },
  'Banca y seguros': {
    fuentes: ['BOE', 'EUR-Lex', 'Banco de España'],
    especialidad: 'derecho bancario y del consumidor',
    reserva: 'interponer la correspondiente reclamación ante el Banco de España o, en su caso, ante la Dirección General de Seguros y Fondos de Pensiones, así como a ejercer cuantas acciones legales procedan',
    leyes: [
      'Ley 7/1998, de 13 de abril, sobre Condiciones Generales de la Contratación',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
      'Directiva 2014/17/UE sobre contratos de crédito para bienes inmuebles',
      'Ley 22/2007, de 11 de julio, sobre comercialización a distancia de servicios financieros',
    ]
  },
  'Administración pública': {
    fuentes: ['BOE', 'EUR-Lex'],
    especialidad: 'derecho administrativo',
    reserva: 'interponer los recursos administrativos y, en su caso, contencioso-administrativos que procedan',
    leyes: [
      'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común',
      'Ley 58/2003, de 17 de diciembre, General Tributaria',
      'Real Decreto Legislativo 8/2015, de 30 de octubre, Ley General de la Seguridad Social',
      'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales',
    ]
  },
  'Comercio y tiendas online': {
    fuentes: ['BOE', 'EUR-Lex'],
    especialidad: 'derecho del consumidor',
    reserva: 'interponer las correspondientes reclamaciones ante los servicios de consumo competentes y la Junta Arbitral de Consumo, así como a ejercer cuantas acciones legales procedan',
    leyes: [
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
      'Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información',
      'Directiva 2011/83/UE sobre derechos de los consumidores',
      'Reglamento (UE) 2022/2065 de Servicios Digitales',
    ]
  },
  'Sanidad y salud': {
    fuentes: ['BOE', 'EUR-Lex'],
    especialidad: 'derecho sanitario y del consumidor',
    reserva: 'interponer las correspondientes reclamaciones ante la Inspección de Servicios Sanitarios y los servicios de consumo competentes, así como a ejercer cuantas acciones legales procedan',
    leyes: [
      'Ley 41/2002, de 14 de noviembre, básica reguladora de la autonomía del paciente',
      'Ley 16/2003, de 28 de mayo, de cohesión y calidad del Sistema Nacional de Salud',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
    ]
  },
  'Inmobiliaria y alquiler': {
    fuentes: ['BOE', 'EUR-Lex'],
    especialidad: 'derecho civil y de arrendamientos urbanos',
    reserva: 'acudir a los servicios de mediación y a los organismos de vivienda y consumo competentes, así como a ejercitar cuantas acciones judiciales procedan',
    leyes: [
      'Ley 29/1994, de 24 de noviembre, de Arrendamientos Urbanos',
      'Ley 12/2023, de 24 de mayo, por el derecho a la vivienda',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
    ]
  },
  'Educación': {
    fuentes: ['BOE', 'EUR-Lex'],
    especialidad: 'derecho educativo y del consumidor',
    reserva: 'interponer las correspondientes reclamaciones ante la Inspección Educativa competente, así como a ejercer cuantas acciones legales procedan',
    leyes: [
      'Ley Orgánica 3/2020, de 29 de diciembre, de Educación (LOMLOE)',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
      'Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información',
    ]
  },
  'Deudas, préstamos e impagos': {
    fuentes: ['BOE'],
    especialidad: 'derecho civil de obligaciones y contratos',
    busqueda: 'préstamo reclamación de cantidad',
    reserva: 'ejercitar las acciones judiciales de reclamación de cantidad que correspondan, incluido el proceso monitorio regulado en los artículos 812 y siguientes de la Ley de Enjuiciamiento Civil, con reclamación de los intereses de demora y de las costas que procedan',
    leyes: [
      'Código Civil, artículos 1088, 1091 y 1101 (fuerza de las obligaciones y responsabilidad por incumplimiento)',
      'Código Civil, artículos 1740 y 1753 (contrato de préstamo y obligación de devolver lo prestado)',
      'Código Civil, artículos 1100 y 1108 (mora del deudor e intereses de demora)',
      'Código Civil, artículo 1973 (interrupción de la prescripción por reclamación extrajudicial)',
      'Ley 1/2000, de Enjuiciamiento Civil, artículos 812 a 818 (proceso monitorio)',
    ]
  },
  'Reclamación a particulares': {
    fuentes: ['BOE'],
    especialidad: 'derecho civil',
    busqueda: 'Código Civil obligaciones',
    reserva: 'ejercitar cuantas acciones judiciales correspondan en defensa de mis derechos e intereses',
    leyes: [
      'Código Civil, artículos 1088, 1089 y 1091 (fuentes y fuerza de las obligaciones)',
      'Código Civil, artículos 1101 y 1124 (responsabilidad por incumplimiento y resolución de las obligaciones recíprocas)',
      'Código Civil, artículos 1100 y 1108 (mora del deudor e intereses de demora)',
      'Código Civil, artículo 1973 (interrupción de la prescripción por reclamación extrajudicial)',
    ]
  },
  'Otro': {
    fuentes: ['BOE', 'EUR-Lex'],
    especialidad: 'derecho civil y del consumidor',
    reserva: 'acudir a los organismos competentes y a ejercitar cuantas acciones legales procedan',
    leyes: [
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores (solo si la relación es de consumo)',
      'Código Civil, artículos 1088, 1091 y 1101 (fuerza de las obligaciones y responsabilidad por incumplimiento)',
    ]
  }
};

const CATEGORIAS_ENTRE_PARTICULARES = ['Inmobiliaria y alquiler', 'Deudas, préstamos e impagos'];

function seleccionarConfig(categoria, tipoDestinatario) {
  if (tipoDestinatario === 'persona' && !CATEGORIAS_ENTRE_PARTICULARES.includes(categoria)) {
    return FUENTES_POR_CATEGORIA['Reclamación a particulares'];
  }
  return FUENTES_POR_CATEGORIA[categoria] || FUENTES_POR_CATEGORIA['Otro'];
}

async function consultarBOE(termino) {
  try {
    const url = `https://www.boe.es/buscar/api/json?q=${encodeURIComponent(termino)}&sort=fecha&order=desc&rows=3`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.response && data.response.docs && data.response.docs.length > 0) {
      return data.response.docs.map(d => `BOE: ${d.titulo || d.identificador}`).slice(0, 2);
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const {
    tipo, nombre, documento, direccion, ciudad, cp,
    telefono, email, categoriaEmpresa, empresa,
    referencia, fechaHecho, problema, importe,
    objetivo, descripcion, documentos, camposCategoria,
    tipoDestinatario, domicilioDestinatario,
    representacion, repNombre, repDocumento,
    firmanteNombre, firmanteCargo, reclamacionPrevia
  } = req.body;

  if (!nombre || !email || !empresa || !descripcion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const categoria = categoriaEmpresa || 'Otro';
  const esPersona = tipoDestinatario === 'persona';
  const fuentesConfig = seleccionarConfig(categoria, tipoDestinatario);
  const leyes = fuentesConfig.leyes;
  const fuentesNombres = fuentesConfig.fuentes;
  const esRequerimientoPago = categoria === 'Deudas, préstamos e impagos';

  const boeResultados = await consultarBOE(fuentesConfig.busqueda || `${categoria} consumidores España`);
  const fuentesVerificadas = [
    ...fuentesNombres.map(f => `${f} — verificado`),
    ...(boeResultados || [])
  ];

  const docTexto = tipo === 'empresa' ? 'CIF' : 'DNI';
  const importeTexto = importe ? `El importe reclamado es de ${parseFloat(importe).toFixed(2)}€.` : '';
  const referenciaTexto = referencia ? `Número de contrato o referencia: ${referencia}.` : '';
  const fechaTexto = fechaHecho ? `Los hechos ocurrieron el ${fechaHecho}.` : '';
  const problemaTexto = problema ? `Motivo: ${problema}` : '';
  const objetivoTexto = objetivo
    ? `Objetivo: ${objetivo}`
    : 'Objetivo: no lo especifica — infiere la petición más razonable a partir de la descripción de los hechos.';

  const textoDocumentos = documentos
    .filter(d => d.tipo === 'texto')
    .map(d => d.contenido)
    .join('\n\n');

  const leyesTexto = leyes.map((l, i) => `${i + 1}. ${l}`).join('\n');

  const detallesContacto = [];
  if (direccion || ciudad || cp) {
    const domicilio = [direccion, [cp, ciudad].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    detallesContacto.push(`y domicilio a efectos de notificaciones en ${domicilio}`);
  }
  if (telefono) detallesContacto.push(`teléfono ${telefono}`);
  detallesContacto.push(`correo electrónico ${email}`);

  const documentoPropio = documento ? `con ${docTexto} número ${documento}` : '';
  let identificacionPartes;
  if (tipo === 'empresa' && firmanteNombre) {
    const cargo = firmanteCargo ? `, en su condición de ${firmanteCargo}` : '';
    identificacionPartes = [`${firmanteNombre}${cargo}, en nombre y representación de ${nombre}`, documentoPropio];
  } else if (representacion === 'representacion' && repNombre) {
    const docRepresentado = repDocumento ? `, con DNI/CIF ${repDocumento}` : '';
    identificacionPartes = [nombre, documentoPropio, `en nombre y representación de ${repNombre}${docRepresentado}`];
  } else {
    identificacionPartes = [nombre, documentoPropio];
  }
  const identificacionReclamante = [...identificacionPartes, ...detallesContacto].filter(Boolean).join(', ');

  const aperturaEscrito = esPersona
    ? `${identificacionReclamante}, por medio del presente escrito me dirijo a [D. o Dña., según corresponda] ${empresa} y, como mejor proceda en Derecho, EXPONGO:`
    : `${identificacionReclamante}, ante [destinatario real], comparezco y como mejor proceda en Derecho, EXPONGO:`;

  const lugarFecha = ciudad
    ? `En ${ciudad}, a ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : `A ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`;

  const firmanteTexto = tipo === 'empresa' && firmanteNombre
    ? ` | Firma en su nombre: ${firmanteNombre}${firmanteCargo ? ` (${firmanteCargo})` : ''}`
    : '';
  const representadoTexto = representacion === 'representacion' && repNombre
    ? ` | Actúa en representación de: ${repNombre}${repDocumento ? ` (${repDocumento})` : ''}`
    : '';
  const tipoEscrito = esRequerimientoPago
    ? 'un requerimiento extrajudicial de pago formal'
    : 'un escrito de reclamación extrajudicial formal';

  const prompt = `Eres un abogado especialista en ${fuentesConfig.especialidad} español, con un estilo de redacción muy formal, preciso y propio de un despacho profesional. Redacta ${tipoEscrito}.

DATOS DEL RECLAMANTE (usa únicamente los que se indican; si algún dato no aparece aquí, el reclamante no lo ha facilitado y NO debes inventarlo ni dejar huecos o corchetes en su lugar):
${tipo === 'empresa' ? 'Razón social' : 'Nombre'}: ${nombre}${documento ? ` | ${docTexto}: ${documento}` : ''}${direccion ? ` | Dirección: ${direccion}, ${cp} ${ciudad}` : ''}${telefono ? ` | Tel: ${telefono}` : ''} | Email: ${email}${firmanteTexto}${representadoTexto}

RECLAMACIÓN:
Parte reclamada: ${empresa} (${esPersona ? 'persona física' : 'empresa o entidad'})${domicilioDestinatario ? ` | Domicilio: ${domicilioDestinatario}` : ''} | Categoría: ${categoria}
${problemaTexto}
${objetivoTexto}
${importeTexto} ${referenciaTexto} ${fechaTexto}
Descripción: ${descripcion}
${reclamacionPrevia ? `Gestiones previas del reclamante: ${reclamacionPrevia}` : ''}
${camposCategoria ? `Datos específicos aportados por el reclamante (incorpóralos en los hechos siempre que sean relevantes, con la máxima precisión):\n${camposCategoria}` : ''}
${textoDocumentos ? `Documentos aportados: ${textoDocumentos}` : ''}

LEGISLACIÓN DE REFERENCIA (cita únicamente la que sea realmente aplicable a la relación entre las partes; si la relación no es de consumo, no cites normativa de protección de consumidores):
${leyesTexto}

REGLAS ABSOLUTAS DE FORMATO — incumplirlas invalida el escrito:
1. PROHIBIDO usar asteriscos (**), almohadillas (#), guiones triples (---) o cualquier formato markdown
2. PROHIBIDO incluir títulos como "ESCRITO DE RECLAMACIÓN" o similares al inicio
3. El escrito empieza DIRECTAMENTE con el párrafo de presentación del reclamante
4. Los ordinales PRIMERO.- SEGUNDO.- TERCERO.- van en mayúsculas seguidos de punto y guión, sin ningún símbolo adicional
5. Todo el texto en formato plano, sin negritas markdown
6. PROHIBIDO dejar corchetes [ ] o huecos en blanco en el texto final: si falta un dato (DNI, dirección, teléfono, fecha, importe...), redacta la frase de forma natural omitiendo ese dato, nunca dejes el hueco visible
7. El escrito termina exactamente en la línea "Atentamente,". Después de ella NO escribas nada: ni nombre, ni firma, ni DNI/CIF. La firma la añade el sistema

DESTINATARIO:
${esPersona
  ? `La parte reclamada es una PERSONA FÍSICA. Dirígete a ella como "D." o "Dña." según corresponda y NUNCA menciones servicios de atención al cliente, departamentos ni organismos.`
  : `Si en los documentos adjuntos aparece el nombre exacto del organismo, departamento y dirección postal a quien va dirigido el escrito, úsalos. Si no hay documentos, usa: ${empresa}.`}
En cualquier caso NO escribas el bloque del destinatario al inicio del escrito: ese bloque lo añade el sistema automáticamente.

ESTRUCTURA DEL CUERPO DEL ESCRITO:

${aperturaEscrito}

PRIMERO.- [primer hecho con fecha concreta y datos del documento si los hay]

SEGUNDO.- [segundo hecho]

TERCERO.- [tercer hecho si procede]

En virtud de los hechos expuestos, y al amparo de la normativa vigente:
— [ley y artículo concreto aplicable]
— [ley y artículo concreto aplicable]

Por todo lo expuesto, SOLICITO:

PRIMERO.- [solicitud principal concreta con importe si aplica]

SEGUNDO.- Que se dé respuesta formal y por escrito en el plazo máximo de QUINCE (15) DIAS HABILES contados desde la recepción del presente escrito.

TERCERO.- Que de no obtener respuesta satisfactoria en dicho plazo, queda expresamente reservado el derecho a ${fuentesConfig.reserva}.

${lugarFecha}

Atentamente,

INSTRUCCIONES FINALES:
- Extensión: entre 450 y 800 palabras. NUNCA superes las 900 palabras bajo ningún concepto — es un límite estricto, no una recomendación
- Tono técnico-jurídico, MUY formal y firme, como un escrito redactado por un despacho de abogados — cuida especialmente la precisión terminológica y la estructura
- El escrito debe quedar SIEMPRE completo: nunca termines a media frase. Si vas a acercarte al límite de extensión, resume el punto TERCERO del SOLICITO en una frase más breve en lugar de dejarlo sin terminar
- Devuelve ÚNICAMENTE el cuerpo del escrito, nada más`;

  try {
    const mensajeContenido = [];

    const imagenesYPdfs = documentos.filter(d => d.tipo === 'imagen' || d.tipo === 'pdf');
    for (const doc of imagenesYPdfs) {
      if (doc.tipo === 'imagen') {
        mensajeContenido.push({
          type: 'image',
          source: { type: 'base64', media_type: doc.mediaType, data: doc.data }
        });
      } else if (doc.tipo === 'pdf') {
        mensajeContenido.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: doc.data }
        });
      }
    }

    mensajeContenido.push({ type: 'text', text: prompt });

    async function llamarClaude(mensajes) {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          messages: mensajes
        })
      });
      return resp.json();
    }

    let data = await llamarClaude([{ role: 'user', content: mensajeContenido }]);

    // Salvaguarda: si la respuesta se cortó por límite de tokens, reintentamos una vez
    // pidiendo explícitamente más concisión, para no entregar nunca un escrito incompleto
    if (data.stop_reason === 'max_tokens') {
      console.error('Escrito truncado por max_tokens, reintentando con instrucción de brevedad');
      const mensajeReintento = [
        ...mensajeContenido,
        { type: 'text', text: '\n\nIMPORTANTE: tu respuesta anterior se cortó por superar el límite de longitud. Esta vez redacta el escrito completo, de principio a fin (incluyendo el punto TERCERO final del SOLICITO), en un máximo de 500 palabras. Es imprescindible que el escrito quede terminado.' }
      ];
      data = await llamarClaude([{ role: 'user', content: mensajeReintento }]);
    }

    if (data.content && data.content[0] && data.content[0].text) {
      if (data.stop_reason === 'max_tokens') {
        console.error('Escrito truncado también en el reintento');
        throw new Error('No se pudo generar un escrito completo, inténtalo de nuevo');
      }
      const textoEscrito = data.content[0].text;
      const matchDest = textoEscrito.match(/ante ([^,]+(?:\n[^,\n]+)*), comparezco/);
      const destinatario = matchDest ? matchDest[1].trim() : null;

      return res.status(200).json({
        carta: textoEscrito,
        fuentes: fuentesVerificadas,
        destinatario
      });
    } else {
      throw new Error('Respuesta inesperada de la API');
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error al generar el escrito' });
  }
}
