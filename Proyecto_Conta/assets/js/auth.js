/* auth.js — comportamiento común del acceso (login, registro, captcha). */
(() => {
  // Mostrar / ocultar contraseña
  UI.$$('.field__toggle[data-toggle]').forEach((btn) => {
    const input = document.getElementById(btn.dataset.toggle);
    btn.addEventListener('click', () => {
      const oculto = input.type === 'password';
      input.type = oculto ? 'text' : 'password';
      btn.textContent = oculto ? 'Ocultar' : 'Mostrar';
      btn.setAttribute('aria-pressed', String(oculto));
    });
  });

  // Quitar el aviso en cuanto la persona vuelve a escribir
  document.querySelectorAll('form').forEach((f) => f.addEventListener('input', UI.limpiarAlerta));

  // Avisos de éxito al llegar por redirección de otra página: ?ok=registro | salida | captcha
  const OKS = {
    registro: 'Cuenta creada. Ya puedes iniciar sesión.',
    salida: 'Cerraste sesión correctamente.',
    captcha: 'Verificación completada. Ya puedes iniciar sesión.'
  };
  const ok = new URLSearchParams(location.search).get('ok');
  if (ok && Object.hasOwn(OKS, ok)) UI.alerta('ok', OKS[ok]);

  // Al volver con "atrás" el navegador conserva el botón en "cargando"
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    const b = document.getElementById('enviar');
    if (b && b.dataset.texto) UI.ocupado(b, false);
  });
})();
