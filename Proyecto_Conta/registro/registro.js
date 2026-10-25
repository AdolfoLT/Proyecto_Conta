/* registro.js — validación visual y envío por Ajax (multipart). El servidor valida de nuevo. */
(() => {
  const { $, $$ } = UI;
  const form = $('#registro-form'), btn = $('#enviar');
  const pass = $('#password'), pass2 = $('#password2'), fuerza = $('#fuerza'), coincide = $('#coincide');
  const NIVELES = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];

  /* ---------- Seguridad de la contraseña (solo guía visual) ---------- */
  function nivel(v) {
    if (!v) return 0;
    if (v.length < 8) return 1;
    const pts = (v.length >= 12) + (/[a-z]/.test(v) && /[A-Z]/.test(v)) + /\d/.test(v) + /[^A-Za-z0-9]/.test(v) + 1;
    return Math.min(4, Math.max(1, pts - 1));
  }
  function pintarFuerza() {
    const n = nivel(pass.value);
    fuerza.hidden = n === 0;
    fuerza.dataset.nivel = String(n);
    $('#fuerza-texto').textContent = NIVELES[n];
  }

  /* ---------- Coincidencia ---------- */
  function revisarCoincidencia() {
    const b = pass2.value;
    if (!b) { pass2.setCustomValidity(''); pass2.classList.remove('is-invalid'); coincide.hidden = true; return; }
    const igual = pass.value === b;
    pass2.setCustomValidity(igual ? '' : 'Las contraseñas no coinciden.');
    pass2.classList.toggle('is-invalid', !igual);
    coincide.textContent = igual ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.';
    coincide.classList.toggle('field__msg--ok', igual);
    coincide.hidden = false;
  }
  pass.addEventListener('input', () => { pintarFuerza(); revisarCoincidencia(); });
  pass2.addEventListener('input', revisarCoincidencia);

  /* ---------- Archivos ---------- */
  const MAX = CONFIG.archivos.maxMB * 1024 * 1024;
  $$('input[type="file"]', form).forEach((inp) => {
    const msg = document.getElementById(`${inp.id}-msg`);
    inp.addEventListener('change', () => {
      const f = inp.files[0];
      let err = '';
      if (f && !CONFIG.archivos.tipos.includes(f.type)) err = 'Formato no válido. Usa JPG, PNG, WEBP o PDF.';
      else if (f && f.size > MAX) err = `El archivo supera los ${CONFIG.archivos.maxMB} MB.`;
      inp.setCustomValidity(err);
      inp.classList.toggle('is-invalid', Boolean(err));
      msg.textContent = err || (f ? f.name : '');
      msg.hidden = !msg.textContent;
      msg.classList.toggle('field__msg--ok', !err && Boolean(f));
    });
  });

  /* ---------- Envío ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    UI.limpiarAlerta();
    UI.ocupado(btn, true, 'Creando cuenta…');
    const datos = new FormData(form);
    datos.delete('password2');
    try {
      await Api.post('registro', datos);
      location.href = `${CONFIG.rutas.login}?ok=registro`;
    } catch (err) {
      UI.alerta('error', UI.mensaje(err));
      UI.ocupado(btn, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
})();
