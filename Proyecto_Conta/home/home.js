/**
 * home.js — SOLO comportamiento visual. No guarda datos ni conoce reglas
 * contables: PHP imprime las filas, opciones y números, y valida todo de nuevo.
 * Contrato opcional por URL: ?modo=catalogo|poliza|t|balanza
 *   ?ok=cuenta|poliza   ?error=datos|servidor
 */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ---------- Aviso ---------- */
  const aviso = $('#aviso');
  const mostrarAviso = (tipo, txt) => { aviso.className = `aviso aviso--${tipo}`; $('#aviso-texto').textContent = txt; aviso.hidden = false; };
  $('#aviso-cerrar').addEventListener('click', () => { aviso.hidden = true; });
  const MENSAJES = {
    cuenta: ['ok', 'Cuenta creada con éxito.'], poliza: ['ok', 'Póliza registrada con éxito.'],
    datos: ['error', 'Revisa los datos e inténtalo de nuevo.'], servidor: ['error', 'No se pudo completar la solicitud. Inténtalo de nuevo.']
  };
  const clave = params.get('ok') || params.get('error');
  if (clave && Object.hasOwn(MENSAJES, clave)) mostrarAviso(...MENSAJES[clave]);

  /* ---------- Formato de moneda ---------- */
  $$('[data-moneda]').forEach((el) => { const n = Number(el.dataset.moneda); el.textContent = moneda.format(Number.isFinite(n) ? n : 0); });
  $('#b-empresa').textContent = $('#empresa').textContent;
  $('#b-periodo').textContent = $('#periodo').textContent;

  /* ---------- Pestañas ---------- */
  const tabs = $$('[role="tab"]');
  const paneles = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const MODOS = tabs.map((t) => t.dataset.modo);
  function activar(modo, enfocar = false) {
    tabs.forEach((t, i) => {
      const on = t.dataset.modo === modo;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; paneles[i].hidden = !on;
      if (on) $('#panel-titulo').textContent = t.dataset.titulo;
      if (on && enfocar) t.focus();
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activar(t.dataset.modo));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
      if (d === undefined) return;
      e.preventDefault(); activar(MODOS[d], true);
    });
  });

  /* ---------- Estado de carga de los botones de envío ---------- */
  const botones = [];
  function enviando(form, texto) {
    const b = $('button[type="submit"]', form), et = $('.btn__text', b);
    botones.push(b); b.dataset.texto = et.textContent;
    form.addEventListener('submit', () => { b.disabled = true; $('.btn__spinner', b).hidden = false; et.textContent = texto; });
  }
  window.addEventListener('pageshow', () => botones.forEach((b) => {
    b.disabled = b.id === 'p-registrar'; $('.btn__spinner', b).hidden = true; $('.btn__text', b).textContent = b.dataset.texto;
  }));

  /* ---------- Catálogo: filtro sobre las filas que imprime PHP ---------- */
  const buscar = $('#c-buscar');
  buscar.addEventListener('input', () => {
    const q = buscar.value.trim(), t = norm(q), filas = $$('#c-filas tr[data-folio]');
    let visibles = 0;
    filas.forEach((tr) => {
      const ok = !q || (/^\d+$/.test(q) ? tr.dataset.folio.startsWith(q) : norm(tr.textContent).includes(t));
      tr.hidden = !ok; if (ok) visibles++;
    });
    $('#c-vacio').hidden = !q || visibles > 0 || !filas.length;
    $('#c-cuenta').textContent = q && filas.length ? `${visibles} de ${filas.length} cuentas` : '';
  });
  $('#c-filas').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-folio]');
    if (tr) location.search = `?modo=t&cuenta=${encodeURIComponent(tr.dataset.folio)}`;
  });

  /* ---------- Alta de cuenta: el folio siguiente lo calcula PHP ---------- */
  $('#a-madre').addEventListener('change', (e) => {
    const op = e.target.selectedOptions[0];
    $('#a-folio').value = op ? op.dataset.siguiente || '' : '';
    if (op && op.dataset.nat) $('#a-nat').value = op.dataset.nat;
  });
  enviando($('#form-cuenta'), 'Guardando…');

  /* ---------- Póliza ---------- */
  const filas = $('#p-filas'), lista = $('#lista-hojas');
  const cent = (v) => Math.round((parseFloat(v) || 0) * 100);
  function nuevaLinea() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="in-folio" name="folio[]" list="lista-hojas" maxlength="12" inputmode="numeric" aria-label="Folio" autocomplete="off"></td>
      <td class="nombre"></td>
      <td><input class="in-debe" name="debe[]" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" aria-label="Debe"></td>
      <td><input class="in-haber" name="haber[]" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" aria-label="Haber"></td>
      <td><button type="button" class="file__remove" aria-label="Quitar línea">×</button></td>`;
    filas.append(tr);
    return tr;
  }
  // Ayuda visual: PHP repite estas reglas al guardar
  function recalcular() {
    let d = 0, h = 0, completas = 0;
    $$('tr', filas).forEach((tr) => {
      const f = $('.in-folio', tr).value.trim(), de = cent($('.in-debe', tr).value), ha = cent($('.in-haber', tr).value);
      const op = $$('option', lista).find((o) => o.value === f);
      $('.nombre', tr).textContent = op ? op.label : '';
      tr.classList.toggle('es-haber', ha > 0);
      d += de; h += ha;
      if (op && (de > 0) !== (ha > 0)) completas++;
    });
    $('#p-debe').textContent = moneda.format(d / 100);
    $('#p-haber').textContent = moneda.format(h / 100);
    const dif = $('#p-dif'); dif.textContent = moneda.format((d - h) / 100);
    const hay = d > 0 || h > 0;
    dif.className = `num ${hay ? (d === h ? 'ok' : 'bad') : ''}`;
    const cuadra = hay && d === h && completas >= 2 && completas === $$('tr', filas).filter((tr) => $('.in-folio', tr).value || $('.in-debe', tr).value || $('.in-haber', tr).value).length;
    $('#p-registrar').disabled = !cuadra;
    const msg = $('#p-msg');
    msg.textContent = !hay ? '' : cuadra ? 'La póliza cuadra.' : d !== h ? 'El Debe y el Haber deben ser iguales.' : 'Completa folio e importe en cada línea.';
    msg.className = `nota ${!hay ? '' : cuadra ? 'is-ok' : 'is-error'}`;
  }
  filas.addEventListener('input', (e) => {
    const tr = e.target.closest('tr');
    if (e.target.classList.contains('in-debe') && e.target.value) $('.in-haber', tr).value = '';
    if (e.target.classList.contains('in-haber') && e.target.value) $('.in-debe', tr).value = '';
    recalcular();
  });
  filas.addEventListener('click', (e) => {
    if (!e.target.closest('.file__remove')) return;
    if (filas.rows.length > 2) e.target.closest('tr').remove();
    recalcular();
  });
  filas.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    const tr = e.target.closest('tr');
    $('.in-folio', tr.nextElementSibling || nuevaLinea()).focus();
  });
  $('#p-linea').addEventListener('click', () => $('.in-folio', nuevaLinea()).focus());
  $('#form-poliza').addEventListener('reset', () => setTimeout(() => {
    filas.innerHTML = ''; nuevaLinea(); nuevaLinea(); $('#p-fecha').value = hoy; recalcular();
  }));
  enviando($('#form-poliza'), 'Registrando…');

  /* ---------- Cuentas T ---------- */
  const cuentaT = $('#t-cuenta');
  const urlCuenta = params.get('cuenta');
  if (urlCuenta) cuentaT.value = urlCuenta;
  $('#t-vacio').hidden = !!$('.cuenta-t') || !!cuentaT.value;
  cuentaT.addEventListener('change', () => { if (cuentaT.value) $('#form-t').submit(); });

  /* ---------- Arranque ---------- */
  const a = new Date(), p2 = (n) => String(n).padStart(2, '0');
  const hoy = `${a.getFullYear()}-${p2(a.getMonth() + 1)}-${p2(a.getDate())}`;
  $('#p-fecha').value = hoy;
  nuevaLinea(); nuevaLinea(); recalcular();
  activar(MODOS.includes(params.get('modo')) ? params.get('modo') : 'catalogo');
})();