const ASUNTOS = {
  'Telecomunicaciones': 'Reclamación formal por la prestación de servicios de telecomunicaciones',
  'Energía y suministros': 'Reclamación formal en materia de suministros energéticos',
  'Aerolíneas y transporte': 'Reclamación formal en materia de transporte de pasajeros',
  'Banca y seguros': 'Reclamación formal en materia de servicios bancarios y de seguros',
  'Administración pública': 'Escrito de reclamación ante la Administración',
  'Comercio y tiendas online': 'Reclamación formal en materia de consumo',
  'Sanidad y salud': 'Reclamación formal en materia de asistencia sanitaria',
  'Inmobiliaria y alquiler': 'Reclamación formal en materia de arrendamiento y vivienda',
  'Educación': 'Reclamación formal en materia de servicios educativos',
  'Deudas, préstamos e impagos': 'Requerimiento extrajudicial de pago'
};

const CATEGORIAS_CON_ATENCION_AL_CLIENTE = [
  'Telecomunicaciones', 'Energía y suministros', 'Aerolíneas y transporte',
  'Banca y seguros', 'Comercio y tiendas online'
];

export function categoriaVisible(categoria) {
  return !categoria || categoria === 'Otro' ? 'General' : categoria;
}

export function textoAsunto(categoria, tipoDestinatario) {
  if (ASUNTOS[categoria]) return ASUNTOS[categoria];
  return tipoDestinatario === 'persona' ? 'Requerimiento extrajudicial' : 'Reclamación formal';
}

export function lineasRemitente({ nombre, documento, direccion, cp, ciudad, telefono, email }) {
  const lineas = [nombre, documento];
  if (direccion || ciudad || cp) {
    lineas.push([direccion, [cp, ciudad].filter(Boolean).join(' ')].filter(Boolean).join(', '));
  }
  if (telefono) lineas.push(`Tel.: ${telefono}`);
  lineas.push(email);
  return lineas.filter(Boolean);
}

export function lineasDestinatario({ empresa, categoriaEmpresa, tipoDestinatario, domicilioDestinatario }) {
  const encabezado = tipoDestinatario !== 'persona' && CATEGORIAS_CON_ATENCION_AL_CLIENTE.includes(categoriaEmpresa)
    ? 'A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE'
    : 'A LA ATENCIÓN DE';
  return [encabezado, (empresa || '').toUpperCase(), domicilioDestinatario || ''].filter(Boolean);
}
