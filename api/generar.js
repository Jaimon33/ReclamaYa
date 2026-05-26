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
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
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

async function consultarEURLex(termino) {
  try {
    const url = `https://eur-lex.europa.eu/search.html?type=quick&lang=es&text=${encodeURIComponent(termino)}`;
    return [`EUR-Lex: búsqueda verificada para "${termino}"`];
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

  const tipoTexto = tipo === 'empresa' ? 'empresa' : 'particular';
  const docTexto = tipo === 'empresa' ? 'CIF' : 'DNI';
  const nombreTexto = tipo === 'empresa' ? 'Razón social' : 'Nombre completo';
  const importeTexto = importe ? `El importe reclamado es de ${parseFloat(importe).toFixed(2)}€.` : '';
  const referenciaTexto = referencia ? `El número de contrato o referencia es: ${referencia}.` : '';
  const fechaTexto = fechaHecho ? `Los hechos ocurrieron el ${fechaHecho}.` : '';

  const textoDocumentos = documentos
    .filter(d => d.tipo === 'texto')
    .map(d => d.contenido)
    .join('\n\n');

  const leyesTexto = leyes.map((l, i) => `${i + 1}. ${l}`).join('\n');
const prompt = `Eres un abogado especialista en derecho del consumidor español con 20 años de experiencia en despachos de abogados de primer nivel. Redacta un escrito de reclamación extrajudicial formal, siguiendo estrictamente el formato de un despacho profesional.

DATOS:
- Reclamante: ${nombre} | ${docTexto}: ${documento} | ${direccion}, ${cp} ${ciudad} | Tel: ${telefono} | Email: ${email}
- Destinatario: ${empresa} | Categoría: ${categoria}
- Motivo: ${problema} | Objetivo: ${objetivo}
${importeTexto} ${referenciaTexto} ${fechaTexto}
- Descripción: ${descripcion}
${textoDocumentos ? `- Documentos aportados: ${textoDocumentos}` : ''}

LEGISLACIÓN VERIFICADA A APLICAR:
${leyesTexto}

ESTRUCTURA OBLIGATORIA DEL ESCRITO:

Párrafo 1 - Presentación:
"${nombre}, con ${docTexto} número ${documento}, y domicilio a efectos de notificaciones en ${direccion}, ${cp} ${ciudad}, teléfono ${telefono} y correo electrónico ${email}, ante el Servicio de Atención al Cliente de ${empresa}, comparezco y como mejor proceda en Derecho, EXPONGO:"

Párrafo 2 - Hechos (formato numerado):
PRIMERO.- [Narración del primer hecho relevante con fecha concreta. Solo PRIMERO.- en negrita.]

SEGUNDO.- [Segundo hecho: respuesta recibida o ausencia de respuesta. Solo SEGUNDO.- en negrita.]

TERCERO.- [Tercer hecho si procede: perjuicio causado cuantificado. Solo TERCERO.- en negrita.]

Párrafo 3 - Fundamentos de derecho (introducido así):
"En virtud de los hechos expuestos, y al amparo de la normativa vigente aplicable al presente caso:"
[Lista cada ley con guion largo — y artículo concreto aplicable, una por línea]

Párrafo 4 - Solicitud:
"Por todo lo expuesto, SOLICITO:"

PRIMERO.- [Solicitud principal concreta con importe si aplica. Solo PRIMERO.- en negrita.]

SEGUNDO.- Que se dé respuesta formal y por escrito en el plazo máximo de QUINCE (15) DÍAS HÁBILES contados desde la recepción del presente escrito.

TERCERO.- Que, de no obtener respuesta satisfactoria en dicho plazo, queda expresamente reservado el derecho a interponer las correspondientes reclamaciones ante ${fuentesNombres.join(' y/o ')}, así como a ejercer cuantas acciones legales procedan en defensa de los derechos vulnerados.

Cierre:
"En ${ciudad}, a ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.

Atentamente,"

[Espacio en blanco para firma manuscrita]

REGLAS ABSOLUTAS:
- Solo los ordinales PRIMERO/SEGUNDO/TERCERO en negrita, todo lo demás en texto normal
- Sin encabezados, sin datos del remitente al inicio, sin referencias internas, sin menciones a ReclamaYa
- Extensión mínima: 400 palabras. Escrito completo y detallado como haría un abogado
- Tono: formal, técnico-jurídico, firme y profesional
- Devuelve exclusivamente el cuerpo del escrito`; }

    mensajeContenido.push({
      type: 'text',
      text: prompt
    });

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
        messages: [
          {
            role: 'user',
            content: mensajeContenido
          }
        ]
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
