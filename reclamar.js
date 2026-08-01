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
      body: JSON.stringify({ opcion, email, empresa, carta, datosUsuario })
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
      window._destinatarioReal = datos.destinatario || null;

      const opcion = window._opcionSeleccionada || 'completa';
      const btnPagar = document.getElementById('btn-pagar');
      if (btnPagar) {
        btnPagar.textContent = opcion === 'completa'
          ? '⬇️ Pagar 7,99€ y recibir escrito + guía'
          : '⬇️ Pagar 3,99€ y recibir escrito';
        btnPagar.onclick = () => iniciarPago();
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
  window._destinatarioReal = null;
  window._opcionSeleccionada = 'completa';
  document.getElementById('carta-visible').textContent = '';
  const fuentesDiv = document.querySelector('.fuentes-legales');
  if (fuentesDiv) fuentesDiv.remove();
  const avisoDiv = document.querySelector('.aviso-envio');
  if (avisoDiv) avisoDiv.remove();
  seleccionarOpcion('completa');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
