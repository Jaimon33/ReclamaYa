// Dónde reclama cada compañía. Páginas oficiales de cada operador, comprobadas en la fecha indicada.
// Si una compañía cambia su web, basta con actualizar aquí la dirección.
export const COMPROBADO_COMPANIAS = '2026-10-29';

export const RECLAMACIONES = {
  Movistar: { url: 'https://www.movistar.es/atencion-cliente/reclamaciones', telefono: '1004' },
  Vodafone: { url: 'https://www.vodafone.es/c/conocenos/es/vodafone-espana/quienes-somos/legal-y-regulatorio/otra-informacion-legal/reclamaciones/', nota: 'Tiene un formulario de reclamaciones en esa página: rellénalo y adjunta el PDF.' },
  Orange: { url: 'https://ayuda.orange.es/particulares/mi-orange/otras-gestiones/26-hacer-una-reclamacion', telefono: '1470' },
  Jazztel: { url: 'https://contacta.jazztel.com/709-tramitaciones/711-poner-una-reclamacion', telefono: '1565' },
  Yoigo: { url: 'https://www.yoigo.com/ayuda' },
  'MásMóvil': { url: 'https://www.masmovil.es/ayuda-clientes/que-vias-de-reclamacion-puedo-utilizar' },
  Simyo: { url: 'https://www.simyo.es/preguntas-frecuentes/resolver-problemas.html', email: 'soporte@simyo.es', telefono: '1644' },
  Lowi: { url: 'https://www.lowi.es/asistencia/atencion-al-cliente/como-puedo-contactar-con-lowi-para-realizar-una-reclamacion/', email: 'peticiones@lowi.es' },
  O2: { url: 'https://o2online.es/ayuda/derechos-cliente/' },
  Pepephone: { url: 'https://www.pepephone.com/atencion-al-cliente' },
  Digi: { url: 'https://www.digimobil.es/preguntas-frecuentes/mis-servicios-contratados/como-puedo-hacer-una-reclamacion', email: 'atencionalcliente@digimobil.es', telefono: '1200' },
  Finetwork: { url: 'https://www.finetwork.com/contacto', telefono: '1777' },
  Euskaltel: { url: 'https://www.euskaltel.com/ayuda-clientes/normativa-reclamaciones', telefono: '1717' },
  R: { url: 'https://mundo-r.com/es/ayuda-clientes', telefono: '1449' },
  Telecable: { url: 'https://telecable.es/ayuda-clientes', telefono: '900 222 111' },
  Avatel: { url: 'https://avatel.es/ayuda/faq/donde-y-como-puedo-contactar-con-avatel/', telefono: '1790' },
  Adamo: { url: 'https://adamo.es/es/contacto', email: 'cliente@adamo.es', telefono: '900 651 651' }
};

export function canalReclamacion(operador) {
  return RECLAMACIONES[operador] || null;
}
