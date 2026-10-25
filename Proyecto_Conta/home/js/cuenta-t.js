/* cuenta-t.js — movimientos de una cuenta madre o subcuenta en forma de T. */
(() => {
  const { $, $$, esc, mxn } = UI;
  const sel = $('#t-cuenta'), vista = $('#t-vista'), zona = $('#t-estado');
  let pedido = 0;

  function opciones() {
    const previa = sel.value;
    sel.innerHTML = '<option value="">Seleccionar…</option>' + App.estado.cuentas
      .map((c) => `<option value="${esc(c.folio)}">${'\u00a0\u00a0'.repeat(c.nivel - 1)}${esc(c.folio)} — ${esc(c.nombre)}</option>`).join('');
    sel.value = previa;
  }

  function pintar(r) {
    const mov = r.movimientos || [];
    const izq = mov.filter((m) => Number(m.debe)).map((m) => `<li><span class="suave">${esc(m.poliza)})</span><span>${mxn(m.debe)}</span></li>`).join('');
    const der = mov.filter((m) => Number(m.haber)).map((m) => `<li><span>${mxn(m.haber)}</span><span class="suave">(${esc(m.poliza)}</span></li>`).join('');
    const s = r.sumas || {}, sd = r.saldo || {};
    const subs = (r.subcuentas || []).map((h) => `<button type="button" class="chip" data-folio="${esc(h.folio)}">${esc(h.nombre)} · ${mxn(h.importe)}</button>`).join('');
    vista.innerHTML = `
      <div class="cuenta-t">
        <p class="cuenta-t__titulo">${esc(r.cuenta.folio)} ${esc(r.cuenta.nombre)}</p>
        <div class="cuenta-t__lados"><ul class="cuenta-t__lado">${izq}</ul><ul class="cuenta-t__lado">${der}</ul></div>
        <div class="cuenta-t__sumas"><span>${mxn(s.debe)}</span><span>${mxn(s.haber)}</span></div>
        <div class="cuenta-t__saldo">Saldo ${esc(sd.lado || '')} <strong>${mxn(sd.importe)}</strong></div>
      </div>${subs ? `<div class="subcuentas" aria-label="Subcuentas">${subs}</div>` : ''}`;
  }

  async function cargar(folio) {
    vista.innerHTML = '';
    if (!folio) { UI.estado(zona, null); return; }
    const mio = ++pedido;
    UI.estado(zona, 'cargando');
    try {
      const r = await Api.get('cuentas-t', { folio });
      if (mio !== pedido) return;
      UI.estado(zona, null);
      pintar(r);
    } catch (e) { if (mio === pedido) UI.estado(zona, 'error', UI.mensaje(e)); }
  }

  sel.addEventListener('change', () => cargar(sel.value));
  vista.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b) { sel.value = b.dataset.folio; cargar(b.dataset.folio); }
  });
  document.addEventListener('catalogo:cambio', opciones);
  App.registrar('cuenta-t', { mostrar: (p) => { if (p.folio) { sel.value = p.folio; cargar(p.folio); } } });
})();
