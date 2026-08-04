const GUIAS = {
  'Telecomunicaciones': {
    organismo: 'Oficina de Atención al Usuario de Telecomunicaciones',
    enlace: 'https://usuariosteleco.digital.gob.es/reclamaciones',
    telefono: '91 030 54 18',
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito a la empresa (hazlo hoy mismo)',
        contenido: [
          'Envía el escrito que acabas de generar por escrito, no solo por teléfono.',
          'Cómo encontrar el canal oficial: escribe en Google "[nombre de tu operador] atención al cliente reclamación escrito" y accede al resultado oficial de su web.',
          'Cuando llames o escribas, exige que te den un NÚMERO DE REFERENCIA de tu reclamación. Están obligados por ley a dártelo.',
          'Plazo legal que tiene el operador para responderte: 1 MES desde la recepción de tu escrito.',
          'Guarda siempre el justificante de envío, el número de referencia y cualquier respuesta que recibas.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden en 1 mes o la respuesta no te convence',
        contenido: [
          'Acude a la Oficina de Atención al Usuario de Telecomunicaciones del Ministerio.',
          'Cómo presentar la reclamación online: ve a https://usuariosteleco.digital.gob.es/reclamaciones y rellena el formulario oficial.',
          'También puedes llamar al 91 030 54 18 (lunes a viernes de 9:00 a 19:00, sábados de 9:00 a 14:00).',
          'Documentación que necesitas adjuntar: el escrito enviado al operador + justificante de envío + respuesta recibida (si la hay) + facturas o capturas que acrediten el problema.',
          'Plazo para presentar esta reclamación: 3 meses desde que el operador no respondió o respondió de forma insatisfactoria.',
          'Plazo de resolución: máximo 6 meses (en la práctica menos de 3 meses habitualmente).',
          'Este procedimiento es GRATUITO.'
        ]
      },
      {
        titulo: 'PASO 3 — Si la resolución no es favorable o quieres más',
        contenido: [
          'Junta Arbitral de Consumo de tu comunidad autónoma: procedimiento gratuito y sin necesidad de abogado. Busca en Google "Junta Arbitral de Consumo [tu comunidad autónoma]".',
          'Vía judicial: para importes hasta 2.000€ puedes presentar un Juicio Verbal sin abogado ni procurador. Es gratuito y muy accesible.',
          'Para importes superiores a 2.000€ se recomienda asesoramiento jurídico profesional.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'El escrito de reclamación enviado y su justificante de envío.',
          'El número de referencia de reclamación que te dio el operador.',
          'Facturas, capturas del área de cliente, emails recibidos.',
          'Fecha y hora de cada gestión realizada.',
          'Cualquier respuesta recibida de la empresa, aunque sea negativa.'
        ]
      }
    ]
  },

  'Aerolíneas y transporte': {
    organismo: 'AESA — Agencia Estatal de Seguridad Aérea',
    enlace: 'https://sede.seguridadaerea.gob.es/sede-aesa/catalogo-de-procedimientos/reclamaciones-por-cancelaciones-retrasos-denegaciones-de-embarque-y-pmr',
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito a la aerolínea',
        contenido: [
          'Cómo encontrar el canal oficial: escribe en Google "[nombre de la aerolínea] reclamación atención al cliente" y accede al formulario oficial de su web.',
          'Tienes 5 años desde el incidente para reclamar, pero cuanto antes mejor.',
          'Plazo legal que tiene la aerolínea para responderte: 1 MES.',
          'Adjunta siempre: el billete, las tarjetas de embarque y cualquier email o notificación que hayas recibido de la aerolínea sobre el incidente.',
          'Guarda el justificante de tu reclamación con fecha y número de referencia.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden en 1 mes o la respuesta es negativa',
        contenido: [
          'IMPORTANTE: El procedimiento varía según la fecha de tu vuelo.',
          'Si tu vuelo fue el 2 de junio de 2023 o posterior: acude a AESA por el procedimiento ADR (Resolución Alternativa de Litigios). La decisión de AESA es VINCULANTE para la aerolínea, es decir, están obligadas a cumplirla.',
          'Si tu vuelo fue antes del 2 de junio de 2023: el procedimiento de AESA es informativo (no obliga a la aerolínea), pero el informe sirve como prueba muy sólida si acabas yendo a juicio.',
          'Cómo reclamar ante AESA: ve a https://sede.seguridadaerea.gob.es y busca "Reclamaciones pasajeros". El procedimiento es completamente online y GRATUITO.',
          'IMPORTANTE: AESA solo gestiona vuelos que salen de España o de un país de la UE en aerolíneas europeas. Si tu vuelo no cumple estos requisitos, ve directamente al Paso 3.'
        ]
      },
      {
        titulo: 'PASO 3 — Si la aerolínea no cumple la resolución de AESA',
        contenido: [
          'Si AESA resolvió a tu favor y la aerolínea no cumple en 1 mes, puedes solicitar su ejecución directamente en el juzgado.',
          'Para importes hasta 2.000€ puedes presentar un Juicio Verbal sin abogado ni procurador.',
          'Para importes superiores a 2.000€ se recomienda asesoramiento jurídico.'
        ]
      },
      {
        titulo: 'COMPENSACIONES A LAS QUE PUEDES TENER DERECHO',
        contenido: [
          'Retraso de 3 o más horas en el destino final: entre 250€ y 600€ según la distancia del vuelo.',
          'Cancelación con menos de 14 días de antelación: mismas compensaciones que el retraso.',
          'Denegación de embarque (overbooking): entre 250€ y 600€ según la distancia.',
          'Además de la compensación económica, tienes derecho a asistencia (comida, bebida, alojamiento si es necesario) mientras esperas.',
          'Estas compensaciones están reguladas por el Reglamento (CE) nº 261/2004 de obligado cumplimiento en toda la UE.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'Billete de avión y tarjetas de embarque (físicas o digitales).',
          'Emails o notificaciones recibidas de la aerolínea.',
          'Tickets de gastos en los que hayas incurrido por el retraso (comida, hotel, transporte).',
          'El escrito de reclamación enviado y su justificante.',
          'Cualquier respuesta recibida de la aerolínea.'
        ]
      }
    ]
  },

  'Banca y seguros': {
    organismo: 'Banco de España — Departamento de Conducta de Entidades',
    enlace: 'https://www.bde.es/wbe/es/punto-informacion/contenidos/gestiones/reclamaciones/',
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito al Servicio de Atención al Cliente (SAC) del banco',
        contenido: [
          'Todos los bancos y aseguradoras tienen un Servicio de Atención al Cliente (SAC) obligatorio por ley.',
          'Cómo encontrarlo: escribe en Google "[nombre del banco] Servicio de Atención al Cliente reclamación escrito" y accede a su web oficial.',
          'Envía el escrito por escrito, no solo por teléfono. Usa su formulario web, email o carta certificada.',
          'Plazos legales de respuesta del banco:',
          '— 15 días hábiles para reclamaciones sobre servicios de pago (tarjetas, transferencias, cuentas, recibos domiciliados).',
          '— 1 mes para el resto de reclamaciones si eres consumidor.',
          'Guarda el justificante de envío y anota la fecha exacta.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden en plazo o la respuesta es negativa',
        contenido: [
          'Acude al Banco de España — Departamento de Conducta de Entidades.',
          'Online (más rápido): ve a https://www.bde.es/wbe/es/punto-informacion/contenidos/gestiones/reclamaciones/ y sigue las instrucciones.',
          'Presencial: C/ Alcalá 48, 28014 Madrid, o en cualquier sucursal del Banco de España.',
          'Por correo postal: Banco de España, Departamento de Conducta de Entidades, C/ Alcalá 48, 28014 Madrid.',
          'El procedimiento es completamente GRATUITO.',
          'Plazo de resolución: 4 meses (en la práctica entre 5 y 7 meses en 2026).',
          'El informe del Banco de España no obliga legalmente al banco, pero tiene un efecto muy fuerte: la mayoría de bancos ceden para evitar sanciones de su propio supervisor.',
          'Para reclamaciones a aseguradoras: el organismo equivalente es la DGSFP. Búscala en Google: "DGSFP reclamaciones seguros España".'
        ]
      },
      {
        titulo: 'PASO 3 — Si el banco no cede tras el informe del Banco de España',
        contenido: [
          'Vía judicial con el informe del Banco de España como prueba muy favorable.',
          'Para importes hasta 2.000€ puedes presentar un Juicio Verbal sin abogado ni procurador.',
          'Para importes superiores o casos complejos (hipotecas, cláusulas abusivas) se recomienda asesoramiento jurídico especializado.',
          'En 2025-2026 también puedes acudir al nuevo Defensor del Cliente Financiero, con poderes más amplios que el Banco de España.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'El escrito de reclamación enviado y su justificante.',
          'Extractos bancarios o documentos que acrediten el problema.',
          'Contrato del producto reclamado.',
          'Cualquier comunicación recibida del banco.',
          'Si tienes respuesta del SAC del banco, consérvala aunque sea negativa — es necesaria para acudir al Banco de España.'
        ]
      }
    ]
  },

  'Administración pública': {
    organismo: 'AEAT — Sede Electrónica / TEAR',
    enlace: 'https://sede.agenciatributaria.gob.es/Sede/recursos-reclamaciones-otros-procedimientos-revision-suspensiones/reposicion-via-economico-administrativa.html',
    telefono: null,
    pasos: [
      {
        titulo: 'ANTES DE EMPEZAR — Elige una de estas dos vías (son excluyentes, no puedes usar las dos a la vez)',
        contenido: [
          'VÍA A — Recurso de Reposición: se presenta ante el mismo organismo que dictó el acto. Más rápido pero menos independiente.',
          'VÍA B — Reclamación Económico-Administrativa (TEAR): se presenta ante el Tribunal Económico-Administrativo Regional. Más independiente.',
          'IMPORTANTE: si presentas primero el Recurso de Reposición, debes esperar a que se resuelva antes de poder ir al TEAR.',
          'Plazo para presentar cualquiera de las dos vías: 1 MES desde la notificación del acto que quieres recurrir. No lo dejes pasar.'
        ]
      },
      {
        titulo: 'PASO 1 — Presenta tu recurso o reclamación',
        contenido: [
          'La forma más cómoda es hacerlo online en la Sede Electrónica de la AEAT.',
          'Necesitas: certificado digital, DNIe o Cl@ve. Si no tienes ninguno, puedes solicitarlo en cualquier oficina de la AEAT.',
          'Para el Recurso de Reposición: ve a https://sede.agenciatributaria.gob.es y busca "Recurso de reposición".',
          'Para la Reclamación Económico-Administrativa: ve a https://sede.agenciatributaria.gob.es y busca "Reclamación económico-administrativa".',
          'Adjunta tu escrito de reclamación y toda la documentación que acredite tu caso.',
          'También puedes presentarlo presencialmente en cualquier oficina de la AEAT o por correo certificado.'
        ]
      },
      {
        titulo: 'PASO 2 — Plazos de resolución',
        contenido: [
          'Recurso de Reposición: la AEAT tiene 1 mes para resolver. Si no resuelve en ese plazo, se considera desestimado por silencio administrativo.',
          'Reclamación Económico-Administrativa (TEAR): el plazo es de 1 año, aunque en la práctica puede alargarse.',
          'IMPORTANTE: mientras dure el proceso, Hacienda puede seguir cobrando, a menos que pidas expresamente la SUSPENSIÓN del acto. Puedes solicitarla si aportas garantía (aval bancario) o en casos especiales sin garantía.'
        ]
      },
      {
        titulo: 'PASO 3 — Si la resolución es desfavorable',
        contenido: [
          'Recurso Contencioso-Administrativo ante los juzgados. En esta fase sí necesitas abogado y procurador.',
          'Plazo: 2 meses desde la notificación de la resolución desfavorable.',
          'Para la DGT (multas de tráfico): el procedimiento es similar pero ante el organismo correspondiente de tu comunidad autónoma.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'La notificación original del acto administrativo que recurres (con fecha de notificación).',
          'El escrito de reclamación presentado y su justificante con número de registro.',
          'Cualquier documentación que acredite tu posición (facturas, contratos, justificantes de pago).',
          'Las fechas son críticas: anota siempre el día exacto en que recibiste cada notificación.'
        ]
      }
    ]
  },

  'Energía y suministros': {
    organismo: 'CNMC — Comisión Nacional de Mercados y la Competencia',
    enlace: 'https://sede.cnmc.gob.es',
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito a la empresa',
        contenido: [
          'Cómo encontrar el canal oficial: escribe en Google "[nombre de la empresa, ej: Iberdrola] atención al cliente reclamación escrito" y accede a su web oficial.',
          'Envía el escrito por escrito (email o correo certificado), no solo por teléfono.',
          'Plazo legal de respuesta de la empresa: 1 MES.',
          'Guarda el justificante de envío y anota el número de referencia que te den.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden en 1 mes o la respuesta es insatisfactoria',
        contenido: [
          'Acude a la CNMC (Comisión Nacional de Mercados y la Competencia) para problemas de facturación, contratos, cambios de compañía o calidad del servicio.',
          'Online: ve a https://sede.cnmc.gob.es y busca el trámite correspondiente a energía.',
          'También puedes acudir a la Consejería de Energía o Consumo de tu Comunidad Autónoma, que tiene competencias propias en este ámbito. Búscala en Google: "reclamación energía [tu comunidad autónoma] consumo".',
          'Otra opción complementaria: la Oficina Municipal de Información al Consumidor (OMIC) de tu ayuntamiento. Es gratuita y puede mediar con la empresa. Búscala en Google: "OMIC [tu ciudad]".',
          'Todos estos procedimientos son GRATUITOS.'
        ]
      },
      {
        titulo: 'PASO 3 — Si nada funciona',
        contenido: [
          'Junta Arbitral de Consumo de tu comunidad autónoma: gratuita y sin necesidad de abogado.',
          'Vía judicial: para importes hasta 2.000€ sin abogado ni procurador (Juicio Verbal).',
          'Para importes superiores se recomienda asesoramiento jurídico.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'Facturas de los últimos 12 meses (en ellas aparece el código CUPS que identifica tu suministro).',
          'Contrato de suministro.',
          'El escrito de reclamación enviado y su justificante.',
          'Cualquier comunicación recibida de la empresa.',
          'Si hubo corte de suministro: anota fecha y hora exactas del corte y la reposición.'
        ]
      }
    ]
  },

  'Comercio y tiendas online': {
    organismo: 'Junta Arbitral de Consumo / Plataforma Europea ODR',
    enlace: 'https://www.dsca.gob.es/es/consumo/como-reclamar-conflicto-consumo/sistema-arbitral-consumo',
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito al vendedor',
        contenido: [
          'Cómo encontrar el canal oficial: escribe en Google "[nombre de la tienda] atención al cliente reclamación" y accede a su web oficial o a su formulario de contacto.',
          'Si compraste a través de una plataforma (Amazon, AliExpress, etc.) pero el vendedor es un tercero, reclama primero al vendedor y, si no resuelve, a la propia plataforma — muchas ofrecen "Garantía A-Z" o programas de protección al comprador.',
          'Plazo legal de respuesta: aunque no siempre hay un plazo único fijado por ley, se considera razonable 1 MES; si es una devolución por desistimiento, el reembolso debe producirse en 14 días naturales desde que el vendedor conoce tu decisión.',
          'Guarda el justificante de envío de tu reclamación y cualquier número de incidencia que te den.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden o la respuesta no te convence',
        contenido: [
          'Si la compra fue online (a un vendedor de la UE), puedes usar la Plataforma Europea de Resolución de Litigios en Línea (ODR): https://ec.europa.eu/consumers/odr — conecta tu reclamación con un organismo de consumo competente.',
          'Sistema Arbitral de Consumo: solicita el arbitraje ante la Junta Arbitral de Consumo de tu localidad o provincia. Es voluntario, gratuito y su resolución es vinculante para ambas partes.',
          'Más información y localizador de tu Junta Arbitral: https://www.dsca.gob.es/es/consumo/como-reclamar-conflicto-consumo/sistema-arbitral-consumo',
          'Oficina Municipal de Información al Consumidor (OMIC) de tu ayuntamiento: gratuita, puede mediar con la empresa. Búscala en Google: "OMIC [tu ciudad]".',
          'Todos estos procedimientos son GRATUITOS.'
        ]
      },
      {
        titulo: 'PASO 3 — Si nada funciona',
        contenido: [
          'Vía judicial: para importes hasta 2.000€ puedes presentar un Juicio Verbal sin abogado ni procurador.',
          'Para importes superiores se recomienda asesoramiento jurídico.',
          'Si el pago se hizo con tarjeta, valora también solicitar a tu banco la retrocesión del cargo ("chargeback") si el vendedor incumplió gravemente.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'Confirmación del pedido y factura o justificante de compra.',
          'Capturas de pantalla del anuncio o descripción del producto.',
          'Justificante de pago (extracto de tarjeta, PayPal, etc.).',
          'El escrito de reclamación enviado y su justificante.',
          'Cualquier comunicación recibida del vendedor o la plataforma.'
        ]
      }
    ]
  },

  'Sanidad y salud': {
    organismo: 'Servicio de Atención al Paciente / Inspección de Servicios Sanitarios',
    enlace: null,
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Presenta tu escrito en el centro (sanidad pública) o a la aseguradora/clínica (privada)',
        contenido: [
          'Sanidad pública: dirígete al Servicio o Unidad de Atención al Paciente del hospital o centro de salud. Todos los centros públicos están obligados a tenerlo.',
          'Sanidad privada o seguro médico: envía tu escrito al Servicio de Atención al Cliente de la aseguradora o clínica. Búscalo en Google: "[nombre de la aseguradora o clínica] atención al cliente reclamación".',
          'Plazo legal de respuesta: 30 días hábiles en sanidad pública desde que tu reclamación entra en la Consejería de Sanidad correspondiente.',
          'Exige siempre un número de registro o referencia de tu reclamación.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden en plazo o la respuesta no te convence',
        contenido: [
          'Sanidad pública: acude a la Inspección de Servicios Sanitarios de la Consejería de Sanidad de tu Comunidad Autónoma. Búscala en Google: "Inspección de Servicios Sanitarios [tu comunidad autónoma]".',
          'También puedes dirigirte al Defensor del Paciente de tu comunidad autónoma, si existe esa figura.',
          'Sanidad privada / seguros médicos: si la reclamación es sobre el seguro (cobertura, facturación), acude a la DGSFP. Búscala en Google: "DGSFP reclamaciones seguros España".',
          'Para la calidad asistencial de una clínica privada también puedes acudir a la Consejería de Sanidad de tu comunidad autónoma, que supervisa a todos los centros, públicos y privados.',
          'Estos procedimientos son GRATUITOS.'
        ]
      },
      {
        titulo: 'PASO 3 — Si la resolución no es favorable',
        contenido: [
          'Si consideras que ha habido negligencia médica con daño real, valora solicitar tu historia clínica completa y consulta con un abogado especializado en responsabilidad sanitaria — este tipo de casos suele requerir asesoramiento profesional e informe pericial.',
          'Para reclamaciones puramente económicas (facturación, reembolsos) de importes hasta 2.000€, puedes presentar un Juicio Verbal sin abogado ni procurador.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'Tu historia clínica o informes médicos relacionados (puedes solicitarlos por escrito, es un derecho reconocido por ley).',
          'Facturas o justificantes de pago si es sanidad privada.',
          'El escrito de reclamación enviado y su justificante con número de registro.',
          'Cualquier comunicación recibida del centro, aseguradora o administración.',
          'Anota fechas exactas de cada asistencia y de cada gestión realizada.'
        ]
      }
    ]
  },

  'Inmobiliaria y alquiler': {
    organismo: 'Oficina de Vivienda / organismo de fianzas de tu Comunidad Autónoma',
    enlace: null,
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito a la otra parte (arrendador, arrendatario o inmobiliaria)',
        contenido: [
          'Envía el escrito preferiblemente por burofax con acuse de recibo y certificación de contenido — es la prueba más sólida de que se ha enviado y qué se ha enviado.',
          'Si reclamas la devolución de la fianza: el plazo habitual para que el arrendador la devuelva es de 1 MES desde la entrega de llaves.',
          'Guarda copia del contrato de arrendamiento o compraventa y del burofax enviado.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no hay respuesta o acuerdo',
        contenido: [
          'Fianzas: el arrendador está obligado a depositar la fianza en el organismo de vivienda de tu Comunidad Autónoma (por ejemplo, Agencia de Vivienda Social en Madrid, INCASÒL en Cataluña, o el organismo equivalente en tu región — búscalo en Google: "depósito fianza alquiler [tu comunidad autónoma]").',
          'Mediación en conflictos de arrendamiento: varias comunidades autónomas ofrecen servicios gratuitos de mediación en vivienda. Búscalo en Google: "mediación alquiler [tu comunidad autónoma]".',
          'Si la otra parte es una empresa o inmobiliaria (no un particular), también puedes acudir a la Junta Arbitral de Consumo o a la OMIC de tu ayuntamiento.',
          'Estos procedimientos son gratuitos o de bajo coste.'
        ]
      },
      {
        titulo: 'PASO 3 — Si nada funciona',
        contenido: [
          'Demanda de Juicio Verbal para reclamación de cantidad (por ejemplo, devolución de fianza): para importes hasta 2.000€ no necesitas abogado ni procurador.',
          'Para desahucios, incumplimientos contractuales complejos o importes superiores, se recomienda asesoramiento jurídico especializado en arrendamientos urbanos.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'El contrato de arrendamiento o compraventa completo.',
          'Justificante del depósito de la fianza (si lo tienes) o de los pagos realizados.',
          'Fotografías del estado del inmueble (entrada y salida, si aplica).',
          'El burofax o escrito enviado y su justificante de entrega.',
          'Cualquier comunicación recibida de la otra parte.'
        ]
      }
    ]
  },

  'Educación': {
    organismo: 'Consejería de Educación / Servicio de Inspección Educativa',
    enlace: null,
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito a la dirección del centro',
        contenido: [
          'Presenta tu escrito ante la Secretaría o Dirección del centro educativo, y pide que te sellen o registren una copia como acuse de recibo.',
          'Si el centro es privado o concertado y el asunto es económico (cuotas, matrícula), trátalo también como una reclamación de consumo: guarda toda factura o recibo.',
          'Plazo razonable de respuesta: 1 MES.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden o la respuesta no te convence',
        contenido: [
          'Acude a la Delegación o Dirección Provincial de Educación de tu Comunidad Autónoma, a través del Servicio de Inspección Educativa. Búscalo en Google: "Inspección Educativa [tu comunidad autónoma]".',
          'Se puede presentar presencialmente, por correo postal, o mediante la sede electrónica de tu Comunidad Autónoma con certificado digital, DNIe o Cl@ve.',
          'Si el centro es privado o concertado y te cobran indebidamente por enseñanzas gratuitas, indícalo expresamente: la ley (LOMLOE) lo prohíbe de forma expresa.',
          'Para universidades: también puedes acudir al Defensor Universitario de tu universidad, si existe esa figura.',
          'Si el conflicto es puramente económico con un centro privado, la Junta Arbitral de Consumo y la OMIC de tu ayuntamiento son también una vía válida.',
          'Estos procedimientos son GRATUITOS.'
        ]
      },
      {
        titulo: 'PASO 3 — Si la resolución no es favorable',
        contenido: [
          'Recurso ante la propia Consejería de Educación si la resolución de la Inspección no te satisface.',
          'Para reclamaciones puramente económicas de hasta 2.000€, puedes presentar un Juicio Verbal sin abogado ni procurador.',
          'Para casos complejos se recomienda asesoramiento jurídico.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'El escrito de reclamación presentado y su justificante o sello de registro.',
          'Facturas, recibos o justificantes de pago de cuotas o matrícula.',
          'Comunicaciones recibidas del centro (email, circulares, notas).',
          'Cualquier normativa o circular del centro relacionada con el problema.'
        ]
      }
    ]
  },

  'Otro': {
    organismo: 'Junta Arbitral de Consumo / OMIC',
    enlace: 'https://www.dsca.gob.es/es/consumo/como-reclamar-conflicto-consumo/sistema-arbitral-consumo',
    telefono: null,
    pasos: [
      {
        titulo: 'PASO 1 — Envía tu escrito a la empresa o entidad',
        contenido: [
          'Cómo encontrar el canal oficial: escribe en Google "[nombre de la empresa] atención al cliente reclamación escrito" y accede a su web oficial.',
          'Envía el escrito por un medio que deje constancia (email con acuse de recibo, formulario web con confirmación, o burofax si el asunto es relevante).',
          'Plazo razonable de respuesta: 1 MES.',
          'Guarda el justificante de envío y cualquier número de referencia que te den.'
        ]
      },
      {
        titulo: 'PASO 2 — Si no responden o la respuesta no te convence',
        contenido: [
          'Oficina Municipal de Información al Consumidor (OMIC) de tu ayuntamiento: gratuita, puede mediar con la empresa. Búscala en Google: "OMIC [tu ciudad]".',
          'Sistema Arbitral de Consumo: solicita el arbitraje ante la Junta Arbitral de Consumo de tu localidad o provincia. Es voluntario, gratuito y vinculante para ambas partes si la empresa está adherida.',
          'Más información y localizador de tu Junta Arbitral: https://www.dsca.gob.es/es/consumo/como-reclamar-conflicto-consumo/sistema-arbitral-consumo',
          'Todos estos procedimientos son GRATUITOS.'
        ]
      },
      {
        titulo: 'PASO 3 — Si nada funciona',
        contenido: [
          'Vía judicial: para importes hasta 2.000€ puedes presentar un Juicio Verbal sin abogado ni procurador.',
          'Para importes superiores o casos complejos se recomienda asesoramiento jurídico profesional.'
        ]
      },
      {
        titulo: 'DOCUMENTACIÓN QUE DEBES CONSERVAR SIEMPRE',
        contenido: [
          'El escrito de reclamación enviado y su justificante.',
          'Facturas, contratos o justificantes relacionados con tu caso.',
          'Cualquier comunicación recibida de la otra parte.',
          'Anota la fecha exacta de cada gestión que realices.'
        ]
      }
    ]
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { categoria, empresa, ciudad, nombre, fecha } = req.body;

  if (!categoria) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const guia = GUIAS[categoria] || GUIAS['Otro'];

  const fechaFormateada = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return res.status(200).json({
    guia,
    empresa,
    ciudad,
    nombre,
    fecha: fechaFormateada
  });
}
