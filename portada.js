// Portada: selector rápido, opiniones y cifras.
import { OPINIONES, CIFRAS } from './config-publica.js';
import { activarRevelado } from './sitio.js';

const COMPANIAS = ['Movistar', 'Vodafone', 'Orange', 'Jazztel', 'Yoigo', 'MásMóvil', 'Simyo', 'Lowi', 'O2', 'Pepephone', 'Digi', 'Finetwork', 'Euskaltel', 'R', 'Telecable', 'Avatel', 'Adamo'];

// ——— Selector rápido: el botón se adapta a lo que elige el usuario ———
const selector = document.getElementById('selector');
const lista = document.getElementById('selector-compania');
COMPANIAS.forEach(c => lista.append(new Option(c, c)));
lista.append(new Option('Otra compañía', 'Otro'));

const RESPUESTAS = {
  baja: { cubierto: true, texto: (c) => `Es justo lo que preparamos${c ? ` con ${c}` : ''}: reclamamos solo los días cobrados después de tu baja.` },
  permanencia: { cubierto: false, texto: () => 'Las penalizaciones por permanencia todavía no las preparamos. Puedes reclamarlas gratis a la compañía y, si no responde, a la Oficina de Atención al Usuario de Telecomunicaciones.' },
  dispositivo: { cubierto: false, texto: () => 'Los plazos de un móvil financiado todavía no los preparamos: suelen depender del contrato de financiación. Reclámalos a la compañía por escrito o pide ayuda en la oficina de consumo de tu ayuntamiento.' },
  otro: { cubierto: false, texto: () => 'Por ahora solo preparamos reclamaciones por cobros posteriores a una baja. Si te cobran algo después de pedir la baja, elige la primera opción.' }
};

function actualizarSelector() {
  const caso = new FormData(selector).get('caso');
  const compania = lista.value;
  const r = RESPUESTAS[caso];
  const caja = document.getElementById('respuesta-selector');
  const cta = document.getElementById('cta-selector');
  document.getElementById('texto-selector').textContent = r.texto(compania === 'Otro' ? '' : compania);
  caja.classList.toggle('no-cubierto', !r.cubierto);
  if (r.cubierto) {
    cta.href = `/reclamar.html${compania ? `?compania=${encodeURIComponent(compania)}` : ''}`;
    cta.firstChild.textContent = compania && compania !== 'Otro' ? `Reclamar a ${compania} ` : 'Empieza tu reclamación ';
    cta.classList.remove('secundario');
  } else {
    cta.href = 'https://usuariosteleco.digital.gob.es/reclamaciones/telefonia-e-internet';
    cta.firstChild.textContent = 'Ver la vía oficial gratuita ';
    cta.classList.add('secundario');
  }
}
selector.addEventListener('change', actualizarSelector);

// ——— Opiniones y cifras: solo con datos reales. En la vista previa se ven ejemplos marcados. ———
const enProduccion = /(^|\.)reclamoia\.es$/.test(location.hostname);
const opiniones = OPINIONES.length ? OPINIONES : enProduccion ? [] : [
  { texto: 'Aquí irá una opinión real de un cliente.', autor: 'Nombre del cliente', detalle: 'Compañía y fecha', maqueta: true },
  { texto: 'Aquí irá otra opinión real.', autor: 'Nombre del cliente', detalle: 'Compañía y fecha', maqueta: true },
  { texto: 'Y una tercera, siempre con permiso del cliente.', autor: 'Nombre del cliente', detalle: 'Compañía y fecha', maqueta: true }
];
const cifras = CIFRAS.length ? CIFRAS : enProduccion ? [] : [
  { valor: 0, sufijo: '', etiqueta: 'Dato real pendiente', maqueta: true },
  { valor: 0, sufijo: ' €', etiqueta: 'Dato real pendiente', maqueta: true },
  { valor: 0, sufijo: '%', etiqueta: 'Dato real pendiente', maqueta: true }
];

function crear(etiqueta, clase, texto) {
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
}

if (opiniones.length || cifras.length) {
  const seccion = document.getElementById('opiniones');
  seccion.hidden = false;
  cifras.forEach((c, i) => {
    const t = crear('div', `tarjeta revelar${c.maqueta ? ' maqueta' : ''}`);
    t.style.setProperty('--orden', i);
    const numero = crear('div', 'cifra', `0${c.sufijo}`);
    numero.dataset.valor = c.valor;
    numero.dataset.sufijo = c.sufijo;
    t.append(numero, crear('p', 'suave', c.etiqueta));
    document.getElementById('cifras').append(t);
  });
  opiniones.forEach((o, i) => {
    const t = crear('figure', `tarjeta opinion revelar${o.maqueta ? ' maqueta' : ''}`);
    t.style.setProperty('--orden', i);
    t.style.margin = '0';
    t.append(crear('blockquote', '', null), crear('figcaption', ''));
    t.querySelector('blockquote').style.margin = '0';
    t.querySelector('blockquote').append(crear('p', '', `«${o.texto}»`));
    t.querySelector('figcaption').append(crear('p', 'autor', o.autor), crear('p', 'suave', o.detalle));
    document.getElementById('lista-opiniones').append(t);
  });
  activarRevelado(seccion);
  animarContadores();
}

// Contadores que suben hasta su valor cuando aparecen en pantalla.
function animarContadores() {
  const numeros = document.querySelectorAll('.cifra[data-valor]');
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const formato = new Intl.NumberFormat('es-ES');
  const pintar = (el, v) => { el.textContent = `${formato.format(Math.round(v))}${el.dataset.sufijo}`; };
  if (reducido || !('IntersectionObserver' in window)) return numeros.forEach(el => pintar(el, Number(el.dataset.valor)));
  const obs = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      obs.unobserve(e.target);
      const fin = Number(e.target.dataset.valor);
      const inicio = performance.now();
      const paso = (t) => {
        const p = Math.min(1, (t - inicio) / 1400);
        pintar(e.target, fin * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }
  }, { threshold: 0.4 });
  numeros.forEach(el => obs.observe(el));
}
