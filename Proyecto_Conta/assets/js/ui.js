/* ui.js — utilidades de interfaz compartidas (sin reglas de negocio). */
const UI = (() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ---------- Formato ---------- */
  const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const mxn = (n) => moneda.format(Number.isFinite(Number(n)) ? Number(n) : 0);
  const cifra = (n) => (Number(n) < 0 ? `(${mxn(-n)})` : mxn(n));          // negativos entre paréntesis
  const cent = (v) => Math.round((parseFloat(v) || 0) * 100);
  const fecha = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const hoyISO = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

  /* ---------- Mensajes ---------- */
  const MSG = {
    red: 'No se pudo conectar con el servidor. Revisa tu conexión.',
    servidor: 'No se pudo completar la solicitud. Inténtalo de nuevo.',
    sesion: 'Tu sesión expiró. Inicia sesión de nuevo.',
    credenciales: 'Usuario o contraseña incorrectos.',
    datos: 'Revisa los datos e inténtalo de nuevo.',
    usuario_existe: 'Ese usuario ya está registrado.',
    correo_existe: 'Ese correo ya está registrado.',
    archivo: 'No se pudo recibir alguno de los archivos. Verifica el formato y el tamaño.',
    captcha: 'No se pudo validar el captcha. Inténtalo de nuevo.',
    duplicado: 'Ese folio ya existe.',
    madre_con_movimientos: 'La cuenta madre ya tiene movimientos; solo las del último nivel los reciben.',
    folio_agotado: 'La cuenta madre ya no tiene folios libres.',
    no_cuadra: 'La póliza no cuadra: el Debe y el Haber deben ser iguales.'
  };
  const mensaje = (e) => MSG[e && e.codigo] || MSG.servidor;

  /* ---------- Alerta (#alerta): en línea en el acceso, aviso flotante en el home ---------- */
  let reloj = null;
  function alerta(tipo, texto, autoOcultar = false) {
    const el = $('#alerta');
    clearTimeout(reloj);
    el.className = `alert alert--${tipo}${el.classList.contains('toast') ? ' toast' : ''}`;
    $('#alerta-texto').textContent = texto;
    el.hidden = false;
    if (autoOcultar) reloj = setTimeout(limpiarAlerta, 5000);
  }
  function limpiarAlerta() {
    const el = $('#alerta');
    if (!el || el.hidden) return;
    if (!el.classList.contains('toast')) { el.hidden = true; return; }
    el.classList.add('is-out');
    setTimeout(() => { el.hidden = true; el.classList.remove('is-out'); }, 160);
  }

  /* ---------- Botón con estado de carga ---------- */
  function ocupado(btn, on, texto) {
    const et = $('.btn__text', btn);
    if (!btn.dataset.texto) btn.dataset.texto = et.textContent;
    btn.disabled = on;
    $('.btn__spinner', btn).hidden = !on;
    et.textContent = on ? texto : btn.dataset.texto;
  }

  /* ---------- Estado de una zona (cargando / vacío / error); sin tipo la limpia ---------- */
  function estado(el, tipo, texto) {
    el.hidden = !tipo;
    el.className = `estado${tipo ? ` estado--${tipo}` : ''}`;
    el.textContent = tipo === 'cargando' ? (texto || 'Cargando…') : (texto || '');
  }

  return { $, $$, esc, norm, mxn, cifra, cent, fecha, hoyISO, mensaje, alerta, limpiarAlerta, ocupado, estado };
})();
