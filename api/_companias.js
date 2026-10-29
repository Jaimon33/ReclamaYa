// Datos de cada compañía: dónde se reclama y qué sociedad presta el servicio.
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

// Sociedades que prestan el servicio de cada marca, según su aviso legal o sus condiciones generales
// (comprobado el 29/10/2026). Se usan en los escritos en lugar de lo que lea la IA de la factura.
// Cuando una marca tiene varias sociedades, se elige la que figure en la factura (por CIF).
const TME = { razonSocial: 'Telefónica Móviles España, S.A.U.', cif: 'A78923125', domicilio: 'Ronda de la Comunicación s/n, Distrito Telefónica, Edificio Sur 3, 28050 Madrid', fuente: 'Aviso legal de movistar.es y condiciones de O2' };
const TDE = { razonSocial: 'Telefónica de España, S.A.U.', cif: 'A82018474', domicilio: 'Gran Vía 28, 28013 Madrid', fuente: 'Aviso legal de movistar.es' };
const VODAFONE = { razonSocial: 'Vodafone España, S.A.U.', cif: 'A80907397', domicilio: 'Avenida de América 115, 28042 Madrid', fuente: 'Aviso legal de vodafone.es y lowi.es' };
const ORANGE = { razonSocial: 'Orange Espagne, S.A.U.', cif: 'A82009812', domicilio: 'Paseo del Club Deportivo 1, Parque Empresarial La Finca, Edificio 8, 28223 Pozuelo de Alarcón (Madrid)', fuente: 'Aviso legal de orange.es y condiciones de Jazztel y simyo' };
const XFERA = { razonSocial: 'Xfera Móviles, S.A.U.', cif: 'A82528548', domicilio: 'Parque Empresarial La Finca, Paseo del Club Deportivo 1, Edificio 8, 28223 Pozuelo de Alarcón (Madrid)', fuente: 'Aviso legal de yoigo.com y masmovil.es' };
const RCABLE = { razonSocial: 'R Cable y Telecable Telecomunicaciones, S.A.U.', cif: 'A15474281', domicilio: 'Calle Real 85, 15003 A Coruña', fuente: 'Condiciones generales de R y de Telecable' };

export const EMPRESAS = {
  Movistar: [TDE, TME],
  O2: [TME, TDE],
  Vodafone: [VODAFONE],
  Lowi: [VODAFONE],
  Orange: [ORANGE],
  Jazztel: [ORANGE],
  Simyo: [ORANGE],
  Yoigo: [XFERA],
  'MásMóvil': [XFERA],
  Pepephone: [{ razonSocial: 'Pepemobile, S.L.', cif: 'B85033470', domicilio: '', fuente: 'Información legal de pepephone.com' }],
  Digi: [{ razonSocial: 'DIGI Spain Telecom, S.A.', cif: 'A84919760', domicilio: 'Calle Francisca Delgado 11, 28108 Alcobendas (Madrid)', fuente: 'Aviso legal de digimobil.es' }],
  Finetwork: [{ razonSocial: 'Wewi Mobile, S.L.', cif: 'B54865845', domicilio: 'Avenida San Luis de Cuba 7B, 03600 Elda (Alicante)', fuente: 'Condiciones generales de finetwork.com' }],
  Euskaltel: [{ razonSocial: 'Euskaltel, S.A.', cif: 'A48766695', domicilio: 'Parque Tecnológico de Bizkaia, Edificio 809, 48160 Derio (Bizkaia)', fuente: 'Estatutos de Euskaltel' }],
  R: [RCABLE],
  Telecable: [RCABLE],
  Adamo: [{ razonSocial: 'Adamo Telecom Iberia, S.A.U.', cif: 'A65232357', domicilio: 'Calle Llacuna 22, 1º 3ª, 08005 Barcelona', fuente: 'Aviso legal de adamo.es' }]
};

const soloLetras = (s) => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

// Sociedad a la que se dirige la reclamación: la de nuestra lista que coincide con el CIF de la factura,
// o la principal de la marca. Para compañías que no tenemos, lo que figure en la factura.
export function empresaOperador(operador, { cifFactura = '', razonFactura = '', servicio = '' } = {}) {
  const lista = EMPRESAS[operador];
  if (lista) {
    const cif = soloLetras(cifFactura);
    const porCif = cif && lista.find(e => e.cif === cif);
    if (porCif) return { ...porCif, origen: 'verificado' };
    // Movistar: los móviles los presta Telefónica Móviles España; la fibra y el fijo, Telefónica de España.
    if (operador === 'Movistar' && servicio === 'movil') return { ...TME, origen: 'verificado' };
    return { ...lista[0], origen: 'verificado' };
  }
  if (razonFactura) return { razonSocial: razonFactura, cif: soloLetras(cifFactura), domicilio: '', origen: 'factura' };
  return null;
}
