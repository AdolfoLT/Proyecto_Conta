/* poliza.js — captura de la póliza. La validación visual solo ayuda: el servidor valida de nuevo. */
(() => {
  const { $, $$, esc, mxn, cent } = UI;
  const form = $('#pol-form'), filas = $('#pol-filas'), lista = $('#pol-cuentas'), btn = $('#pol-enviar'), msg = $('#pol-msg');
  const hojas = () => App.estado.cuentas.filter((c) => c.hoja);
  const hoja = (f) => hojas().find((c) => c.folio === f);

  function nuevaLinea() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="in-folio" list="pol-cuentas" maxlength="12" inputmode="numeric" aria-label="Folio" autocomplete="off"></td>
      <td class="nombre"></td>
      <td><input class="in-debe" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" aria-label="Debe"></td>
      <td><input class="in-haber" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" aria-label="Haber"></td>
      <td><button type="button" class="quitar" aria-label="Quitar línea">×</button></td>`;
    filas.append(tr);
    return tr;
  }

  const leer = () => $$('tr', filas).map((tr) => ({
    tr, folio: $('.in-folio', tr).value.trim(), debe: cent($('.in-debe', tr).value), haber: cent($('.in-haber', tr).value)
  }));

  function revisar() {
    const ls = leer();
    let debe = 0, haber = 0;
    ls.forEach((l) => {
      debe += l.debe; haber += l.haber;
      const c = hoja(l.folio);
      l.tr.classList.toggle('es-haber', l.haber > 0);
      $('.nombre', l.tr).innerHTML = !l.folio ? '' : c ? esc(c.nombre) : '<span class="malo">Folio no válido o cuenta agrupadora</span>';
    });
    const activas = ls.filter((l) => l.folio || l.debe || l.haber);
    let texto = '';
    if (activas.length && activas.length < 2) texto = 'Captura al menos dos movimientos.';
    else if (activas.some((l) => !hoja(l.folio))) texto = 'Hay un folio que no es una subcuenta del catálogo.';
    else if (activas.some((l) => (l.debe > 0) === (l.haber > 0))) texto = 'Cada movimiento va en el Debe o en el Haber, nunca en ambos ni vacío.';
    else if (debe !== haber) texto = 'El Debe y el Haber deben ser iguales.';
    const cuadra = activas.length >= 2 && !texto;

    $('#pol-debe').textContent = mxn(debe / 100);
    $('#pol-haber').textContent = mxn(haber / 100);
    const dif = $('#pol-dif');
    dif.textContent = mxn((debe - haber) / 100);
    dif.className = `num ${activas.length ? (debe === haber ? 'ok' : 'bad') : ''}`;
    msg.textContent = cuadra ? 'La póliza cuadra.' : texto;
    msg.className = `pol__msg ${cuadra ? 'is-ok' : texto ? 'is-error' : ''}`;
    btn.disabled = !cuadra;
    return { activas, cuadra };
  }

  function limpiar() {
    filas.innerHTML = '';
    nuevaLinea(); nuevaLinea();
    $('#pol-concepto').value = '';
    $('#pol-fecha').value = UI.hoyISO();
    revisar();
  }

  filas.addEventListener('input', (e) => {
    const tr = e.target.closest('tr');
    if (e.target.classList.contains('in-debe') && e.target.value) $('.in-haber', tr).value = '';
    if (e.target.classList.contains('in-haber') && e.target.value) $('.in-debe', tr).value = '';
    revisar();
  });
  filas.addEventListener('click', (e) => {
    if (!e.target.closest('.quitar')) return;
    if (filas.rows.length > 2) e.target.closest('tr').remove();
    revisar();
  });
  filas.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    const tr = e.target.closest('tr');
    $('.in-folio', tr.nextElementSibling || nuevaLinea()).focus();
  });
  $('#pol-linea').addEventListener('click', () => $('.in-folio', nuevaLinea()).focus());
  $('#pol-limpiar').addEventListener('click', limpiar);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { activas, cuadra } = revisar();
    if (!cuadra) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    UI.ocupado(btn, true, 'Registrando…');
    try {
      const r = await Api.post('polizas', {
        fecha: $('#pol-fecha').value,
        concepto: $('#pol-concepto').value.trim(),
        movimientos: activas.map((l) => ({ folio: l.folio, debe: l.debe / 100, haber: l.haber / 100 }))
      });
      UI.alerta('ok', r.numero ? `Póliza ${r.numero} registrada.` : 'Póliza registrada.', true);
      limpiar();
    } catch (err) { UI.alerta('error', UI.mensaje(err)); }
    finally { UI.ocupado(btn, false); revisar(); }
  });

  document.addEventListener('catalogo:cambio', () => {
    lista.innerHTML = hojas().map((c) => `<option value="${esc(c.folio)}" label="${esc(c.nombre)}"></option>`).join('');
    revisar();
  });
  App.registrar('poliza', { iniciar: limpiar });
})();
