const form = document.getElementById('reclamacion-form');
const resultado = document.getElementById('resultado');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const cartaGenerada = document.getElementById('carta-generada');
const cartaTexto = document.getElementById('carta-texto');
const btnCopiar = document.getElementById('btn-copiar');
const btnNueva = document.getElementById('btn-nueva');

const pasos = [
  'Analizando tu caso...',
  'Leyendo los documentos adjuntos...',
  'Identificando legislación aplicable...',
  'Redactando la carta...',
  'Añadiendo referencias legales...',
  'Finalizando el documento...'
];

async function procesarArchivo(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          tipo: 'imagen',
          mediaType: file.type,
          data: e.target.result.split(',')[1]
        });
      };
      reader.readAsDataURL(file);
    });
  }

  if (ext === 'pdf') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          tipo: 'pdf',
          mediaType: 'application/pdf',
          data: e.target.result.split(',')[1]
        });
      };
      reader.readAsDataURL(file);
    });
  }

  if (['doc', 'docx'].includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
          .then((result) => {
            resolve({
              tipo: 'texto',
              contenido: `[Documento Word: ${file.name}]\n${result.value}`
            });
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
          const sheet = workbook.Sheets[sheetName];
          texto += `\nHoja: ${sheetName}\n`;
          texto += XLSX.utils.sheet_to_csv(sheet);
        });
        resolve({
          tipo: 'texto',
          contenido: texto
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  return null;
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

  document.getElementById('formulario').style.display = 'none';
  resultado.style.display = 'block';
  loading.style.display = 'block';
  cartaGenerada.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  let i = 0;
  const interval = setInterval(() => {
    if (i < pasos.length) {
      loadingText.textContent = pasos[i];
      i++;
    }
  }, 1000);

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
      body: JSON.stringify({
        tipo, nombre, documento, direccion, ciudad, cp,
        telefono, email, categoriaEmpresa, empresa,
        referencia, fechaHecho, problema, importe,
        objetivo, descripcion, documentos: documentosProcesados
      })
    });

    const datos = await respuesta.json();
    clearInterval(interval);

    if (datos.carta) {
      loading.style.display = 'none';
      cartaGenerada.style.display = 'block';
      cartaTexto.textContent = datos.carta;
      resultado.scrollIntoView({ behavior: 'smooth' });
    } else {
      throw new Error('No se pudo generar la carta');
    }
  } catch (error) {
    clearInterval(interval);
    loadingText.textContent = 'Ha ocurrido un error. Por favor inténtalo de nuevo.';
    setTimeout(() => {
      resultado.style.display = 'none';
      document.getElementById('formulario').style.display = 'block';
      document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
    }, 2000);
  }
});

btnCopiar.addEventListener('click', () => {
  navigator.clipboard.writeText(cartaTexto.textContent).then(() => {
    btnCopiar.textContent = '✓ Copiada';
    setTimeout(() => { btnCopiar.textContent = '📋 Copiar carta'; }, 2000);
  });
});

btnNueva.addEventListener('click', () => {
  form.reset();
  document.getElementById('lista-archivos').innerHTML = '';
  document.getElementById('step-1').style.display = 'block';
  document.getElementById('step-2').style.display = 'none';
  document.getElementById('step-3').style.display = 'none';
  ['nav-step-1', 'nav-step-2', 'nav-step-3'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    if (i === 0) el.classList.add('active');
  });
  resultado.style.display = 'none';
  cartaGenerada.style.display = 'none';
  document.getElementById('formulario').style.display = 'block';
  document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' });
});
