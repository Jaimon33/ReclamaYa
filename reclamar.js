const form = document.getElementById('reclamacion-form');
const resultado = document.getElementById('resultado');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const cartaGenerada = document.getElementById('carta-generada');
const cartaVisible = document.getElementById('carta-visible');
const btnNueva = document.getElementById('btn-nueva');

const pasos = [
  'Analizando tu caso...',
  'Consultando el BOE...',
  'Verificando legislación en EUR-Lex...',
  'Consultando organismos reguladores...',
  'Redactando el escrito...',
  'Añadiendo referencias legales verificadas...',
  'Finalizando el documento...'
];

async function procesarArchivo(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ tipo: 'imagen', mediaType: file.type, data: e.target.result.split(',')[1] });
      };
      reader.readAsDataURL(file);
    });
  }

  if (ext === 'pdf') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ tipo: 'pdf', mediaType: 'application/pdf', data: e.target.result.split(',')[1] });
      };
      reader.readAsDataURL(file);
    });
  }

  if (['doc', 'docx'].includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        mammoth.extractRawText({ arrayBuffer: e.target.result }).then((result) => {
          resolve({ tipo: 'texto', contenido: `[Documento Word: ${file.name}]\n${result.value}` });
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  if (['xls', 'xlsx'].includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        let texto = `[Documento Excel: ${file.name}]\n`;
        workbook.SheetNames.forEach((sheetName) => {
          texto += `\nHoja: ${sheetName}\n`;
          texto += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        });
        resolve({ tipo: 'texto', contenido: texto });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  return null;
}

async function descargarPDF(carta, datosUsuario, nombreEmpresa) {
  const btnPagar = document.getElementById('btn-pagar');
  const textoOriginal = btnPagar.textContent;

  try {
    btnPagar.textContent = '⏳ Generando tu PDF...';
    btnPagar.disabled = true;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const fecha = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const margenIzq = 25;
    const margenDer = 20;
    const anchoUtil = 210 - margenIzq - margenDer;
    let y = 22;

    const addTexto = (texto, opciones = {}) => {
      const { fontSize = 11, bold = false, italic = false, color = [26, 26, 26], marginTop = 0, indent = 0 } = opciones;
      y += marginTop;
      if (y > 267) { doc.addPage(); y = 22; }
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      if (bold && italic) doc.setFont('times', 'bolditalic');
      else if (bold) doc.setFont('times', 'bold');
      else if (italic) doc.setFont('times', 'italic');
      else doc.setFont('times', 'normal');
      const lineas = doc.splitTextToSize(texto, anchoUtil - indent);
      lineas.forEach((linea, i) => {
        if (y > 267) { doc.addPage(); y = 22; }
        doc.text(linea, margenIzq + indent, y);
        if (i < lineas.length - 1) y += 6;
      });
      y += 6;
    };

    const addLinea = (marginTop = 4) => {
      y += marginTop;
      if (y > 267) { doc.addPage(); y = 22; }
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margenIzq, y, 210 - margenDer, y);
      y += 4;
    };

    addTexto(datosUsuario.nombre, { bold: true });
    addTexto(datosUsuario.documento);
    addTexto(`${datosUsuario.direccion}, ${datosUsuario.cp} ${datosUsuario.ciudad}`);
    addTexto(`Tel.: ${datosUsuario.telefono}`);
    addTexto(datosUsuario.email);
    addLinea(4);
    addTexto('A LA ATENCIÓN DEL SERVICIO DE ATENCIÓN AL CLIENTE', { bold: true });
    addTexto(nombreEmpresa.toUpperCase(), { bold: true });
    addLinea(4);

    const lineas = carta.split('\n');
    for (const linea of lineas) {
      const l = linea.trim();
      if (!l) { y += 3; continue; }

      const match = l.match(/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO)(\.-)\s+(.+)$/);
      if (match) {
        if (y > 267) { doc.addPage(); y = 22; }
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.setTextColor(26, 26, 26);
        const numero = match[1] + match[2];
        const anchoNumero = doc.getTextWidth(numero + ' ');
        doc.text(numero, margenIzq, y);
        doc.setFont('times', 'normal');
        const restoLineas = doc.splitTextToSize(match[3], anchoUtil - anchoNumero);
        restoLineas.forEach((rl, i) => {
          if (y > 267) { doc.addPage(); y = 22; }
          doc.text(rl, margenIzq + anchoNumero, y);
          if (i < restoLineas.length - 1) y += 6;
        });
        y += 7;
        continue;
      }

      if (/^(SOLICITO:|EXPONGO:)/.test(l)) { addTexto(l, { bold: true, marginTop: 4 }); continue; }
      if (/^Al amparo de/.test(l)) { addTexto(l, { italic: true, color: [80, 80, 80], indent: 5 }); continue; }
      if (/^[—–]/.test(l)) { addTexto(l, { indent: 8 }); continue; }
      if (/^(Muy señores|Atentamente)/.test(l)) { addTexto(l, { marginTop: 4 }); continue; }
      addTexto(l);
    }

    y += 15;
    if (y > 250) { doc.addPage(); y = 22; }
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    doc.line(margenIzq, y, margenIzq + 50, y);
    y += 6;
    addTexto(datosUsuario.nombre, { bold: true });
    addTexto(datosUsuario.documento);

    const totalPaginas = doc.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(
        'ReclamaYa · reclamaya.es | Este escrito tiene carácter de reclamación extrajudicial. ReclamaYa no presta servicios de asesoría jurídica.',
        105, 287, { align: 'center', maxWidth: anchoUtil }
      );
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const nombreArchivo = `Escrito-Reclamacion-${nombreEmpresa.replace(/\s+/g, '-')}.pdf`;
    doc.save(nombreArchivo);

    btnPagar.textContent = '⏳ Enviando a tu email...';

    const respuesta = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64, nombreArchivo, datos: datosUsuario, nombreEmpresa })
    });

    if (!respuesta.ok) throw new Error('Error al enviar email');

    const datos = await respuesta.json();

    if (datos.ok) {
      btnPagar.textContent = '✓ PDF descargado y enviado a tu email';
      btnPagar.style.background = '#2d6a4f';
      btnPagar.style.color = '#fff';
      btnPagar.disabled = true;

      const avisoEnvio = document.createElement('div');
      avisoEnvio.style.cssText = `
        background: #f6faf8;
        border: 1px solid #c3ddd0;
        border-radius: 6px;
        padding: 14px 16px;
        margin-top: 12px;
        font-size: 13px;
        color: #1a1a2e;
        line-height: 1.7;
      `;
      avisoEnvio.innerHTML = `
        <p style="font-weight:700; margin-bottom:4px;">✓ Escrito generado y enviado correctamente</p>
        <p>El PDF se ha descargado en tu dispositivo y también lo hemos enviado a <strong>${datosUsuario.email}</strong>.</p>
        <p style="margin-top:6px; font-size:12px; color:#666;">Si no lo ves en tu email en unos minutos, revisa la carpeta de spam.</p>
      `;
      btnPagar.parentNode.insertBefore(avisoEnvio, btnPagar.nextSibling);
    }

  } catch (error) {
    console.error('Error:', error);
    btnPagar.textContent = 'Error. Inténtalo de nuevo.';
    btnPagar.style.background = '#c0392b';
    btnPagar.style.color = '#fff';
    setTimeout(() => {
      btnPagar.textContent = textoOriginal;
      btnPagar.style.background = '';
      btnPagar.style.color = '';
      btnPagar.disabled = false;
    }, 3000);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  const nombre = document.getElementById('nombre').value;
  const documento = document.getElementById('documento').value;
  const direccion = document.getElementById('direccion').value;
  const ciudad = document.getElementById('ciudad').value;
  const cp = document.getElementById('cp').value;
  const telefono = document.getElementById('telefono').value;
  const email = document.getElementById('email').value;
  const categoriaEmpresa = document.getElementById('categoria-empresa').value;
  const empresa = document.getElementById('empresa').value;
  const referencia = document.getElementById('referencia').value;
  const fechaHecho = document.getElementById('fecha-hecho').value;
  const problema = document.getElementById('problema').value;
  const importe = document.getElementById('importe').value;
  const objetivoSelect = document.getElementById('objetivo').value;
  const otroObjetivo = document.getElementById('otro-objetivo').value;
  const objetivo = objetivoSelect === 'otro' ? otroObjetivo : objetivoSelect;
  const descripcion = document.getElementById('descripcion').value;
  const archivosInput = document.getElementById('archivos');
  const archivos = archivosInput.files;

  const datosUsuario = {
    tipo, nombre, documento, direccion, ciudad, cp,
    telefono, email, categoriaEmpresa, empresa,
    referencia, fechaHecho, problema, importe,
    objetivo, descripcion
  };

  document.querySelector('.form-card').style.display = 'none';
  resultado.style.display = 'block';
  loading.style.display = 'block';
  cartaGenerada.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  let i = 0;
  const interval = setInterval(() => {
    if (i < pasos.length) { loadingText.textContent = pasos[i]; i++; }
  }, 1200);

  try {
    const documentosProcesados = [];
    if (archivos.length > 0) {
      for (const file of Array.from(archivos)) {
        const procesado = await procesarArchivo(file);
        if (procesado) documentosProcesados.push(procesado);
      }
    }

    const respuesta = await fetch('/api/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datosUsuario, documentos: documentosProcesados })
    });

    const datos = await respuesta.json();
    clearInterval(interval);

    if (datos.carta) {
      loading.style.display = 'none';
      cartaGenerada.style.display = 'block';

      const lineasPreview = datos.carta.split('\n');
      cartaVisible.textContent = lineasPreview.slice(0, 6).join('\n');

      if (datos.fuentes && datos.fuentes.length > 0) {
        const fuentesExistente = document.querySelector('.fuentes-legales');
        if (fuentesExistente) fuentesExistente.remove();
        const fuentesDiv = document.createElement('div');
        fuentesDiv.className = 'fuentes-legales';
        fuentesDiv.innerHTML = `
          <p>✅ Legislación verificada en fuentes oficiales:</p>
          <ul>${datos.fuentes.map(f => `<li>${f}</li>`).join('')}</ul>
        `;
        const descargo = cartaGenerada.querySelector('.descargo-legal');
        if (descargo) descargo.parentNode.insertBefore(fuentesDiv, descargo);
      }

      window._cartaCompleta = datos.carta;
      window._datosUsuario = datosUsuario;

      const opcion = window._opcionSeleccionada || 'completa';
      const btnPagar = document.getElementById('btn-pagar');
      if (btnPagar) {
        btnPagar.textContent = opcion === 'completa'
          ? '⬇️ Descargar escrito + guía en PDF — 7,99€'
          : '⬇️ Descargar escrito en PDF — 3,99€';
        btnPagar.onclick = () => descargarPDF(window._cartaCompleta, window._datosUsuario, empresa);
      }

      resultado.scrollIntoView({ behavior: 'smooth' });

    } else {
      throw new Error('No se pudo generar el escrito');
    }

  } catch (error) {
    clearInterval(interval);
    loadingText.textContent = 'Ha ocurrido un error. Por favor inténtalo de nuevo.';
    setTimeout(() => {
      resultado.style.display = 'none';
      document.querySelector('.form-card').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2000);
  }
});

btnNueva.addEventListener('click', () => {
  form.reset();
  document.getElementById('lista-archivos').innerHTML = '';
  document.getElementById('step-1').style.display = 'block';
  document.getElementById('step-2').style.display = 'none';
  document.getElementById('step-3').style.display = 'none';
  document.getElementById('step-4').style.display = 'none';
  ['nav-step-1', 'nav-step-2', 'nav-step-3', 'nav-step-4'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    if (i === 0) el.classList.add('active');
  });
  resultado.style.display = 'none';
  cartaGenerada.style.display = 'none';
  document.querySelector('.form-card').style.display = 'block';
  window._cartaCompleta = null;
  window._datosUsuario = null;
  const fuentesDiv = document.querySelector('.fuentes-legales');
  if (fuentesDiv) fuentesDiv.remove();
  const avisoDiv = document.querySelector('[style*="f6faf8"]');
  if (avisoDiv) avisoDiv.remove();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
