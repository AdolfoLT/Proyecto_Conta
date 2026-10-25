/* captcha.js — reCAPTCHA (render explícito) y verificación por Ajax. */
(() => {
  const { $ } = UI;
  const form = $('#captcha-form'), btn = $('#enviar');
  let widget = null;

  // Google llama a esta función global cuando su script termina de cargar
  window.cargarCaptcha = () => {
    widget = grecaptcha.render('captcha-widget', {
      sitekey: CONFIG.recaptchaSiteKey,
      callback: () => { UI.limpiarAlerta(); btn.disabled = false; },
      'expired-callback': () => { btn.disabled = true; UI.alerta('error', 'El captcha expiró. Márcalo de nuevo.'); },
      'error-callback': () => { btn.disabled = true; UI.alerta('error', 'No se pudo cargar el captcha. Revisa tu conexión e intenta de nuevo.'); }
    });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = window.grecaptcha && widget !== null ? grecaptcha.getResponse(widget) : '';
    if (!token) return;
    UI.limpiarAlerta();
    UI.ocupado(btn, true, 'Verificando…');
    try {
      await Api.post('captcha', { token });
      location.href = `${CONFIG.rutas.login}?ok=captcha`;
    } catch (err) {
      UI.alerta('error', UI.mensaje(err));
      grecaptcha.reset(widget);
      UI.ocupado(btn, false);
      btn.disabled = true;
    }
  });

  // Al volver con "atrás" el captcha hay que marcarlo otra vez
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && widget !== null) { grecaptcha.reset(widget); UI.ocupado(btn, false); btn.disabled = true; }
  });
})();
