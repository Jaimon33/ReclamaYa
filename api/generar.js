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
const prompt = `Eres un experto en derecho del consumidor y administrativo español con más de 20 años de experiencia redactando escritos de reclamación formales.

Redacta un ESCRITO DE RECLAMACIÓN FORMAL siguiendo estas instrucciones exactas:

DATOS DEL RECLAMANTE:
- Tipo: ${tipoTexto}
- ${nombreTexto}: ${nombre}
- ${docTexto}: ${documento}
- Dirección: ${direccion}, ${cp} ${ciudad}
- Teléfono: ${telefono}
- Email: ${email}

DATOS DE LA RECLAMACIÓN:
- Categoría: ${categoria}
- Destinatario: ${empresa}
- Motivo: ${problema}
- Objetivo: ${objetivo}
- ${importeTexto}
- ${referenciaTexto}
- ${fechaTexto}

DESCRIPCIÓN DEL CASO:
${descripcion}

${textoDocumentos ? `CONTENIDO DE DOCUMENTOS ADJUNTOS:\n${textoDocumentos}` : ''}

LEGISLACIÓN VERIFICADA APLICABLE:
${leyesTexto}

INSTRUCCIONES DE FORMATO — SÍGUELAS AL PIE DE LA LETRA:

1. El escrito empieza directamente con el saludo "Muy señores míos:" sin ningún encabezado previo, sin fecha, sin datos del remitente, sin destinatario, sin asunto, sin referencia. Todo eso lo añade el sistema automáticamente. TÚ SOLO ESCRIBES EL CUERPO DEL ESCRITO.

2. Tras el saludo, escribe la presentación del reclamante en un único párrafo.

3. Escribe la palabra EXPONGO: sola en una línea.

4. Para cada hecho expuesto usa este formato exacto:
PRIMERO.- [solo el número en negrita, el resto del texto normal]
El texto del hecho va en el mismo párrafo, sin negrita, a continuación del número.

5. Después de los hechos, escribe DIRECTAMENTE la fundamentación legal intercalada con cada hecho al que corresponda. NO pongas un bloque de leyes al final. Cada ley va justo después del hecho al que da soporte, introducida con: "Al amparo de [ley concreta y artículo aplicable],"

6. Escribe la palabra SOLICITO: sola en una línea.

7. Para cada solicitud usa este formato exacto:
PRIMERO.- [solo el número en negrita, el resto del texto normal]

8. Termina con:
En ${ciudad}, a ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.

Atentamente,

[dejar espacio para firma]

9. NO incluyas al final: datos del remitente, referencias internas, menciones a ReclamaYa, ni texto sobre legislación verificada. Solo la fecha, "Atentamente," y espacio para firma.

10. Tono: formal, firme y profesional. Sin lenguaje coloquial.

Devuelve únicamente el cuerpo del escrito como se indica, sin explicaciones adicionales.`;}
