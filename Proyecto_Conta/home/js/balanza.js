/* balanza.js — balanza de comprobación del periodo elegido. */
(() => {
  const { $, esc, mxn } = UI;
  const form = $('#bal-form'), desde = $('#bal-desde'), hasta = $('#bal-hasta'), vista = $('#bal-vista'), zona = $('#bal-estado');
  const btn = $('button[type="submit"]', form);
  const dinero = (n) => (Number(n) ? mxn(n) : '<span class="suave">—</span>');
  const par = (o) => `<td class="num">${dinero(o && o.debe)}</td><td class="num">${dinero(o && o.haber)}</td>`;
  const iguales = (o) => Math.round(Number(o.debe) * 100) === Math.round(Number(o.haber) * 100);
  let listo = false;

  function pintar(r) {
    const t = r.totales || {};
    const cuadra = t.movimientos && t.final && iguales(t.movimientos) && iguales(t.final);
    vista.innerHTML = `
      <div class="doc__cab"><strong>Balanza de comprobación</strong><span>Del ${esc(UI.fecha(desde.value))} al ${esc(UI.fecha(hasta.value))}</span></div>
      <div class="tabla-wrap"><table class="tabla">
        <thead>
          <tr><th rowspan="2">Cuenta</th><th colspan="2" class="num">Saldos iniciales</th><th colspan="2" class="num">Movimientos</th><th colspan="2" class="num">Saldos finales</th></tr>
          <tr><th class="num">Debe</th><th class="num">Haber</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Debe</th><th class="num">Haber</th></tr>
        </thead>
        <tbody>${(r.filas || []).map((f) => `<tr class="${f.hoja ? '' : 'es-madre'}"><td style="padding-left:${12 + (f.nivel - 1) * 16}px">${esc(f.nombre)}</td>${par(f.inicial)}${par(f.movimientos)}${par(f.final)}</tr>`).join('')}</tbody>
        <tfoot><tr><th>Sumas (iguales)</th>${par(t.inicial)}${par(t.movimientos)}${par(t.final)}</tr></tfoot>
      </table></div>
      <p class="doc__nota ${cuadra ? 'is-ok' : 'is-error'}">${cuadra ? 'Las sumas del Debe y del Haber coinciden.' : 'Las sumas no coinciden: revisa las pólizas.'}</p>
      ${r.leyenda ? `<p class="doc__nota">${esc(r.leyenda)}</p>` : ''}`;
  }

  async function generar() {
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (desde.value > hasta.value) { UI.alerta('error', 'La fecha inicial no puede ser posterior a la final.', true); return; }
    vista.innerHTML = '';
    UI.estado(zona, 'cargando');
    UI.ocupado(btn, true, 'Generando…');
    try { const r = await Api.get('balanza', { desde: desde.value, hasta: hasta.value }); UI.estado(zona, null); pintar(r); listo = true; }
    catch (e) { UI.estado(zona, 'error', UI.mensaje(e)); }
    finally { UI.ocupado(btn, false); }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); generar(); });
  App.registrar('balanza', {
    iniciar() { const p = App.periodo(); desde.value = p.desde; hasta.value = p.hasta; },
    mostrar() { if (!listo) generar(); }
  });
})();
