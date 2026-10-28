// Configuración pública compartida por la web y el servidor.
// Cambiar la marca o los precios se hace aquí y en ningún otro sitio:
// el servidor cobra el importe que figura en PRODUCTOS y la web lo muestra.
// El dominio, las rutas y la identidad legal del prestador no dependen de la marca.

export const MARCA = {
  nombre: 'BajaClara',
  lema: 'Reclama los cobros después de tu baja de teléfono o fibra',
  dominio: 'reclamoia.es',
  emailContacto: 'hola@reclamoia.es',
  colorPrincipal: '#0B5D57'
};

export const PRESTADOR = {
  titular: 'Jaime Porras Rodríguez',
  nif: '51141641Z',
  domicilio: 'Camino de la Huerta 209, 28055 Madrid, España',
  email: 'hola@reclamoia.es',
  web: 'reclamoia.es'
};

// Precios en céntimos de euro, IVA incluido. Son precios iniciales de prueba.
export const PRODUCTOS = {
  operador: {
    codigo: 'operador',
    recorrido: 'A',
    nombre: 'Reclamación a tu compañía',
    precioCentimos: 1399,
    entrega: [
      'Escrito de reclamación personalizado dirigido a tu compañía',
      'Índice de documentos y tus archivos como anexos numerados, en un solo PDF',
      'Guía para presentarlo y guardar la prueba de envío'
    ]
  },
  oaut: {
    codigo: 'oaut',
    recorrido: 'B',
    nombre: 'Expediente para la Oficina de Atención al Usuario de Telecomunicaciones',
    precioCentimos: 2990,
    entrega: [
      'Formulario oficial de reclamación cumplimentado con tus datos',
      'Explicación del caso y relación de importes reclamados',
      'Índice de documentos y tus archivos como anexos numerados',
      'Anexos también por separado y guía de presentación (por internet o en papel)'
    ]
  }
};

// Límites de documentos. El servidor los vuelve a comprobar.
export const LIMITES = {
  formatos: ['application/pdf', 'image/jpeg', 'image/png'],
  extensiones: ['.pdf', '.jpg', '.jpeg', '.png'],
  maxArchivos: 10,
  maxBytesArchivo: 10 * 1024 * 1024,
  maxBytesTotal: 30 * 1024 * 1024,
  maxPaginasPdf: 40,
  maxPaginasTotal: 80
};

export function formatearPrecio(centimos) {
  return `${(centimos / 100).toFixed(2).replace('.', ',')} €`;
}

export function formatearMegas(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
