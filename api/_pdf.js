// Maquetación de PDF con pdf-lib, sin servicios externos: el texto del cliente no sale del servidor.
import fs from 'node:fs';
import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFString } from 'pdf-lib';
import { orientacionJpeg } from './_archivos.js';

export const A4 = [595.28, 841.89];
const MARGEN = 56;
const color = (hex) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
// Paleta de la web: noche, violeta y lima, con lavanda para fondos suaves.
export const COLORES = {
  noche: color('#0E0B2B'), violeta: color('#5B2EFF'), violetaOscuro: color('#4320D9'), lima: color('#C6F432'),
  limaSuave: color('#F1FBD3'), lavanda: color('#F6F4FF'), lavanda2: color('#ECE7FF'), tinta: color('#14112E'),
  gris: color('#5E5A7A'), linea: color('#DCD5FF'), blanco: rgb(1, 1, 1)
};
const TINTA = COLORES.tinta;
const GRIS = COLORES.gris;
const LINEA = COLORES.linea;
const SIMBOLO = new URL('./_recursos/simbolo.png', import.meta.url);

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

// Dos estilos: "marca" (guías, confirmación y factura: cabecera oscura con el logo y marca de agua)
// y "sobrio" (escritos que se presentan a la compañía o a la Oficina: solo acentos de color).
export class Maquetador {
  static async crear(pdf = null, { marca = false, nombreMarca = '', agua = marca } = {}) {
    const doc = pdf || await PDFDocument.create();
    const m = new Maquetador();
    m.doc = doc;
    m.normal = await doc.embedFont(StandardFonts.Helvetica);
    m.negrita = await doc.embedFont(StandardFonts.HelveticaBold);
    m.cursiva = await doc.embedFont(StandardFonts.HelveticaOblique);
    m.marca = marca;
    m.agua = agua;
    m.nombreMarca = textoSeguro(nombreMarca);
    m.simbolo = marca ? await doc.embedPng(fs.readFileSync(SIMBOLO)) : null;
    m.paginasPropias = [];
    m.pagina = null;
    return m;
  }

  nuevaPagina() {
    this.pagina = this.doc.addPage(A4);
    this.paginasPropias.push(this.pagina);
    const [ancho, alto] = A4;
    if (this.marca) {
      if (this.agua) this.marcaDeAgua(this.pagina);
      this.pagina.drawRectangle({ x: 0, y: alto - 10, width: ancho, height: 10, color: COLORES.noche });
      this.pagina.drawRectangle({ x: 0, y: alto - 12, width: ancho * 0.3, height: 2, color: COLORES.lima });
    } else {
      this.pagina.drawRectangle({ x: 0, y: alto - 4, width: ancho, height: 4, color: COLORES.violeta });
    }
    this.y = alto - MARGEN;
    return this.pagina;
  }

  marcaDeAgua(p) {
    const texto = this.nombreMarca;
    if (!texto) return;
    const tam = 92;
    const w = this.negrita.widthOfTextAtSize(texto, tam);
    const ang = 35 * Math.PI / 180;
    const [ancho, alto] = A4;
    p.drawText(texto, {
      x: ancho / 2 - (w / 2) * Math.cos(ang) + (tam / 3) * Math.sin(ang),
      y: alto / 2 - (w / 2) * Math.sin(ang) - (tam / 3) * Math.cos(ang),
      size: tam, font: this.negrita, color: COLORES.violeta, opacity: 0.045, rotate: degrees(35)
    });
  }

  // Cabecera de la primera página en el estilo "marca": banda noche con el logo, título y subtítulo.
  cabecera(titulo, subtitulo = '') {
    const p = this.pagina;
    const [ancho, alto] = A4;
    const altoBanda = subtitulo ? 150 : 132;
    p.drawRectangle({ x: 0, y: alto - altoBanda, width: ancho, height: altoBanda, color: COLORES.noche });
    p.drawCircle({ x: ancho - 40, y: alto - 10, size: 150, color: COLORES.violeta, opacity: 0.35 });
    p.drawImage(this.simbolo, { x: MARGEN, y: alto - 64, width: 30, height: 30 });
    // Logotipo: la última palabra de la marca en lima ("Línea Clara").
    const palabras = this.nombreMarca.split(' ');
    const acento = palabras.length > 1 ? palabras.pop() : '';
    const inicio = palabras.join(' ') + (acento ? ' ' : '');
    p.drawText(inicio, { x: MARGEN + 40, y: alto - 56, size: 15, font: this.negrita, color: COLORES.blanco });
    if (acento) p.drawText(acento, { x: MARGEN + 40 + this.negrita.widthOfTextAtSize(inicio, 15), y: alto - 56, size: 15, font: this.negrita, color: COLORES.lima });
    const lineas = this.partir(titulo, this.negrita, 20, this.ancho - 40);
    let y = alto - 96;
    for (const l of lineas.slice(0, 2)) {
      p.drawText(l, { x: MARGEN, y, size: 20, font: this.negrita, color: COLORES.blanco });
      y -= 24;
    }
    p.drawRectangle({ x: MARGEN, y: y + 14, width: 48, height: 3, color: COLORES.lima });
    if (subtitulo) p.drawText(this.partir(subtitulo, this.normal, 9.5, this.ancho)[0], { x: MARGEN, y: y - 2, size: 9.5, font: this.normal, color: COLORES.linea });
    this.y = alto - altoBanda - 26;
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
    this.texto(contenido, { tam, fuente: 'negrita', color: COLORES.violetaOscuro, despues });
  }

  // Enlace pulsable en el PDF; debajo se imprime la dirección para quien lo lea en papel.
  enlace(etiqueta, url, { tam = 10.5 } = {}) {
    const texto = this.partir(etiqueta, this.negrita, tam, this.ancho - 14)[0];
    this.asegurar(tam * 3.2);
    const y = this.y - tam;
    const w = this.negrita.widthOfTextAtSize(texto, tam);
    this.pagina.drawText(texto, { x: MARGEN, y, size: tam, font: this.negrita, color: COLORES.violeta });
    this.pagina.drawLine({ start: { x: MARGEN, y: y - 2 }, end: { x: MARGEN + w, y: y - 2 }, thickness: 0.7, color: COLORES.violeta });
    const anotacion = this.doc.context.register(this.doc.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [MARGEN - 2, y - 4, MARGEN + w + 2, y + tam + 2], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) }
    }));
    this.pagina.node.addAnnot(anotacion);
    this.y -= tam * 1.5;
    this.texto(url, { tam: 8, color: GRIS, despues: 8 });
  }

  // Tapa el resto de la página con un degradado y un aviso: se usa en la vista previa antes de pagar.
  velarResto(titulo, texto) {
    const p = this.pagina;
    const [ancho] = A4;
    const arriba = this.y + 30;
    const pasos = 14;
    for (let i = 0; i < pasos; i++) {
      const y = arriba - (i + 1) * 6;
      p.drawRectangle({ x: 0, y, width: ancho, height: 6, color: COLORES.blanco, opacity: (i + 1) / pasos });
    }
    p.drawRectangle({ x: 0, y: 0, width: ancho, height: arriba - pasos * 6, color: COLORES.blanco });
    const alto = 92;
    const y0 = Math.max(80, arriba - pasos * 6 - alto - 30);
    p.drawRectangle({ x: MARGEN, y: y0, width: this.ancho, height: alto, color: COLORES.noche });
    p.drawRectangle({ x: MARGEN, y: y0, width: 4, height: alto, color: COLORES.lima });
    p.drawText(textoSeguro(titulo), { x: MARGEN + 20, y: y0 + alto - 30, size: 13, font: this.negrita, color: COLORES.lima });
    this.partir(texto, this.normal, 9.5, this.ancho - 40).slice(0, 3).forEach((l, i) => {
      p.drawText(l, { x: MARGEN + 20, y: y0 + alto - 50 - i * 13, size: 9.5, font: this.normal, color: COLORES.blanco });
    });
    const sello = 'VISTA PREVIA';
    p.drawText(sello, { x: 120, y: 300, size: 70, font: this.negrita, color: COLORES.violeta, opacity: 0.07, rotate: degrees(35) });
  }

  // Recuadro lavanda con datos clave en columnas: [[etiqueta, valor], ...].
  datosClave(pares) {
    const alto = 46;
    this.asegurar(alto + 12);
    const ancho = this.ancho / pares.length;
    this.pagina.drawRectangle({ x: MARGEN, y: this.y - alto, width: this.ancho, height: alto, color: COLORES.lavanda2 });
    this.pagina.drawRectangle({ x: MARGEN, y: this.y - alto, width: 3, height: alto, color: COLORES.violeta });
    pares.forEach(([etiqueta, valor], i) => {
      const x = MARGEN + 14 + i * ancho;
      this.pagina.drawText(textoSeguro(etiqueta).toUpperCase(), { x, y: this.y - 17, size: 7, font: this.negrita, color: GRIS });
      // El valor se reduce hasta caber; si aun así no cabe, se recorta con puntos suspensivos.
      let tam = 11.5;
      let v = textoSeguro(valor);
      while (tam > 8 && this.negrita.widthOfTextAtSize(v, tam) > ancho - 18) tam -= 0.5;
      while (v.length > 3 && this.negrita.widthOfTextAtSize(v, tam) > ancho - 18) v = v.slice(0, -2).trimEnd() + '…';
      this.pagina.drawText(v, { x, y: this.y - 34, size: tam, font: this.negrita, color: COLORES.noche });
    });
    this.y -= alto + 14;
  }

  separador(espacio = 8) {
    this.asegurar(espacio * 2);
    this.y -= espacio;
    this.pagina.drawLine({ start: { x: MARGEN, y: this.y }, end: { x: MARGEN + this.ancho, y: this.y }, thickness: 0.8, color: LINEA });
    this.y -= espacio;
  }

  espacio(alto = 8) {
    this.y -= alto;
  }

  // Tabla sencilla: columnas = [{ titulo, ancho (fracción), alinear }]. Con `total`, la última fila se resalta.
  tabla(columnas, filas, { tam = 9, total = false } = {}) {
    const anchos = columnas.map(c => c.ancho * this.ancho);
    const dibujarFila = (celdas, fuente, fondo, colorTexto = TINTA) => {
      const partidas = celdas.map((c, i) => this.partir(String(c ?? ''), fuente, tam, anchos[i] - 8));
      const altoFila = Math.max(...partidas.map(p => p.length)) * tam * 1.35 + 9;
      this.asegurar(altoFila);
      if (fondo) this.pagina.drawRectangle({ x: MARGEN, y: this.y - altoFila, width: this.ancho, height: altoFila, color: fondo });
      let x = MARGEN;
      partidas.forEach((lineas, i) => {
        lineas.forEach((linea, j) => {
          const w = fuente.widthOfTextAtSize(linea, tam);
          const xi = columnas[i].alinear === 'derecha' ? x + anchos[i] - 5 - w : x + 5;
          this.pagina.drawText(linea, { x: xi, y: this.y - 5 - tam - j * tam * 1.35, size: tam, font: fuente, color: colorTexto });
        });
        x += anchos[i];
      });
      this.y -= altoFila;
      this.pagina.drawLine({ start: { x: MARGEN, y: this.y }, end: { x: MARGEN + this.ancho, y: this.y }, thickness: 0.5, color: LINEA });
    };
    dibujarFila(columnas.map(c => c.titulo), this.negrita, COLORES.lavanda2, COLORES.noche);
    filas.forEach((f, i) => {
      const esTotal = total && i === filas.length - 1;
      dibujarFila(f, esTotal ? this.negrita : this.normal, esTotal ? COLORES.limaSuave : null);
    });
    this.y -= 8;
  }

  // Pie con referencia y numeración en las páginas generadas por nosotros (no en los anexos del cliente).
  numerar(etiqueta) {
    const total = this.paginasPropias.length;
    this.paginasPropias.forEach((p, i) => {
      const texto = textoSeguro(`${etiqueta} · página ${i + 1} de ${total}`);
      p.drawLine({ start: { x: MARGEN, y: 40 }, end: { x: MARGEN + 24, y: 40 }, thickness: 2, color: this.marca ? COLORES.lima : COLORES.violeta });
      p.drawText(texto, { x: MARGEN, y: 28, size: 7.5, font: this.normal, color: GRIS });
      if (this.marca) {
        const w = this.negrita.widthOfTextAtSize(this.nombreMarca, 7.5);
        p.drawText(this.nombreMarca, { x: A4[0] - MARGEN - w, y: 28, size: 7.5, font: this.negrita, color: COLORES.violeta });
      }
    });
  }
}

function paginaSeparadora(m, numero, anexo) {
  const p = m.doc.addPage(A4);
  const { width, height } = p.getSize();
  p.drawRectangle({ x: 0, y: height - 4, width, height: 4, color: COLORES.violeta });
  const centrar = (t, fuente, tam, y, color = TINTA) => {
    const s = textoSeguro(t);
    p.drawText(s, { x: (width - fuente.widthOfTextAtSize(s, tam)) / 2, y, size: tam, font: fuente, color });
  };
  centrar(`ANEXO ${numero}`, m.negrita, 30, height / 2 + 24, COLORES.violetaOscuro);
  p.drawRectangle({ x: width / 2 - 24, y: height / 2 + 10, width: 48, height: 3, color: COLORES.lima });
  const nombre = m.partir(anexo.nombre, m.normal, 11, width - 160)[0] || '';
  centrar(nombre, m.normal, 11, height / 2 - 14, TINTA);
  centrar(`${anexo.descripcion} · ${anexo.paginas} ${anexo.paginas === 1 ? 'página' : 'páginas'}`, m.normal, 10, height / 2 - 32, GRIS);
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
  form.getRadioGroup('Group1').select(d.tipoTitular === 'empresa' ? 'Opción3' : 'Opción1');
  if (d.representante) form.getTextField('Representante Nombre y Apellidos').setText(textoSeguro(d.representante));
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
