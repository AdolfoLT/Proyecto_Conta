/* estados.js — estados financieros. Un solo renderizador para los cinco: el servidor manda la estructura. */
(() => {
  const { $, esc } = UI;
  const form = $('#est-form'), tipo = $('#est-tipo'), desde = $('#est-desde'), hasta = $('#est-hasta'), comparar = $('#est-comparar');
  const vista = $('#est-vista'), zona = $('#est-estado'), btn = $('button[type="submit"]', form);

  // Encabezado según NIF: nombre del estado, nombre de la empresa y periodo
  function pintar(r) {
    const cols = r.columnas || [];
    vista.innerHTML = `
      <div class="doc__cab"><strong>${esc(r.titulo)}</strong><span>${esc(r.empresa)}</span><span>${esc(r.periodo)}</span></div>
      <div class="tabla-wrap"><table class="tabla">
        <thead><tr><th><span class="sr-only">Concepto</span></th>${cols.map((c) => `<th class="num">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${(r.filas || []).map((f) => `<tr class="${esc(f.estilo || 'normal')}"><td style="padding-left:${12 + (f.nivel || 0) * 18}px">${esc(f.concepto)}</td>${cols.map((_, i) => `<td class="num">${f.valores && f.valores[i] != null ? UI.cifra(f.valores[i]) : ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="doc__nota">Los negativos se muestran entre paréntesis.</p>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (desde.value > hasta.value) { UI.alerta('error', 'La fecha inicial no puede ser posterior a la final.', true); return; }
    vista.innerHTML = '';
    UI.estado(zona, 'cargando');
    UI.ocupado(btn, true, 'Generando…');
    try {
      const r = await Api.get('estados', { tipo: tipo.value, desde: desde.value, hasta: hasta.value, comparar: comparar.checked ? 1 : '' });
      UI.estado(zona, null);
      pintar(r);
    } catch (err) { UI.estado(zona, 'error', UI.mensaje(err)); }
    finally { UI.ocupado(btn, false); }
  });

  App.registrar('estados', { iniciar() { const p = App.periodo(); desde.value = p.desde; hasta.value = p.hasta; } });
})();
