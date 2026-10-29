// Común a todas las páginas: marca y precios de config-publica.js, aparición al hacer scroll
// y botón fijo en móvil. Marcadores: data-marca, data-precio="operador|oaut", data-email.
import { MARCA, PRODUCTOS, PRESTADOR, formatearPrecio } from './config-publica.js';

export function aplicarMarca(raiz = document) {
  raiz.querySelectorAll('[data-marca]').forEach(el => { el.textContent = MARCA.nombre; });
  raiz.querySelectorAll('[data-precio]').forEach(el => {
    const p = PRODUCTOS[el.dataset.precio];
    if (p) el.textContent = formatearPrecio(p.precioCentimos);
  });
  raiz.querySelectorAll('[data-email]').forEach(el => {
    el.textContent = PRESTADOR.email;
    if (el.tagName === 'A') el.href = `mailto:${PRESTADOR.email}`;
  });
  document.title = document.title.replace(/BajaClara|LíneaClara/g, MARCA.nombre);
}

const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function activarRevelado(raiz = document) {
  const elementos = raiz.querySelectorAll('.revelar:not(.visible), .resalte:not(.visible)');
  if (sinMovimiento || !('IntersectionObserver' in window)) {
    elementos.forEach(el => el.classList.add('visible'));
    return;
  }
  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visible');
      observador.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  elementos.forEach(el => observador.observe(el));
}

// En móvil, el botón fijo aparece al dejar atrás el principio y se oculta al llegar a la llamada final.
function activarBotonFijo() {
  const fijo = document.getElementById('cta-fijo');
  const heroe = document.querySelector('.heroe');
  if (!fijo || !heroe || !('IntersectionObserver' in window)) return;
  const final = document.getElementById('cta-final');
  let heroeVisible = true;
  let finalVisible = false;
  const actualizar = () => fijo.classList.toggle('mostrar', !heroeVisible && !finalVisible);
  new IntersectionObserver(([e]) => { heroeVisible = e.isIntersecting; actualizar(); }).observe(heroe);
  if (final) new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting; actualizar(); }, { threshold: 0.2 }).observe(final);
}

aplicarMarca();
activarRevelado();
activarBotonFijo();
