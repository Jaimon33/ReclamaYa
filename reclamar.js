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

function recopilarCamposCategoria() {
  const contenedor = document.getElementById('campos-categoria');
  if (!contenedor) return '';
  const partes = [];
  contenedor.querySelectorAll('input, select, textarea').forEach((campo) => {
    const valor = campo.value ? campo.value.trim() : '';
    if (!valor) return;
    const label = contenedor.querySelector(`label[for="${campo.id}"]`);
    const etiqueta = label ? label.textContent.replace(/\(opcional\)|\(si.*?\)/gi, '').trim() : campo.id;
    partes.push(`${etiqueta}: ${valor}`);
  });
  return partes.join('\n');
}

const MAX_LADO_IMAGEN = 1800;
// Debe coincidir con MAX_CARACTERES_ANEXOS de api/_anexos.js (~3 MB de archivos).
const MAX_CARACTERES_ANEXOS = 4200000;

function comprimirImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, MAX_LADO_IMAGEN / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo leer la imagen ${file.name}`));
    };
    img.src = url;
  });
}

function esAnexable(documento) {
  return documento.tipo === 'pdf' || documento.tipo === 'imagen';
}

async function procesarArchivo(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return { tipo: 'imagen', mediaType: 'image/jpeg', data: await comprimirImagen(file), nombre: file.name };
  }

  if (ext === 'pdf') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ tipo: 'pdf', mediaType: 'application/pdf', data: e.target.result.split(',')[1], nombre: file.name });
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

function pintarLineas(contenedorId, lineas) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.replaceChildren(...(lineas || []).map((texto) => {
    const p = document.createElement('p');
    p.textContent = texto;
    return p;
  }));
}

function mostrarCabecera(cabecera) {
  const bloque = document.getElementById('cabecera-escrito');
  if (!cabecera) {
    bloque.style.display = 'none';
    return;
  }
  pintarLineas('cab-remitente', cabecera.remitente);
  pintarLineas('cab-destinatario', cabecera.destinatario);
  pintarLineas('cab-asunto', [cabecera.asunto]);
  bloque.style.display = 'block';
}

function mostrarAviso(aviso) {
  const bloque = document.getElementById('aviso-caso');
  const wrapCheck = document.getElementById('wrap-check-aviso');
  document.getElementById('check-aviso').checked = false;
  window._avisoRequiereConfirmacion = Boolean(aviso && aviso.requiereConfirmacion);
  if (!aviso) {
    bloque.style.display = 'none';
    return;
  }
  document.getElementById('aviso-caso-texto').textContent = aviso.mensaje;
  wrapCheck.style.display = aviso.requiereConfirmacion ? 'flex' : 'none';
  bloque.style.display = 'block';
}

function validarCheck(inputId, wrapId) {
  const input = document.getElementById(inputId);
  if (input.checked) return true;
  const wrap = document.getElementById(wrapId);
  wrap.classList.add('check-error');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => wrap.classList.remove('check-error'), 2500);
  return false;
}

async function iniciarPago() {
  if (window._avisoRequiereConfirmacion && !validarCheck('check-aviso', 'wrap-check-aviso')) return;
  if (!validarCheck('check-condiciones-venta', 'wrap-check-venta')) return;

  const btnPagar = document.getElementById('btn-pagar');
  const textoOriginal = btnPagar.textContent;

  try {
    btnPagar.textContent = '⏳ Redirigiendo al pago...';
    btnPagar.disabled = true;

    const opcion = window._opcionSeleccionada || 'basica';
    const email = window._datosUsuario?.email || '';
    const empresa = window._datosUsuario?.empresa || '';
    const carta = window._cartaCompleta || '';
    const datosUsuario = window._datosUsuario || {};

    const respuesta = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opcion, email, empresa, carta, datosUsuario, anexos: window._anexos || [] })
    });

    if (!respuesta.ok) throw new Error('Error al crear sesión de pago');

    const datos = await respuesta.json();

    if (datos.url) {
      window.location.href = datos.url;
    } else {
      throw new Error('No se recibió URL de pago');
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

  if (!validarCheck('check-privacidad', 'wrap-check-privacidad')) return;

  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  const nombre = document.getElementById('nombre').value;
  const documento = document.getElementById('documento').value;
  const direccion = document.getElementById('direccion').value;
  const ciudad = document.getElementById('ciudad').value;
  const cp = document.getElementById('cp').value;
  const prefijoTelefono = document.getElementById('prefijo-telefono').value;
  const numeroTelefono = document.getElementById('telefono').value;
  const telefono = numeroTelefono ? `${prefijoTelefono} ${numeroTelefono}` : '';
  const email = document.getElementById('email').value;
  const categoriaEmpresa = document.getElementById('categoria-empresa').value;
  const empresa = document.getElementById('empresa').value;
  const referencia = document.getElementById('referencia').value;
  const fechaHecho = document.getElementById('fecha-hecho').value;
  const importe = document.getElementById('importe').value;
  const descripcion = document.getElementById('descripcion').value;
  const objetivo = document.getElementById('solicita').value;
  const camposCategoria = recopilarCamposCategoria();
  const archivosInput = document.getElementById('archivos');
  const archivos = archivosInput.files;

  const tipoDestinatario = document.querySelector('input[name="tipo-destinatario"]:checked').value;
  const domicilioDestinatario = document.getElementById('domicilio-destinatario').value.trim();
  const representacion = document.querySelector('input[name="representacion"]:checked').value;
  const repNombre = representacion === 'representacion' ? document.getElementById('rep-nombre').value.trim() : '';
  const repDocumento = representacion === 'representacion' ? document.getElementById('rep-documento').value.trim() : '';
  const firmanteNombre = tipo === 'empresa' ? document.getElementById('firmante-nombre').value.trim() : '';
  const firmanteCargo = tipo === 'empresa' ? document.getElementById('firmante-cargo').value.trim() : '';

  const previa = document.getElementById('reclamacion-previa');
  const partesPrevia = [];
  if (previa.value) partesPrevia.push(previa.options[previa.selectedIndex].text);
  const numPrevia = document.getElementById('num-reclamacion-previa').value.trim();
  if (numPrevia) partesPrevia.push(`Nº de reclamación previa: ${numPrevia}`);
  const respuestaPrevia = document.getElementById('respuesta-previa').value.trim();
  if (respuestaPrevia) partesPrevia.push(`Respuesta recibida: ${respuestaPrevia}`);
  const reclamacionPrevia = partesPrevia.join('. ');

  const datosUsuario = {
    tipo, nombre, documento, direccion, ciudad, cp,
    telefono, email, categoriaEmpresa, empresa,
    referencia, fechaHecho, importe,
    objetivo, descripcion, camposCategoria,
    tipoDestinatario, domicilioDestinatario,
    representacion, repNombre, repDocumento,
    firmanteNombre, firmanteCargo, reclamacionPrevia
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

    const anexos = documentosProcesados.filter(esAnexable);
    const pesoAnexos = anexos.reduce((suma, d) => suma + d.data.length, 0);
    if (pesoAnexos > MAX_CARACTERES_ANEXOS) {
      const errorTamano = new Error('Los documentos adjuntos ocupan demasiado');
      errorTamano.mensajeUsuario = 'Los documentos adjuntos ocupan demasiado (máximo 3 MB en total). Quita alguno o reduce su tamaño y vuelve a intentarlo.';
      errorTamano.pasoFormulario = 3;
      throw errorTamano;
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

      mostrarAviso(datos.aviso);
      mostrarCabecera(datos.cabecera);

      const lineasPreview = datos.carta.split('\n');
      cartaVisible.textContent = lineasPreview.slice(0, 6).join('\n').replace(/\*\*/g, '');

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
      window._anexos = anexos.map(({ nombre, mediaType, data }) => ({ nombre, mediaType, data }));

      const opcion = window._opcionSeleccionada || 'completa';
      const btnPagar = document.getElementById('btn-pagar');
      if (btnPagar) {
        btnPagar.textContent = opcion === 'completa'
          ? '⬇️ Pagar 13,99€ y recibir escrito + guía'
          : '⬇️ Pagar 9,99€ y recibir escrito';
        btnPagar.onclick = () => iniciarPago();
      }

      resultado.scrollIntoView({ behavior: 'smooth' });

    } else {
      throw new Error('No se pudo generar el escrito');
    }

  } catch (error) {
    clearInterval(interval);
    loadingText.textContent = error.mensajeUsuario || 'Ha ocurrido un error. Por favor inténtalo de nuevo.';
    setTimeout(() => {
      resultado.style.display = 'none';
      document.querySelector('.form-card').style.display = 'block';
      if (error.pasoFormulario) irPaso(error.pasoFormulario);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, error.mensajeUsuario ? 4500 : 2000);
  }
});

document.getElementById('btn-corregir').addEventListener('click', () => {
  resultado.style.display = 'none';
  cartaGenerada.style.display = 'none';
  document.querySelector('.form-card').style.display = 'block';
  irPaso(2);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

btnNueva.addEventListener('click', () => {
  mostrarAviso(null);
  mostrarCabecera(null);
  form.reset();
  toggleTipo('particular');
  toggleRepresentacion('propio');
  toggleDestinatario('empresa');
  document.getElementById('check-condiciones-venta').checked = false;
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
  window._anexos = null;
  window._opcionSeleccionada = 'completa';
  document.getElementById('carta-visible').textContent = '';
  const fuentesDiv = document.querySelector('.fuentes-legales');
  if (fuentesDiv) fuentesDiv.remove();
  const avisoDiv = document.querySelector('.aviso-envio');
  if (avisoDiv) avisoDiv.remove();
  seleccionarOpcion('completa');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
