// Maquetación de PDF con pdf-lib, sin servicios externos: el texto del cliente no sale del servidor.
import { PDFDocument, StandardFonts, rgb, degrees, PDFName } from 'pdf-lib';
import { orientacionJpeg } from './_archivos.js';

export const A4 = [595.28, 841.89];
const MARGEN = 56;
const TINTA = rgb(0.09, 0.13, 0.16);
const GRIS = rgb(0.42, 0.45, 0.48);
const LINEA = rgb(0.82, 0.84, 0.86);

// Caracteres que admiten las fuentes estándar de PDF (WinAnsi). El resto se sustituye.
const PERMITIDOS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const SUSTITUTOS = { '≥': '>=', '≤': '<=', '→': '->', '✓': 'Sí', '·': '·', ' ': ' ', '\t': '    ' };

export function textoSeguro(valor) {
  return Array.from(String(valor ?? '').normalize('NFC')).map((c) => {
    if (SUSTITUTOS[c]) return SUSTITUTOS[c];
    const n = c.codePointAt(0);
    if ((n >= 0x20 && n <= 0x7e) || (n >= 0xa0 && n <= 0xff) || PERMITIDOS.has(c)) return c;
    if (c === '\n') return c;
    return '';
  }).join('');
}

export class Maquetador {
  static async crear(pdf = null) {
    const doc = pdf || await PDFDocument.create();
    const m = new Maquetador();
    m.doc = doc;
    m.normal = await doc.embedFont(StandardFonts.Helvetica);
    m.negrita = await doc.embedFont(StandardFonts.HelveticaBold);
    m.cursiva = await doc.embedFont(StandardFonts.HelveticaOblique);
    m.paginasPropias = [];
    m.pagina = null;
    return m;
  }

  nuevaPagina() {
    this.pagina = this.doc.addPage(A4);
    this.paginasPropias.push(this.pagina);
    this.y = A4[1] - MARGEN;
    return this.pagina;
  }

  get ancho() {
    return A4[0] - MARGEN * 2;
  }

  asegurar(alto) {
    if (!this.pagina || this.y - alto < MARGEN + 24) this.nuevaPagina();
  }

  partir(texto, fuente, tam, anchoMax) {
    const lineas = [];
    for (const parrafo of textoSeguro(texto).split('\n')) {
      const palabras = parrafo.split(/ +/);
      let actual = '';
      for (const palabra of palabras) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (fuente.widthOfTextAtSize(prueba, tam) <= anchoMax) {
          actual = prueba;
          continue;
        }
        if (actual) lineas.push(actual);
        // Palabras más largas que la línea (p. ej. una URL): se cortan.
        let resto = palabra;
        while (fuente.widthOfTextAtSize(resto, tam) > anchoMax) {
          let i = resto.length - 1;
          while (i > 1 && fuente.widthOfTextAtSize(resto.slice(0, i), tam) > anchoMax) i--;
          lineas.push(resto.slice(0, i));
          resto = resto.slice(i);
        }
        actual = resto;
      }
      lineas.push(actual);
    }
    return lineas;
  }

  texto(contenido, { tam = 10.5, fuente = 'normal', color = TINTA, sangria = 0, interlineado = 1.45, despues = 6, alinear = 'izquierda' } = {}) {
    const f = this[fuente];
    const anchoMax = this.ancho - sangria;
    const lineas = this.partir(contenido, f, tam, anchoMax);
    const alto = tam * interlineado;
    for (const linea of lineas) {
      this.asegurar(alto);
      const anchoLinea = f.widthOfTextAtSize(linea, tam);
      const x = alinear === 'derecha' ? MARGEN + this.ancho - anchoLinea : MARGEN + sangria;
      this.pagina.drawText(linea, { x, y: this.y - tam, size: tam, font: f, color });
      this.y -= alto;
    }
    this.y -= despues;
  }

  titulo(contenido, { tam = 14, despues = 8 } = {}) {
    this.asegurar(tam * 3);
    this.texto(contenido, { tam, fuente: 'negrita', despues });
  }

  separador(espacio = 8) {
    this.asegurar(espacio * 2);
    this.y -= espacio;
    this.pagina.drawLine({ start: { x: MARGEN, y: this.y }, end: { x: MARGEN + this.ancho, y: this.y }, thickness: 0.6, color: LINEA });
    this.y -= espacio;
  }

  espacio(alto = 8) {
    this.y -= alto;
  }

  // Tabla sencilla: columnas = [{ titulo, ancho (fracción), alinear }]
  tabla(columnas, filas, { tam = 9 } = {}) {
    const anchos = columnas.map(c => c.ancho * this.ancho);
    const dibujarFila = (celdas, fuente, fondo) => {
      const partidas = celdas.map((c, i) => this.partir(String(c ?? ''), fuente, tam, anchos[i] - 8));
      const altoFila = Math.max(...partidas.map(p => p.length)) * tam * 1.35 + 8;
      this.asegurar(altoFila);
      if (fondo) this.pagina.drawRectangle({ x: MARGEN, y: this.y - altoFila, width: this.ancho, height: altoFila, color: fondo });
      let x = MARGEN;
      partidas.forEach((lineas, i) => {
        lineas.forEach((linea, j) => {
          const w = fuente.widthOfTextAtSize(linea, tam);
          const xi = columnas[i].alinear === 'derecha' ? x + anchos[i] - 4 - w : x + 4;
          this.pagina.drawText(linea, { x: xi, y: this.y - 4 - tam - j * tam * 1.35, size: tam, font: fuente, color: TINTA });
        });
        x += anchos[i];
      });
      this.y -= altoFila;
      this.pagina.drawLine({ start: { x: MARGEN, y: this.y }, end: { x: MARGEN + this.ancho, y: this.y }, thickness: 0.4, color: LINEA });
    };
    dibujarFila(columnas.map(c => c.titulo), this.negrita, rgb(0.94, 0.96, 0.95));
    filas.forEach(f => dibujarFila(f, this.normal));
    this.y -= 8;
  }

  // Pie con referencia y numeración en las páginas generadas por nosotros (no en los anexos del cliente).
  numerar(etiqueta) {
    const total = this.paginasPropias.length;
    this.paginasPropias.forEach((p, i) => {
      const texto = textoSeguro(`${etiqueta} · página ${i + 1} de ${total}`);
      p.drawText(texto, { x: MARGEN, y: 28, size: 7.5, font: this.normal, color: GRIS });
    });
  }
}

function paginaSeparadora(m, numero, anexo) {
  const p = m.doc.addPage(A4);
  const { width, height } = p.getSize();
  const centrar = (t, fuente, tam, y, color = TINTA) => {
    const s = textoSeguro(t);
    p.drawText(s, { x: (width - fuente.widthOfTextAtSize(s, tam)) / 2, y, size: tam, font: fuente, color });
  };
  centrar(`ANEXO ${numero}`, m.negrita, 28, height / 2 + 20);
  const nombre = m.partir(anexo.nombre, m.normal, 11, width - 160)[0] || '';
  centrar(nombre, m.normal, 11, height / 2 - 10, GRIS);
  centrar(`${anexo.descripcion} · ${anexo.paginas} ${anexo.paginas === 1 ? 'página' : 'páginas'}`, m.normal, 10, height / 2 - 28, GRIS);
}

async function anadirImagen(m, numero, anexo) {
  const esPng = anexo.tipo === 'image/png';
  const img = esPng ? await m.doc.embedPng(anexo.bytes) : await m.doc.embedJpg(anexo.bytes);
  const orient = esPng ? 1 : orientacionJpeg(anexo.bytes);
  const girada = [5, 6, 7, 8].includes(orient);
  const anchoVisible = girada ? img.height : img.width;
  const altoVisible = girada ? img.width : img.height;
  const apaisada = anchoVisible > altoVisible * 1.15;
  const p = m.doc.addPage(apaisada ? [A4[1], A4[0]] : A4);
  const { width, height } = p.getSize();
  const margen = 36;
  const rotulo = textoSeguro(`Anexo ${numero} · ${anexo.nombre}`);
  p.drawText(m.partir(rotulo, m.normal, 8, width - margen * 2)[0], { x: margen, y: height - margen + 8, size: 8, font: m.normal, color: GRIS });
  // La imagen se escala entera dentro de la página: nunca se recorta.
  const dispW = width - margen * 2;
  const dispH = height - margen * 2 - 16;
  const escala = Math.min(dispW / anchoVisible, dispH / altoVisible);
  const w = img.width * escala;
  const h = img.height * escala;
  const vw = anchoVisible * escala;
  const vh = altoVisible * escala;
  const x0 = (width - vw) / 2;
  const y0 = margen + (dispH - vh) / 2;
  if (orient === 6 || orient === 5) p.drawImage(img, { x: x0, y: y0 + vh, width: w, height: h, rotate: degrees(-90) });
  else if (orient === 8 || orient === 7) p.drawImage(img, { x: x0 + vw, y: y0, width: w, height: h, rotate: degrees(90) });
  else if (orient === 3 || orient === 4) p.drawImage(img, { x: x0 + vw, y: y0 + vh, width: w, height: h, rotate: degrees(180) });
  else p.drawImage(img, { x: x0, y: y0, width: w, height: h });
}

// Incorpora los documentos del cliente, en orden, tras una página separadora numerada.
// Las páginas de los PDF se copian íntegras, sin tocar su contenido.
export async function anadirAnexos(m, anexos) {
  for (const [i, anexo] of anexos.entries()) {
    const numero = i + 1;
    paginaSeparadora(m, numero, anexo);
    if (anexo.tipo === 'application/pdf') {
      const origen = await PDFDocument.load(anexo.bytes, { updateMetadata: false });
      const paginas = await m.doc.copyPages(origen, origen.getPageIndices());
      paginas.forEach(pg => m.doc.addPage(pg));
    } else {
      await anadirImagen(m, numero, anexo);
    }
  }
}

export async function guardar(doc, titulo) {
  doc.setTitle(textoSeguro(titulo));
  doc.setProducer('reclamoia.es');
  doc.setCreator('reclamoia.es');
  return Buffer.from(await doc.save());
}

function separarCampoCompartido(doc, form, nombre, nuevoNombre) {
  const campo = form.getTextField(nombre);
  const widgets = campo.acroField.getWidgets();
  if (widgets.length < 2) return;
  const w = widgets[1];
  const rect = w.getRectangle();
  const pagina = doc.getPages().find(p => p.ref === w.P()) || doc.getPage(0);
  const annots = pagina.node.Annots();
  if (annots) {
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i);
      if (doc.context.lookup(ref) === w.dict) {
        pagina.node.removeAnnot(ref);
        break;
      }
    }
  }
  campo.acroField.removeWidget(1);
  const nuevo = form.createTextField(nuevoNombre);
  nuevo.addToPage(pagina, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, borderWidth: 0 });
}

// Rellena el formulario oficial de la Oficina. En el original, los campos NIF y nombre del
// reclamante y del representante están enlazados: se separan para que el representante quede en blanco.
export async function rellenarFormularioOaut(bytesFormulario, d) {
  const doc = await PDFDocument.load(bytesFormulario);
  const form = doc.getForm();
  separarCampoCompartido(doc, form, 'NIFNIE', 'Representante NIF/NIE');
  separarCampoCompartido(doc, form, 'Nombre y Apellidos', 'Representante Nombre y Apellidos');

  const poner = (nombre, valor, tam) => {
    const campo = form.getTextField(nombre);
    // Algunos campos del formulario oficial no traen apariencia por defecto (/DA).
    campo.acroField.setDefaultAppearance(`/Helv ${tam} Tf 0 g`);
    campo.setText(textoSeguro(valor));
  };
  form.getCheckBox('Reclamación inicial').check();
  form.getRadioGroup('Group1').select(d.tipoTitular === 'autonomo' ? 'Opción2' : 'Opción1');
  poner('NIFNIE', d.documento, 10);
  poner('Nombre y Apellidos', d.nombre, 10);
  poner('Campo obligatorio', d.domicilio, 10);
  poner('Campo obligatorio_2', d.localidad, 10);
  poner('Campo obligatorio_3', d.cp, 10);
  poner('Provincia', d.provincia, 10);
  poner('Teléfonos de contacto', d.telefono, 10);
  poner('Operadores Reclamados', d.operador, 10);
  poner('Teléfonos sobre el cual se reclama', d.lineas, 10);
  poner('Campo obligatorio_4', d.motivo, 8.5);
  poner('Pretensiones del solicitante devolución tramitar baja', d.pretensiones, 8.5);
  poner('Campo obligatorio_5', d.documentacion, 7.5);
  // Fecha, firma y la declaración de que las copias coinciden con el original las completa el reclamante
  // (el formulario oficial trae esa casilla marcada de origen).
  form.getCheckBox('anexo coincide').uncheck();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(helvetica);
  doc.catalog.lookup(PDFName.of('AcroForm')).set(PDFName.of('NeedAppearances'), doc.context.obj(false));
  return doc;
}
