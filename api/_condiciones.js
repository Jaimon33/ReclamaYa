// Condiciones de contratación. Única fuente: con ella se genera la página condiciones-venta.html
// (scripts/generar-paginas.mjs) y el PDF de confirmación que recibe cada cliente.
import { MARCA, PRESTADOR, PRODUCTOS, formatearPrecio } from '../config-publica.js';

export const VERSION_CONDICIONES = '2026-10-28';

export function seccionesCondiciones() {
  const A = PRODUCTOS.operador;
  const B = PRODUCTOS.oaut;
  return [
    {
      titulo: '1. Quién presta el servicio',
      parrafos: [
        `${MARCA.nombre} es el nombre comercial con el que ${PRESTADOR.titular} (NIF ${PRESTADOR.nif}, ${PRESTADOR.domicilio}) presta este servicio a través de ${PRESTADOR.web}. Contacto: ${PRESTADOR.email}.`
      ]
    },
    {
      titulo: '2. Qué servicio contratas',
      parrafos: [
        'Preparamos la documentación para reclamar cuotas de telefonía o fibra cobradas después de una baja que puedas acreditar. Tú presentas la reclamación: no la presentamos en tu nombre, no te representamos y no hacemos el seguimiento del procedimiento.',
        'No es asesoramiento jurídico personalizado ni lo revisa un abogado. Los documentos se generan con plantillas y reglas revisables, a partir de los datos y documentos que tú confirmas. La inteligencia artificial solo se usa para leer tus documentos y proponerte datos que tú revisas.',
        'Reclamar al operador y a la Oficina de Atención al Usuario de Telecomunicaciones es gratuito y puedes hacerlo por tu cuenta por los canales oficiales. Lo que pagas es la preparación de la documentación.',
        'No incluye: penalizaciones por permanencia, financiación de móviles u otros dispositivos, cargos por equipos, indemnizaciones por daños, suplantaciones, ficheros de morosos ni asuntos judiciales.'
      ]
    },
    {
      titulo: '3. Productos y precios',
      parrafos: [
        `${A.nombre}: ${formatearPrecio(A.precioCentimos)}, IVA incluido. Incluye: ${A.entrega.join('; ').toLowerCase()}.`,
        `${B.nombre}: ${formatearPrecio(B.precioCentimos)}, IVA incluido. Incluye: ${B.entrega.join('; ').toLowerCase()}. Solo se ofrece si ya reclamaste al operador y estás dentro del plazo para acudir a la Oficina.`,
        'Es un pago único, sin suscripción. El pago lo procesa Stripe; no vemos ni guardamos los datos de tu tarjeta.'
      ]
    },
    {
      titulo: '4. Cómo se contrata',
      parrafos: [
        'Primero compruebas si tu caso encaja, sin dar datos personales. Después añades tus documentos y confirmas los datos. Antes de pagar ves un resumen con el producto, el precio y lo que recibirás; puedes corregir cualquier dato.',
        'Al pagar aceptas estas condiciones. Te enviamos la confirmación del pedido con estas condiciones por correo electrónico y en PDF, para que la conserves.'
      ]
    },
    {
      titulo: '5. Entrega',
      parrafos: [
        'Preparamos los documentos cuando nuestro servidor recibe la confirmación del pago de Stripe; normalmente tarda unos minutos. Los descargas desde la página de confirmación y desde el enlace que te enviamos por correo, disponible durante 30 días.',
        'Si algo falla al prepararlos, lo reintentamos automáticamente y te avisamos. Si no podemos entregarlos, te devolvemos el importe.'
      ]
    },
    {
      titulo: '6. Lo que no podemos garantizar',
      parrafos: [
        'No garantizamos que el operador devuelva el dinero, que responda, ni que la Oficina admita o estime tu reclamación: depende de ellos y de las pruebas de tu caso. Las reglas que aplicamos citan su fuente oficial y la fecha en que se revisaron; la normativa puede cambiar.'
      ]
    },
    {
      titulo: '7. Tus responsabilidades',
      parrafos: [
        'Debes ser el titular del contrato, aportar datos y documentos veraces y revisar los documentos antes de presentarlos. No uses el servicio para reclamaciones sin fundamento.'
      ]
    },
    {
      titulo: '8. Derecho de desistimiento',
      parrafos: [
        'Como consumidor, tienes 14 días naturales desde la contratación para desistir sin dar explicaciones, escribiendo a ' + PRESTADOR.email + ' (puedes usar el modelo de formulario de desistimiento del anexo B del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios, aunque no es obligatorio).',
        'Antes de pagar te pedimos que solicites expresamente que empecemos a preparar los documentos de inmediato. Si lo solicitas y los documentos quedan completamente preparados y a tu disposición, el servicio está totalmente ejecutado y pierdes el derecho de desistimiento, según el artículo 103.a) de esa ley. Si desistes antes de que el servicio esté completamente ejecutado, o si no llegamos a entregarlo, te devolvemos el importe.',
        'Esto no afecta a tus derechos si el servicio tiene defectos (apartado 9).'
      ]
    },
    {
      titulo: '9. Si los documentos tienen un error',
      parrafos: [
        'Si un documento no se corresponde con los datos que confirmaste, omite un archivo que aceptamos, no se lee correctamente o aplica mal las reglas publicadas, escríbenos a ' + PRESTADOR.email + ': lo corregimos sin coste o, si no es posible, te devolvemos el importe. Descargar los documentos no limita estos derechos ni los demás que te reconoce la ley.'
      ]
    },
    {
      titulo: '10. Datos personales',
      parrafos: [
        'Tratamos tus datos según la política de privacidad publicada en ' + PRESTADOR.web + '/privacidad.html. Los documentos y archivos se borran automáticamente a los 30 días de la entrega (a las 48 horas si no llegas a pagar).'
      ]
    },
    {
      titulo: '11. Reclamaciones y ley aplicable',
      parrafos: [
        'Si no estás conforme con el servicio, escríbenos a ' + PRESTADOR.email + '. También puedes acudir a los servicios de consumo de tu comunidad autónoma o de tu ayuntamiento.',
        'Estas condiciones se rigen por la ley española. Si eres consumidor, te corresponden los juzgados que señale la normativa de consumo.'
      ]
    }
  ];
}
