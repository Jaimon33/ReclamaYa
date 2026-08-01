(function () {
  var CONSENT_KEY = 'reclamoia_cookies_consent';

  if (localStorage.getItem(CONSENT_KEY)) return;

  var estilo = document.createElement('style');
  estilo.textContent = `
    #cookie-banner {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
      background: #0D1B2A;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding: 1rem 2rem;
      box-shadow: 0 -2px 20px rgba(0,0,0,0.15);
    }
    #cookie-banner .cookie-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    #cookie-banner p {
      font-size: 12.5px;
      color: rgba(255,255,255,0.7);
      line-height: 1.6;
      margin: 0;
      flex: 1;
      min-width: 240px;
    }
    #cookie-banner a {
      color: #C9A84C;
      text-decoration: underline;
    }
    #cookie-banner .cookie-btns {
      display: flex;
      gap: 0.75rem;
      flex-shrink: 0;
    }
    #cookie-banner button {
      font-size: 12.5px;
      font-weight: 600;
      padding: 0.55rem 1.1rem;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
    }
    #cookie-banner button:hover { opacity: 0.85; }
    #cookie-banner .cookie-aceptar {
      background: #C9A84C;
      color: #0D1B2A;
    }
    @media (max-width: 600px) {
      #cookie-banner .cookie-inner { flex-direction: column; align-items: stretch; }
      #cookie-banner .cookie-btns { justify-content: stretch; }
      #cookie-banner button { flex: 1; }
    }
  `;
  document.head.appendChild(estilo);

  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-inner">
      <p>Usamos únicamente cookies técnicas necesarias para el funcionamiento de la web y el proceso de pago con Stripe. No utilizamos cookies de publicidad ni de seguimiento. <a href="/privacidad.html#cookies">Más información</a></p>
      <div class="cookie-btns">
        <button type="button" class="cookie-aceptar" id="cookie-aceptar">Entendido</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('cookie-aceptar').addEventListener('click', function () {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ aceptado: true, fecha: new Date().toISOString() }));
    banner.remove();
  });
})();
