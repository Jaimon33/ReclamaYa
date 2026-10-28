// Aplica la marca y los precios de config-publica.js a cualquier página.
// Marcadores: data-marca, data-precio="operador|oaut", data-email, data-anio.
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
  raiz.querySelectorAll('[data-anio]').forEach(el => { el.textContent = new Date().getFullYear(); });
  document.title = document.title.replace(/BajaClara/g, MARCA.nombre);
}

aplicarMarca();
