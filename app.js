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
  'Identificando legislación aplicable...',
  'Redactando la carta...',
  'Añadiendo referencias legales...',
  'Finalizando el documento...'
];

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
  const empresa = document.getElementById('empresa').value;
  const referencia = document.getElementById('referencia').value;
  const fechaHecho = document.getElementById('fecha-hecho').value;
  const problema = document.getElementById('problema').value;
  const importe = document.getElementById('importe').value;
  const objetivo = document.getElementById('objetivo').value;
  const descripcion = document.getElementById('descripcion').value;

  document.querySelector('main').style.display = 'none';
  resultado.style.display = 'block';
  loading.style.display = 'block';
  cartaGenerada.style.display = 'none';

  let i = 0;
  const interval = setInterval(() => {
    if (i < pasos.length) {
      loadingText.textContent = pasos[i];
      i++;
    }
  }, 800);

  try {
    const respuesta = await fetch('/api/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo, nombre, documento, direccion, ciudad, cp,
        telefono, email, empresa, referencia, fechaHecho,
        problema, importe, objetivo, descripcion
      })
    });

    const datos = await respuesta.json();
    clearInterval(interval);

    if (datos.carta) {
      loading.style.display = 'none';
      cartaGenerada.style.display = 'block';
      cartaTexto.textContent = datos.carta;
    } else {
      throw new Error('No se pudo generar la carta');
    }
  } catch (error) {
    clearInterval(interval);
    loadingText.textContent = 'Ha ocurrido un error. Por favor inténtalo de nuevo.';
    setTimeout(() => {
      resultado.style.display = 'none';
      document.querySelector('main').style.display = 'block';
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
  resultado.style.display = 'none';
  cartaGenerada.style.display = 'none';
  document.querySelector('main').style.display = 'block';
  window.scrollTo(0, 0);
});
