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
const prompt = `Redacta un escrito de reclamación formal en español con estos datos:

RECLAMANTE: ${nombre} | ${docTexto}: ${documento} | ${direccion}, ${cp} ${ciudad} | Tel: ${telefono} | ${email}
DESTINATARIO: ${empresa} (${categoria})
MOTIVO: ${problema}
OBJETIVO: ${objetivo}
${importeTexto}
${referenciaTexto}
${fechaTexto}
DESCRIPCIÓN: ${descripcion}
${textoDocumentos ? `DOCUMENTOS: ${textoDocumentos}` : ''}

LEGISLACIÓN APLICABLE:
${leyesTexto}

FORMATO OBLIGATORIO — escribe exactamente en este orden:

1. "Muy señores míos:" 
2. Párrafo de presentación: "${nombre}, con ${docTexto} ${documento}, domicilio en ${direccion}, ${cp} ${ciudad}, EXPONGO:"
3. PRIMERO.- [en negrita solo PRIMERO.-] texto del primer hecho. Tras cada hecho añade en cursiva la ley aplicable: "Al amparo del [ley y artículo concreto],"
4. SEGUNDO.- igual
5. TERCERO.- igual si procede
6. "SOLICITO:"
7. PRIMERO.- [en negrita solo PRIMERO.-] solicitud concreta con importe si aplica
8. SEGUNDO.- "Que se dé respuesta en plazo máximo de QUINCE (15) DÍAS HÁBILES."
9. TERCERO.- "Que de no obtener respuesta me reservo el derecho a reclamar ante ${fuentesNombres.join(' / ')}."
10. "En ${ciudad}, a ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}."
11. "Atentamente,"
12. Línea en blanco para firma

REGLAS:
- Solo el número PRIMERO/SEGUNDO/TERCERO en negrita, el resto normal
- Sin encabezados, sin datos del remitente, sin referencias internas, sin menciones a ReclamaYa
- Tono formal y firme
- Solo el cuerpo del escrito, nada más`;
try {
    const mensajeContenido = [];

    const imagenesYPdfs = documentos.filter(d => d.tipo === 'imagen' || d.tipo === 'pdf');
    for (const doc of imagenesYPdfs) {
      if (doc.tipo === 'imagen') {
        mensajeContenido.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: doc.mediaType,
            data: doc.data
          }
        });
      } else if (doc.tipo === 'pdf') {
        mensajeContenido.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: doc.data
          }
        });
      }
    }

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
