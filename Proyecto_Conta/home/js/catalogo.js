/* catalogo.js — listado, búsqueda por folio/nombre y alta de cuentas. */
(() => {
  const { $, esc, norm } = UI;
  const filas = $('#cat-filas'), buscar = $('#cat-buscar'), conteo = $('#cat-conteo'), zona = $('#cat-estado');
  const form = $('#cat-form'), madre = $('#cat-madre'), folio = $('#cat-folio'), nat = $('#cat-nat'), nombre = $('#cat-nombre');
  const btn = $('button[type="submit"]', form);
  const cuentas = () => App.estado.cuentas;
  let pedido = 0;

  function pintar() {
    const q = buscar.value.trim(), t = norm(q);
    const lista = cuentas().filter((c) => !q || (/^\d+$/.test(q) ? c.folio.startsWith(q) : norm(c.nombre).includes(t) || norm(c.alias).includes(t)));
    filas.innerHTML = lista.map((c) => `
      <tr data-folio="${esc(c.folio)}" class="${c.hoja ? '' : 'es-madre'}" title="Ver cuenta T">
        <td class="mono">${esc(c.folio)}</td>
        <td style="padding-left:${12 + (c.nivel - 1) * 16}px">${esc(c.nombre)}${c.alias ? ` <span class="suave">· ${esc(c.alias)}</span>` : ''}</td>
        <td>${c.naturaleza === 'D' ? 'Deudora' : 'Acreedora'}</td></tr>`).join('');
    if (!cuentas().length) UI.estado(zona, 'vacio', 'Aún no hay cuentas en el catálogo.');
    else if (!lista.length) UI.estado(zona, 'vacio', 'Sin coincidencias.');
    else UI.estado(zona, null);
    conteo.textContent = q && cuentas().length ? `${lista.length} de ${cuentas().length} cuentas` : '';
  }

  function llenarMadres() {
    const previa = madre.value;
    madre.innerHTML = '<option value="">Seleccionar…</option>' + cuentas().filter((c) => c.nivel < 5)
      .map((c) => `<option value="${esc(c.folio)}">${esc(c.folio)} — ${esc(c.nombre)}</option>`).join('');
    madre.value = previa;
  }

  async function cargar() {
    UI.estado(zona, 'cargando');
    try { App.publicarCuentas((await Api.get('catalogo')).cuentas || []); }
    catch (e) { UI.estado(zona, 'error', UI.mensaje(e)); }
  }

  async function sugerirFolio() {
    const c = cuentas().find((x) => x.folio === madre.value);
    folio.value = '';
    if (!c) return;
    nat.value = c.naturaleza;
    const mio = ++pedido;
    folio.placeholder = 'Calculando…';
    try {
      const r = await Api.get('catalogo/siguiente', { madre: c.folio });
      if (mio !== pedido) return;
      folio.value = r.folio || '';
      folio.placeholder = r.folio ? '' : 'Sin folios libres';
    } catch (e) { if (mio === pedido) { folio.placeholder = ''; UI.alerta('error', UI.mensaje(e)); } }
  }

  buscar.addEventListener('input', pintar);
  madre.addEventListener('change', sugerirFolio);
  filas.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-folio]');
    if (tr) App.ir('cuenta-t', { folio: tr.dataset.folio });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!folio.value) { UI.alerta('error', UI.mensaje({ codigo: 'folio_agotado' })); return; }
    UI.ocupado(btn, true, 'Guardando…');
    try {
      const r = await Api.post('catalogo', { madre: madre.value, nombre: nombre.value.trim(), naturaleza: nat.value });
      nombre.value = '';
      UI.alerta('ok', `Cuenta${r.cuenta && r.cuenta.folio ? ` ${r.cuenta.folio}` : ''} creada.`, true);
      await cargar();
      llenarMadres();
      sugerirFolio();
    } catch (err) { UI.alerta('error', UI.mensaje(err)); }
    finally { UI.ocupado(btn, false); }
  });

  document.addEventListener('catalogo:cambio', () => { pintar(); llenarMadres(); });
  App.registrar('catalogo', { iniciar: cargar });
})();
