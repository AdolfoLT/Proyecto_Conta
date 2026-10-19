/**
 * registro.js — SOLO comportamiento visual.
 * No hace peticiones ni guarda datos: el formulario se envía de forma nativa
 * (POST) a PHP, que debe volver a validar todo, comprobar que el usuario y el
 * correo no existan, y guardar la contraseña con password_hash().
 *
 * Contrato opcional para mostrar errores: si PHP redirige de vuelta a esta
 * página con un parámetro en la URL, aquí solo se traduce a un mensaje.
 *   registro.html?error=usuario_existe
 *   registro.html?error=correo_existe
 *   registro.html?error=datos
 *   registro.html?error=servidor
 */
(() => {
  const form       = document.getElementById('registro-form');
  const inputPass  = document.getElementById('password');
  const inputPass2 = document.getElementById('password2');
  const btnSubmit  = document.getElementById('submit');
  const submitText = document.getElementById('submit-text');
  const spinner    = btnSubmit.querySelector('.btn__spinner');
  const errorBox   = document.getElementById('error');
  const errorText  = document.getElementById('error-text');
  const strength   = document.getElementById('strength');
  const strengthLb = document.getElementById('strength-label');
  const matchMsg   = document.getElementById('match-msg');

  const MENSAJES = {
    usuario_existe: 'Ese usuario ya está registrado.',
    correo_existe: 'Ese correo ya está registrado.',
    datos: 'Revisa los datos e intenta de nuevo.',
    servidor: 'No se pudo completar la solicitud. Intenta de nuevo.'
  };

  const NIVELES = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];

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

  // ---------- Mostrar / ocultar contraseña (ambos campos) ----------
  document.querySelectorAll('.field__toggle[data-toggle]').forEach((btn) => {
    const input = document.getElementById(btn.dataset.toggle);
    const iconOn = btn.querySelector('.icon-eye-on');
    const iconOff = btn.querySelector('.icon-eye-off');

    btn.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      iconOn.hidden = !visible;
      iconOff.hidden = visible;
      btn.setAttribute('aria-pressed', String(!visible));
      btn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  });

  // ---------- Indicador de seguridad ----------
  // Es solo una guía visual; la política real de contraseñas la define el servidor.
  function calcularNivel(valor) {
    if (!valor) return 0;

    let puntos = 0;
    if (valor.length >= 8) puntos++;
    if (valor.length >= 12) puntos++;
    if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) puntos++;
    if (/\d/.test(valor)) puntos++;
    if (/[^A-Za-z0-9]/.test(valor)) puntos++;

    // Contraseñas cortas nunca pasan de "Débil"
    if (valor.length < 8) return 1;

    return Math.min(4, Math.max(1, puntos - 1));
  }

  function actualizarFuerza() {
    const nivel = calcularNivel(inputPass.value);
    strength.hidden = nivel === 0;
    strength.dataset.nivel = String(nivel);
    strengthLb.textContent = NIVELES[nivel];
  }

  // ---------- Coincidencia de contraseñas ----------
  function actualizarCoincidencia() {
    const a = inputPass.value;
    const b = inputPass2.value;

    // No molestar mientras el segundo campo está vacío
    if (!b) {
      inputPass2.setCustomValidity('');
      inputPass2.classList.remove('is-invalid');
      matchMsg.hidden = true;
      return;
    }

    if (a === b) {
      inputPass2.setCustomValidity('');
      inputPass2.classList.remove('is-invalid');
      matchMsg.textContent = 'Las contraseñas coinciden.';
      matchMsg.classList.add('field__msg--ok');
    } else {
      inputPass2.setCustomValidity('Las contraseñas no coinciden.');
      inputPass2.classList.add('is-invalid');
      matchMsg.textContent = 'Las contraseñas no coinciden.';
      matchMsg.classList.remove('field__msg--ok');
    }
    matchMsg.hidden = false;
  }

  inputPass.addEventListener('input', () => {
    actualizarFuerza();
    actualizarCoincidencia();
  });
  inputPass2.addEventListener('input', actualizarCoincidencia);

  // ---------- Estado del botón ----------
  function setCargando(cargando) {
    btnSubmit.disabled = cargando;
    spinner.hidden = !cargando;
    submitText.textContent = cargando ? 'Creando cuenta...' : 'Crear cuenta';
  }

  // ---------- Envío ----------
  // No se usa preventDefault: el navegador valida y envía el formulario a PHP.
  // Este evento solo se dispara si la validación nativa pasó.
  form.addEventListener('submit', () => {
    limpiarError();
    setCargando(true);
  });

  // Si el usuario regresa con el botón "atrás", restablecer el botón
  window.addEventListener('pageshow', () => setCargando(false));

  // Quitar el error del servidor en cuanto el usuario vuelve a escribir
  form.addEventListener('input', limpiarError);

  mostrarErrorDeUrl();
})();