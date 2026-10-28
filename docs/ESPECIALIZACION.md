# Especialización: cobros de telefonía o fibra después de la baja

Rama `especializacion-telefonia`. Estado anterior recuperable con la etiqueta `respaldo-generalista-2026-10-28`.
No se ha publicado nada en producción.

## Marca provisional

Propuestas (no se ha comprobado su disponibilidad en la OEPM, la EUIPO ni en registros de dominios):

1. **BajaClara** (recomendada y en uso): breve, dice "tu baja está clara" sin prometer resultado.
2. **TrasLaBaja**: describe el problema, menos memorable.
3. **CuotaDeMás**: directa, pero suena a promesa de devolución.

La marca se cambia en `config-publica.js` (`MARCA`). El símbolo (`marca/simbolo.svg`, un enchufe desconectado) no lleva texto, así que sirve con cualquier nombre; `marca/logo.svg` y `marca/logo-oscuro.svg` sí llevan el nombre escrito. Dominio, rutas e identidad legal (`PRESTADOR`) no dependen de la marca. Tras cambiarla: `npm run paginas` y regenerar `marca/og.png`.

## Precios y límites

En `config-publica.js`: reclamación a la compañía 13,99 € y expediente para la Oficina 29,90 € (IVA incluido; hipótesis comerciales). El servidor cobra el importe de ahí con `price_data` de Stripe (ya no usa `STRIPE_PRICE_*`). Límites: 10 archivos, 10 MB por archivo, 30 MB y 80 páginas en total, 40 páginas por PDF.

## Cómo funciona

- **Paso 1** (`api/_reglas.js`): reglas deterministas. Asignan A (reclamar a la compañía), B (Oficina), incompleto (qué falta), excluido (por qué) o nada. No se guarda nada si no encaja.
- **Paso 2**: subida en trozos de 3 MB, validación por contenido (firma del archivo, apertura con pdf-lib, PDF cifrados y HEIC rechazados con explicación). La IA (`api/_extraccion.js`, `claude-opus-5-5` con salida JSON estricta) solo propone datos literales con su archivo y página; el texto de los documentos se trata como dato no confiable. El servidor valida fechas, importes y páginas, marca contradicciones y el cliente confirma todo.
- **Importes**: solo se reclaman los días posteriores a la fecha en que la baja debía surtir efecto (la pedida o dos días hábiles después; sábados y festivos nacionales se tratan como inhábiles para no reclamar de más). Las facturas que cubren periodos anteriores se excluyen o prorratean.
- **Paso 3**: resumen con cifras, sin el escrito. Antes de crear el pago se generan los documentos completos en una prueba (sin guardarla) para no cobrar si un anexo no se puede incorporar.
- **Entrega** (`api/_pago.js`): solo con aviso de Stripe con firma válida y sesión, importe, moneda, producto y expediente coincidentes; idempotente; si el aviso no llega, `api/estado.js` consulta la sesión a Stripe; si la generación falla, se reintenta y se avisa. Descarga con billete de un solo uso (2 min); enlace por email con token en el fragmento de la URL, 30 días.
- **Documentos** (`api/_entregables.js`, plantillas sin IA): A = escrito + índice + anexos numerados en un PDF, guía y confirmación del pedido con las condiciones. B = formulario oficial de la Oficina rellenado (`api/_recursos/formulario-oaut.pdf`, descargado el 28/10/2026), escrito explicativo, relación de importes, índice, anexos (también por separado), guía y confirmación.

## Fuentes comprobadas (28/10/2026)

| Regla | Fuente | Cómo se comprobó |
|---|---|---|
| No facturar tras el plazo de dos días de la baja | RD 899/2009, art. 7 (BOE-A-2009-8961) | API de datos abiertos del BOE, texto consolidado |
| Número de referencia de reclamaciones | RD 899/2009, art. 26.2 | Ídem |
| Ámbito, exclusiones, reclamación previa (1 mes), plazo de 3 meses | Orden ITC/1030/2007, arts. 3, 4 y 9 | PDF original del BOE (no está en la API consolidada) y web oficial de la Oficina |
| Presentación, formulario, dirección | usuariosteleco.digital.gob.es | Páginas oficiales y formulario descargado |
| Ley 10/2025 de atención a la clientela | BOE-A-2025-26698 | Ficha del BOE; adaptación hasta el 28/12/2026 |

El cron diario consulta de verdad la API del BOE y avisa si esas normas cambian o se derogan (`NORMAS_VIGILADAS`).

**Auditoría de la versión anterior:** la consulta al BOE usaba `https://www.boe.es/buscar/api/json`, que devuelve 404, así que nunca aportaba nada; las etiquetas "verificado" y los mensajes de carga ("Consultando el BOE…", "Verificando legislación en EUR-Lex…") eran fijos; EUR-Lex no se consultaba nunca. Además, `/api/generar` devolvía el escrito completo al navegador antes de pagar, el navegador lo reenviaba a `/api/checkout` y lo que se entregaba era ese texto. Todo eso se ha retirado.

## Archivos eliminados

`api/generar.js`, `api/guia.js`, `api/pdf.js` (sin uso, marca antigua), `api/_escrito.js`, `api/_anexos.js`, `app.js` (sin referencias), `aeropuertos-datalist.js`, `reclamar.css`, `styles.css`, `cookies.js` (no hay cookies), `marca-agua.png`, `icon-watermark.png`, `og-image.png`, `favicon-16.png`, `favicon-32.png`, dependencia `jspdf`. Se conserva `logo-reclamoia.png` porque lo cargan los emails ya enviados a clientes anteriores. Las páginas de vuelos y bancos se mantienen con información útil y enlaces oficiales (sin redirigirlas a telefonía); `verificar.html` sigue funcionando para escritos antiguos.

## Variables de entorno

Siguen: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `ALERTAS_EMAIL`. Nueva obligatoria: `CRON_SECRET` (sin ella el cron responde 401). Opcional: `URL_PUBLICA`. Ya no se usan: `STRIPE_PRICE_COMPLETO`, `STRIPE_PRICE_ESCRITO`, `PDFSHIFT_API_KEY`.

## Probar en local

```
npm install
npm test          # 22 pruebas: reglas, cálculo, extracción, flujo A y B, avisos de Stripe y accesos cruzados
npm run dev       # http://localhost:5050 con memoria local y pasarela de pago simulada
```

## Bloqueos antes de lanzar

1. **Stripe en modo prueba en la vista previa.** Al subir la rama, Vercel crea una vista previa con las variables de "Preview". Si ahí están las claves reales, se cobraría de verdad. Hay que poner claves y webhook de prueba en Preview antes de subirla.
2. **Prueba real de lectura con IA**: no hay clave de Anthropic en local; la lectura se ha probado con respuestas simuladas y el camino sin IA (datos a mano). Hay que probarla con facturas reales de varias compañías en la vista previa.
3. **Envío de emails** con Resend: no probado en local (sin clave).
4. **`CRON_SECRET`** en Vercel.
5. **Facturas**: el recibo de Stripe no es una factura. Hay que decidir cómo se emiten (facturas simplificadas) con un asesor fiscal.

## Validaciones profesionales necesarias

Implementar no equivale a certificar cumplimiento. Antes de lanzar conviene que un profesional revise:

- Plantillas del escrito y del escrito explicativo, y el criterio de prorrateo por días.
- Condiciones: encaje del desistimiento (art. 103.a TRLGDCU, servicio totalmente ejecutado) frente a contenido digital (103.m).
- Privacidad: adhesión de cada proveedor al Marco de Privacidad UE-EE. UU., región de Upstash, plazo de 5 años del registro de pedido, base del recordatorio.
- Vigencia de la Orden ITC/1030/2007 (no figura en la API consolidada del BOE) y efectos de la Ley 10/2025 a partir del 28/12/2026.
- Que la Oficina acepte el formulario con el escrito explicativo adjunto tal como se entrega, y el tamaño máximo de archivos de su sede electrónica (no publicado).
- Disponibilidad de la marca.

## Limitaciones conocidas

- Festivos autonómicos y locales no se cuentan (se compensa tratando los sábados como inhábiles).
- Fotos HEIC no se aceptan (el iPhone las convierte a JPG al elegirlas desde la fototeca).
- Bajas por portabilidad, permanencias, dispositivos, equipos, morosos, suplantación, daños, juicios y empresas quedan fuera.
- Los canales de reclamación de cada compañía no se han verificado: la guía pide usar uno que deje constancia.
