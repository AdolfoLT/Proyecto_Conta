/* api.js — única puerta de salida a la red (Ajax). No guarda ni simula datos. */
const Api = (() => {
  const url = (nombre, query) => {
    const base = CONFIG.api.base + nombre + CONFIG.api.sufijo;
    const qs = new URLSearchParams(Object.entries(query || {}).filter(([, v]) => v !== '' && v != null)).toString();
    return qs ? `${base}?${qs}` : base;
  };

  async function pedir(nombre, { method = 'GET', query, body } = {}) {
    const ctl = new AbortController();
    const reloj = setTimeout(() => ctl.abort(), CONFIG.api.timeoutMs);
    const init = { method, credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: ctl.signal };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }

    let res;
    try { res = await fetch(url(nombre, query), init); }
    catch { throw { codigo: 'red' }; }
    finally { clearTimeout(reloj); }

    let datos = null;
    try { datos = await res.json(); } catch { /* respuesta sin JSON */ }

    if (res.status === 401 && Api.alExpirarSesion) Api.alExpirarSesion();
    if (!res.ok || (datos && datos.ok === false)) throw { codigo: (datos && datos.error) || 'servidor', datos: datos || {}, status: res.status };
    return datos || {};
  }

  return {
    alExpirarSesion: null,
    get: (nombre, query) => pedir(nombre, { query }),
    post: (nombre, body) => pedir(nombre, { method: 'POST', body: body === undefined ? {} : body })
  };
})();
