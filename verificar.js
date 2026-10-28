// Verificación de referencias de escritos generados antes de la especialización (RC-AAAAMMDD-XXXX).
const form = document.getElementById('form-verificar');
const input = document.getElementById('ref');
const resultado = document.getElementById('resultado');

function mostrar(tipo, titulo, lineas = []) {
  const caja = document.createElement('div');
  caja.className = `mensaje ${tipo}`;
  const t = document.createElement('p');
  t.textContent = titulo;
  caja.append(t, ...lineas.map(l => Object.assign(document.createElement('p'), { textContent: l })));
  resultado.replaceChildren(caja);
}

async function verificar(ref) {
  try {
    const datos = await (await fetch(`/api/verificar?ref=${encodeURIComponent(ref)}`)).json();
    if (datos.valido) {
      mostrar('ok', 'Referencia válida', [`Referencia: ${datos.ref}`, `Generado el ${new Date(datos.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`, `Categoría: ${datos.categoria}`]);
    } else {
      mostrar('aviso', 'No hemos encontrado esa referencia. Comprueba que está bien escrita; las referencias se conservan 24 meses.');
    }
  } catch {
    mostrar('error', 'No hemos podido comprobarla ahora. Inténtalo de nuevo en unos minutos.');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ref = input.value.trim().toUpperCase();
  if (ref) verificar(ref);
});

const inicial = new URLSearchParams(location.search).get('ref');
if (inicial) {
  input.value = inicial.toUpperCase();
  verificar(input.value);
}
