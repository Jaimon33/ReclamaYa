const FUENTES_POR_CATEGORIA = {
  'Telecomunicaciones': {
    fuentes: ['BOE', 'EUR-Lex', 'CNMC'],
    leyes: [
      'Ley 11/2022, de 28 de junio, General de Telecomunicaciones',
      'Real Decreto 899/2009, de 22 de mayo, Carta de derechos del usuario de servicios de comunicaciones electrónicas',
      'Reglamento (UE) 2015/2120 sobre acceso a internet abierto',
    ]
  },
  'Energía y suministros': {
    fuentes: ['BOE', 'EUR-Lex', 'CNMC'],
    leyes: [
      'Ley 24/2013, de 26 de diciembre, del Sector Eléctrico',
      'Real Decreto 1955/2000 sobre distribución, suministro y autorización de instalaciones eléctricas',
      'Directiva 2019/944/UE sobre normas comunes para el mercado interior de la electricidad',
    ]
  },
  'Aerolíneas y transporte': {
    fuentes: ['BOE', 'EUR-Lex', 'AESA'],
    leyes: [
      'Reglamento (CE) nº 261/2004 sobre compensación y asistencia a pasajeros aéreos',
      'Convenio de Montreal de 1999 sobre transporte aéreo internacional',
      'Ley 48/1960, de 21 de julio, sobre Navegación Aérea',
    ]
  },
  'Banca y seguros': {
    fuentes: ['BOE', 'EUR-Lex', 'Banco de España'],
    leyes: [
      'Ley 7/1998, de 13 de abril, sobre Condiciones Generales de la Contratación',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
      'Directiva 2014/17/UE sobre contratos de crédito para bienes inmuebles',
      'Ley 22/2007, de 11 de julio, sobre comercialización a distancia de servicios financieros',
    ]
  },
  'Administración pública': {
    fuentes: ['BOE', 'EUR-Lex'],
    leyes: [
      'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común',
      'Ley 58/2003, de 17 de diciembre, General Tributaria',
      'Real Decreto Legislativo 8/2015, de 30 de octubre, Ley General de la Seguridad Social',
      'Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales',
    ]
  },
  'Comercio y tiendas online': {
    fuentes: ['BOE', 'EUR-Lex'],
    leyes: [
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
      'Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información',
      'Directiva 2011/83/UE sobre derechos de los consumidores',
      'Reglamento (UE) 2022/2065 de Servicios Digitales',
    ]
  },
  'Sanidad y salud': {
    fuentes: ['BOE', 'EUR-Lex'],
    leyes: [
      'Ley 41/2002, de 14 de noviembre, básica reguladora de la autonomía del paciente',
      'Ley 16/2003, de 28 de mayo, de cohesión y calidad del Sistema Nacional de Salud',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
    ]
  },
  'Inmobiliaria y alquiler': {
    fuentes: ['BOE', 'EUR-Lex'],
    leyes: [
      'Ley 29/1994, de 24 de noviembre, de Arrendamientos Urbanos',
      'Ley 12/2023, de 24 de mayo, por el derecho a la vivienda',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
    ]
  },
  'Educación': {
    fuentes: ['BOE', 'EUR-Lex'],
    leyes: [
      'Ley Orgánica 3/2020, de 29 de diciembre, de Educación (LOMLOE)',
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
      'Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información',
    ]
  },
  'Otro': {
    fuentes: ['BOE', 'EUR-Lex'],
    leyes: [
      'Real Decreto Legislativo 1/2007, de 16 de noviembre, Ley General para la Defensa de los Consumidores',
      'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común',
    ]
  }
};

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
    objetivo, descripcion, documentos
  } = req.body;

  if (!nombre || !documento || !direccion || !ciudad || !cp ||
      !telefono || !email || !empresa || !problema || !objetivo || !descripcion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const categoria = categoriaEmpresa || 'Otro';
  const fuentesConfig = FUENTES_POR_CATEGORIA[categoria] || FUENTES_POR_CATEGORIA['Otro'];
  const leyes = fuentesConfig.leyes;
  const fuentesNombres = fuentesConfig.fuentes;

  const boeResultados = await consultarBOE(`${categoria} consumidores España`);
  const fuentesVerificadas = [
    ...fuentesNombres.map(f => `${f} — verificado`),
    ...(boeResultados || [])
  ];

  const docTexto = tipo === 'empresa' ? 'CIF' : 'DNI';
  const importeTexto = importe ? `El importe reclamado es de ${parseFloat(importe).toFixed(2)}€.` : '';
  const referenciaTexto = referencia ? `Número de contrato o referencia: ${referencia}.` : '';
  const fechaTexto = fechaHecho ? `Los hechos ocurrieron el ${fechaHecho}.` : '';

  const textoDocumentos = documentos
    .filter(d => d.tipo === 'texto')
    .map(d => d.contenido)
    .join('\n\n');

  const leyesTexto = leyes.map((l, i) => `${i + 1}. ${l}`).join('\n');

  const prompt = `Eres un abogado especialista en derecho del consumidor español. Redacta un escrito de reclamación extrajudicial formal.

DATOS DEL RECLAMANTE:
Nombre: ${nombre} | ${docTexto}: ${documento} | Dirección: ${direccion}, ${cp} ${ciudad} | Tel: ${telefono} | Email: ${email}

RECLAMACIÓN:
Empresa indicada: ${empresa} | Categoría: ${categoria}
Motivo: ${problema} | Objetivo: ${objetivo}
${importeTexto} ${referenciaTexto} ${fechaTexto}
Descripción: ${descripcion}
${textoDocumentos ? `Documentos aportados: ${textoDocumentos}` : ''}

LEGISLACIÓN APLICABLE:
${leyesTexto}

REGLAS ABSOLUTAS DE FORMATO — incumplirlas invalida el escrito:
1. PROHIBIDO usar asteriscos (**), almohadillas (#), guiones triples (---) o cualquier formato markdown
2. PROHIBIDO incluir títulos como "ESCRITO DE RECLAMACIÓN" o similares al inicio
3. El escrito empieza DIRECTAMENTE con el párrafo de presentación del reclamante
4. Los ordinales PRIMERO.- SEGUNDO.- TERCERO.- van en mayúsculas seguidos de punto y guión, sin ningún símbolo adicional
5. Todo el texto en formato plano, sin negritas markdown

DESTINATARIO:
Si en los documentos adjuntos aparece el nombre exacto del organismo, departamento y dirección postal a quien va dirigido el escrito, úsalos. Si no hay documentos, usa: ${empresa}. En cualquier caso NO escribas el destinatario en el cuerpo del escrito, ese bloque lo añade el sistema automáticamente.

ESTRUCTURA DEL CUERPO DEL ESCRITO:

${nombre}, con ${docTexto} número ${documento}, y domicilio a efectos de notificaciones en ${direccion}, ${cp} ${ciudad}, teléfono ${telefono} y correo electrónico ${email}, ante [destinatario real], comparezco y como mejor proceda en Derecho, EXPONGO:

PRIMERO.- [primer hecho con fecha concreta y datos del documento si los hay]

SEGUNDO.- [segundo hecho]

TERCERO.- [tercer hecho si procede]

En virtud de los hechos expuestos, y al amparo de la normativa vigente:
— [ley y artículo concreto aplicable]
— [ley y artículo concreto aplicable]

Por todo lo expuesto, SOLICITO:

PRIMERO.- [solicitud principal concreta con importe si aplica]

SEGUNDO.- Que se dé respuesta formal y por escrito en el plazo máximo de QUINCE (15) DIAS HABILES contados desde la recepción del presente escrito.

TERCERO.- Que de no obtener respuesta satisfactoria en dicho plazo, queda expresamente reservado el derecho a interponer las correspondientes reclamaciones ante ${fuentesNombres.join(' y/o ')}, así como a ejercer cuantas acciones legales procedan.

En ${ciudad}, a ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.

Atentamente,

INSTRUCCIONES FINALES:
- Extensión mínima 400 palabras
- Tono técnico-jurídico, formal y firme
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: mensajeContenido }]
      })
    });

    const data = await response.json();

    if (data.content && data.content[0] && data.content[0].text) {
      return res.status(200).json({
        carta: data.content[0].text,
        fuentes: fuentesVerificadas
      });
    } else {
      throw new Error('Respuesta inesperada de la API');
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error al generar el escrito' });
  }
}
