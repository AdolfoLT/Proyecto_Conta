/* app.js — arranque y navegación del home. Sin reglas de negocio ni datos propios. */
const App = (() => {
  const { $, $$ } = UI;
  const modulos = {};
  const estado = { cuentas: [], sesion: null };
  let pendiente = null;

  const registrar = (nombre, modulo) => { modulos[nombre] = modulo; };

  function mostrar() {
    const pedida = location.hash.slice(1);
    const vista = Object.hasOwn(modulos, pedida) ? pedida : 'catalogo';
    $$('main > section[data-vista]').forEach((s) => { s.hidden = s.dataset.vista !== vista; });
    $$('.nav a').forEach((a) => (a.getAttribute('href') === `#${vista}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    const params = pendiente || {};
    pendiente = null;
    if (modulos[vista].mostrar) modulos[vista].mostrar(params);
  }

  const ir = (vista, params) => {
    pendiente = params || null;
    if (location.hash === `#${vista}`) mostrar(); else location.hash = vista;
  };

  // Los módulos avisan aquí cuando cambia el catálogo; los demás escuchan el evento
  function publicarCuentas(lista) {
    estado.cuentas = lista;
    document.dispatchEvent(new CustomEvent('catalogo:cambio'));
  }

  // Periodo por defecto: el de la sesión; si no llegó, del 1 de enero a hoy (solo para rellenar los campos)
  function periodo() {
    const p = estado.sesion && estado.sesion.periodo;
    if (p && p.desde && p.hasta) return p;
    return { desde: `${new Date().getFullYear()}-01-01`, hasta: UI.hoyISO() };
  }

  async function salir() {
    try { await Api.post('salida'); location.href = `${CONFIG.rutas.login}?ok=salida`; }
    catch (e) { UI.alerta('error', UI.mensaje(e)); }
  }

  async function iniciar() {
    Api.alExpirarSesion = () => { location.href = CONFIG.rutas.login; };
    try {
      estado.sesion = await Api.get('sesion');
      $('#usuario').textContent = estado.sesion.usuario || '';
    } catch (e) { UI.alerta('error', UI.mensaje(e)); }
    Object.values(modulos).forEach((m) => m.iniciar && m.iniciar());
    $('#salir').addEventListener('click', salir);
    window.addEventListener('hashchange', mostrar);
    mostrar();
  }

  return { registrar, ir, publicarCuentas, periodo, iniciar, estado };
})();
