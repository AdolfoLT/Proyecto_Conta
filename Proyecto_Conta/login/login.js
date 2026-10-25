/* login.js — envía las credenciales por Ajax y reacciona a la respuesta. */
(() => {
  const { $ } = UI;
  const form = $('#login-form'), btn = $('#enviar');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    UI.limpiarAlerta();
    UI.ocupado(btn, true, 'Verificando…');
    try {
      const r = await Api.post('login', { username: form.username.value.trim(), password: form.password.value });
      location.href = r.destino || CONFIG.rutas.home;
    } catch (err) {
      if (err.datos && err.datos.captcha) { location.href = CONFIG.rutas.captcha; return; }
      let texto = UI.mensaje(err);
      const n = parseInt(err.datos && err.datos.restantes, 10);
      if (err.codigo === 'credenciales' && Number.isInteger(n) && n >= 0) texto += n === 1 ? ' Te queda 1 intento.' : ` Te quedan ${n} intentos.`;
      UI.alerta('error', texto);
      form.password.value = '';
      form.password.focus();
      UI.ocupado(btn, false);
    }
  });
})();
