/**
 * captcha.js — SOLO comportamiento visual.
 * Habilita el botón cuando el usuario marca el captcha y muestra el estado de
 * carga al enviar. La validación real del captcha y la decisión de a dónde
 * redirigir (de vuelta al login o de nuevo aquí) las hace PHP.
 *
 * Contrato opcional para mostrar errores:
 *   captcha.html?error=captcha
 */
(() => {
  const form      = document.getElementById('captcha-form');
  const btn       = document.getElementById('continuar');
  const btnText   = document.getElementById('continuar-text');
  const spinner   = btn.querySelector('.btn__spinner');
  const errorBox  = document.getElementById('error');
  const errorText = document.getElementById('error-text');

  const MENSAJES = {
    captcha: 'No se pudo validar el captcha. Inténtalo de nuevo.',
    servidor: 'No se pudo completar la solicitud. Intenta de nuevo.'
  };

  // ---------- Mensajes de error ----------
  function mostrarError(mensaje) {
    errorText.textContent = mensaje;
    errorBox.hidden = false;
  }

  function limpiarError() {
    errorText.textContent = '';
    errorBox.hidden = true;
  }

  function mostrarErrorDeUrl() {
    const codigo = new URLSearchParams(window.location.search).get('error');
    if (codigo && codigo in MENSAJES) mostrarError(MENSAJES[codigo]);
  }

  // ---------- Estado del botón ----------
  function setCargando(cargando) {
    spinner.hidden = !cargando;
    btnText.textContent = cargando ? 'Verificando...' : 'Continuar';
    btn.disabled = cargando;
  }

  // ---------- Callbacks de reCAPTCHA (deben ser globales) ----------
  window.onCaptchaOk = () => {
    limpiarError();
    btn.disabled = false;
  };

  window.onCaptchaExpirado = () => {
    btn.disabled = true;
    mostrarError('El captcha expiró. Márcalo de nuevo.');
  };

  window.onCaptchaError = () => {
    btn.disabled = true;
    mostrarError('No se pudo cargar el captcha. Revisa tu conexión e intenta de nuevo.');
  };

  // ---------- Envío ----------
  // Sin preventDefault: el navegador envía el formulario a PHP.
  form.addEventListener('submit', () => {
    limpiarError();
    setCargando(true);
  });

  // Si el usuario regresa con el botón "atrás", el captcha hay que marcarlo otra vez
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      setCargando(false);
      btn.disabled = true;
      if (window.grecaptcha) window.grecaptcha.reset();
    }
  });

  mostrarErrorDeUrl();
})();