/**
 * contabilidad.js — Capa de dominio del Programa de Contabilidad Empresarial.
 *
 * Reglas contables puras: sin DOM, sin red y sin estado global, para poder
 * probarlas aisladas de la interfaz (RNF-07). Todos los importes son enteros
 * en centavos (RNF-03): nunca se usa punto flotante para sumar dinero.
 *
 * La interfaz (home.js) solo MUESTRA lo que calcula este archivo. El servidor
 * (PHP) debe repetir estas reglas antes de guardar cualquier dato.
 *
 * Folio de cuenta: 12 dígitos en cinco niveles 1-2-3-3-3.
 *   110101001000  =  1 | 10 | 101 | 001 | 000
 * Cada nivel "acumula" el anterior en su prefijo (10 empieza con 1, 101 con 10),
 * por eso la búsqueda por prefijo usa el CÓDIGO POR NIVELES: 1 → 10 → 101 → 101001.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Contabilidad = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ======================= Constantes ======================= */

  const ANCHOS = [1, 2, 3, 3, 3];
  const NIVELES = ['Clase', 'Subclase', 'Cuenta', 'Subcuenta', 'Sub-subcuenta'];

  const CLASIFICACIONES = {
    ac:  { nombre: 'Activo circulante',    estado: 'balance' },
    anc: { nombre: 'Activo no circulante', estado: 'balance' },
    ad:  { nombre: 'Activo diferido',      estado: 'balance' },
    pc:  { nombre: 'Pasivo a corto plazo', estado: 'balance' },
    plp: { nombre: 'Pasivo a largo plazo', estado: 'balance' },
    cc:  { nombre: 'Capital contribuido',  estado: 'balance' },
    cg:  { nombre: 'Capital ganado',       estado: 'balance' },
    in:  { nombre: 'Ingresos',             estado: 'resultados' },
    co:  { nombre: 'Costo de ventas',      estado: 'resultados' },
    go:  { nombre: 'Gastos de operación',  estado: 'resultados' },
    rif: { nombre: 'Resultado integral de financiamiento', estado: 'resultados' }
  };

  const ACTIVIDADES = {
    operacion: 'Operación',
    inversion: 'Inversión',
    financiamiento: 'Financiamiento',
    efectivo: 'Efectivo'
  };

  const ROLES = {
    propietario: 'Propietario',
    contador: 'Contador',
    revisor: 'Revisor',
    consulta: 'Consulta'
  };

  // Matriz de permisos (documento del proyecto, Tabla 9). Solo ayuda de interfaz:
  // el servidor debe validar el rol en cada petición (RNF-02).
  const PERMISOS = {
    gestionar: ['propietario'],
    catalogo:  ['propietario', 'contador'],
    capturar:  ['propietario', 'contador'],
    registrar: ['propietario', 'contador'],
    aprobar:   ['propietario', 'revisor'],
    consultar: ['propietario', 'contador', 'revisor', 'consulta'],
    exportar:  ['propietario', 'contador', 'revisor', 'consulta'],
    bitacora:  ['propietario', 'revisor']
  };

  const puede = (rol, accion) => (PERMISOS[accion] || []).includes(rol);

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ======================= Texto, dinero y fechas ======================= */

  function normalizar(texto) {
    return String(texto == null ? '' : texto)
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /** Centavos → "1,234.56". Con parentesis:true los negativos van entre paréntesis. */
  function dinero(centavos, opciones) {
    const o = opciones || {};
    const c = Math.round(centavos);
    if (c === 0 && o.cero !== undefined) return o.cero;
    const abs = Math.abs(c);
    const enteros = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const txt = enteros + '.' + String(abs % 100).padStart(2, '0');
    if (c < 0) return o.parentesis ? '(' + txt + ')' : '-' + txt;
    return txt;
  }

  /** "1,234.5" → 123450. Devuelve NaN si el texto no es un importe válido. */
  function aCentavos(texto) {
    const t = String(texto == null ? '' : texto).replace(/[,\s]/g, '');
    const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(t);
    if (!m) return NaN;
    return Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'));
  }

  const partesFecha = (iso) => {
    const [a, m, d] = String(iso).split('-').map(Number);
    return { a, m, d };
  };

  function fechaLarga(iso) {
    const f = partesFecha(iso);
    return f.d + ' de ' + MESES[f.m - 1] + ' de ' + f.a;
  }

  function fechaCorta(iso) {
    const f = partesFecha(iso);
    return f.d + ' ' + MESES[f.m - 1].slice(0, 3) + ' ' + f.a;
  }

  /** Leyenda de periodo para el encabezado: "Al …" (situación) o "Del … al …" (flujo). */
  function textoPeriodo(periodo, tipo) {
    if (tipo === 'al') return 'Al ' + fechaLarga(periodo.fin);
    const i = partesFecha(periodo.inicio);
    const f = partesFecha(periodo.fin);
    if (i.a === f.a && i.m === f.m) return 'Del ' + i.d + ' al ' + f.d + ' de ' + MESES[f.m - 1] + ' de ' + f.a;
    if (i.a === f.a) return 'Del ' + i.d + ' de ' + MESES[i.m - 1] + ' al ' + f.d + ' de ' + MESES[f.m - 1] + ' de ' + f.a;
    return 'Del ' + fechaLarga(periodo.inicio) + ' al ' + fechaLarga(periodo.fin);
  }

  /* ======================= Folios ======================= */

  function segmentos(folio) {
    let i = 0;
    return ANCHOS.map((w) => { const s = folio.slice(i, i + w); i += w; return s; });
  }

  /** Nivel más profundo con dígitos distintos de cero (1 a 5). */
  function nivel(folio) {
    const s = segmentos(folio);
    for (let n = 5; n >= 2; n--) if (/[1-9]/.test(s[n - 1])) return n;
    return 1;
  }

  function padreDe(folio) {
    const n = nivel(folio);
    if (n === 1) return null;
    const s = segmentos(folio);
    s[n - 1] = '0'.repeat(ANCHOS[n - 1]);
    return s.join('');
  }

  /** Código por niveles: lo que se escribe para filtrar (1, 10, 101, 101001, 101001000). */
  function codigo(folio) {
    const s = segmentos(folio);
    const n = nivel(folio);
    if (n === 1) return s[0];
    if (n === 2) return s[1];
    return s[2] + (n >= 4 ? s[3] : '') + (n >= 5 ? s[4] : '');
  }

  /** Código por niveles → folio de 12 dígitos; null si la longitud no corresponde a un nivel. */
  function folioDesdeCodigo(cod) {
    const n = { 1: 1, 2: 2, 3: 3, 6: 4, 9: 5 }[cod.length];
    if (!n || !/^\d+$/.test(cod)) return null;
    return [
      cod[0],
      n >= 2 ? cod.slice(0, 2) : '00',
      n >= 3 ? cod.slice(0, 3) : '000',
      n >= 4 ? cod.slice(3, 6) : '000',
      n >= 5 ? cod.slice(6, 9) : '000'
    ].join('');
  }

  /** Acepta folio de 12 dígitos o código por niveles. */
  function normalizarFolio(texto) {
    const t = String(texto || '').trim().replace(/[\s.-]/g, '');
    if (!/^\d+$/.test(t)) return null;
    return t.length === 12 ? t : folioDesdeCodigo(t);
  }

  /** null si el folio es coherente; si no, el motivo. */
  function validarFolio(folio) {
    if (!/^\d{12}$/.test(folio)) return 'El folio debe tener 12 dígitos.';
    const s = segmentos(folio);
    const n = nivel(folio);
    if (s[0] === '0') return 'La clase no puede ser 0.';
    if (n >= 2 && !s[1].startsWith(s[0])) return 'El nivel 2 debe empezar con el dígito de la clase.';
    if (n >= 3 && !s[2].startsWith(s[1])) return 'El nivel 3 debe empezar con los dígitos de la subclase.';
    for (let i = 1; i < n - 1; i++) {
      if (!/[1-9]/.test(s[i])) return 'No puede haber un nivel vacío entre dos niveles con dígitos.';
    }
    return null;
  }

  /* ======================= Catálogo de cuentas ======================= */

  function crearCatalogo(lista) {
    const cuentas = lista
      .map((c) => Object.assign({}, c, {
        nivel: nivel(c.folio),
        codigo: codigo(c.folio),
        padre: padreDe(c.folio)
      }))
      .sort((a, b) => (a.folio < b.folio ? -1 : a.folio > b.folio ? 1 : 0));

    const porFolio = new Map(cuentas.map((c) => [c.folio, c]));
    const hijos = new Map();
    cuentas.forEach((c) => {
      if (!c.padre) return;
      if (!hijos.has(c.padre)) hijos.set(c.padre, []);
      hijos.get(c.padre).push(c);
    });
    cuentas.forEach((c) => { c.esHoja = !hijos.has(c.folio); });

    const hijosDe = (f) => hijos.get(f) || [];

    function hojasDe(f) {
      const c = porFolio.get(f);
      if (!c) return [];
      if (c.esHoja) return [c];
      return hijosDe(f).flatMap((h) => hojasDe(h.folio));
    }

    /** Cuenta del nivel 3 (o la propia, si es de nivel menor) a la que pertenece una cuenta. */
    function lineaDe(c) {
      let x = c;
      while (x && x.nivel > 3) x = porFolio.get(x.padre);
      return x || c;
    }

    function buscar(texto) {
      const t = String(texto || '').trim();
      if (!t) return cuentas.slice();
      const digitos = t.replace(/[\s.-]/g, '');
      if (/^\d+$/.test(digitos)) {
        // 10 o más dígitos: prefijo del folio completo; menos: código por niveles
        return cuentas.filter((c) => (digitos.length >= 10
          ? c.folio.startsWith(digitos)
          : c.codigo.startsWith(digitos)));
      }
      const fichas = normalizar(t).split(/\s+/);
      return cuentas.filter((c) => {
        const pajar = normalizar(c.folio + ' ' + c.codigo + ' ' + c.nombre + ' ' + (c.alias || ''));
        return fichas.every((k) => pajar.includes(k));
      });
    }

    /** Cuenta exacta a partir de un folio o de un código por niveles; null si no hay. */
    function resolver(texto) {
      const f = normalizarFolio(texto);
      return f ? (porFolio.get(f) || null) : null;
    }

    /** Siguiente folio consecutivo libre dentro de una cuenta padre; null si no hay lugar. */
    function siguienteFolio(padreFolio) {
      const p = porFolio.get(padreFolio);
      if (!p || p.nivel >= 5) return null;
      const s = segmentos(p.folio);
      const i = p.nivel; // índice del segmento que ocupan sus hijas
      const usados = hijosDe(p.folio).map((h) => segmentos(h.folio)[i]);
      let candidato;
      if (i <= 2) {
        // Subclase (2 dígitos) o cuenta (3): acumulan el prefijo del padre y suman un dígito
        const digitos = usados.map((u) => Number(u[u.length - 1]));
        const primero = i === 1 ? 0 : 1; // 10, 11… para subclases; 101, 102… para cuentas
        const d = digitos.length ? Math.max.apply(null, digitos) + 1 : primero;
        if (d > 9) return null;
        candidato = s[i - 1] + d;
      } else {
        const n = usados.length ? Math.max.apply(null, usados.map(Number)) + 1 : 1;
        if (n > 999) return null;
        candidato = String(n).padStart(3, '0');
      }
      s[i] = candidato;
      return s.join('');
    }

    return { cuentas, porFolio: (f) => porFolio.get(f) || null, hijosDe, hojasDe, lineaDe, buscar, resolver, siguienteFolio };
  }

  /* ======================= Saldos ======================= */

  const suma = (arr, f) => arr.reduce((t, x) => t + f(x), 0);
  const sumaMovs = (poliza, lado) => suma(poliza.movs, (m) => m[lado]);

  /**
   * Calcula saldos iniciales, movimientos y saldos finales de cada cuenta.
   * - Las pólizas en borrador no afectan nada.
   * - El saldo inicial sale de saldosIniciales (periodo anterior) o, si no hay,
   *   de la póliza de apertura del periodo (tipo "apertura").
   * - Saldo final = (inicial Debe + movimientos Debe) − (inicial Haber + movimientos Haber).
   */
  function calcular(cat, polizas, saldosIniciales) {
    const contables = polizas.filter((p) => p.estado !== 'borrador');
    const conAnterior = Array.isArray(saldosIniciales) && saldosIniciales.length > 0;
    const propio = new Map();
    const tomar = (f) => {
      if (!propio.has(f)) propio.set(f, { siD: 0, siH: 0, movD: 0, movH: 0 });
      return propio.get(f);
    };

    if (conAnterior) saldosIniciales.forEach((s) => { const o = tomar(s.folio); o.siD += s.debe; o.siH += s.haber; });
    contables.forEach((p) => p.movs.forEach((m) => {
      const o = tomar(m.folio);
      if (p.tipo === 'apertura' && !conAnterior) { o.siD += m.debe; o.siH += m.haber; }
      else { o.movD += m.debe; o.movH += m.haber; }
    }));

    const memo = new Map();
    function agregado(f) {
      if (memo.has(f)) return memo.get(f);
      const r = Object.assign({ siD: 0, siH: 0, movD: 0, movH: 0 }, propio.get(f));
      cat.hijosDe(f).forEach((h) => {
        const a = agregado(h.folio);
        r.siD += a.siD; r.siH += a.siH; r.movD += a.movD; r.movH += a.movH;
      });
      memo.set(f, r);
      return r;
    }

    function saldo(f) {
      const a = agregado(f);
      return Object.assign({}, a, {
        si: a.siD - a.siH,
        sf: (a.siD + a.movD) - (a.siH + a.movH),
        activo: !!(a.siD || a.siH || a.movD || a.movH)
      });
    }

    return { polizas: contables, saldo };
  }

  /* ======================= Balanza de comprobación ======================= */

  function balanza(cat, calc) {
    const filas = [];
    cat.cuentas.forEach((c) => {
      if (!(c.nivel >= 3 || c.esHoja)) return; // clases y subclases no se listan
      const s = calc.saldo(c.folio);
      if (!s.activo) return;
      filas.push({
        cuenta: c,
        agrupadora: !c.esHoja,
        siDebe: s.si > 0 ? s.si : 0,   siHaber: s.si < 0 ? -s.si : 0,
        movDebe: s.movD,               movHaber: s.movH,
        sfDebe: s.sf > 0 ? s.sf : 0,   sfHaber: s.sf < 0 ? -s.sf : 0
      });
    });
    const totales = { siDebe: 0, siHaber: 0, movDebe: 0, movHaber: 0, sfDebe: 0, sfHaber: 0 };
    filas.filter((f) => !f.agrupadora).forEach((f) => Object.keys(totales).forEach((k) => { totales[k] += f[k]; }));
    return {
      filas,
      totales,
      cuadra: {
        si: totales.siDebe === totales.siHaber,
        mov: totales.movDebe === totales.movHaber,
        sf: totales.sfDebe === totales.sfHaber
      }
    };
  }

  /* ======================= Cuentas T ======================= */

  function cuentaT(cat, calc, folio) {
    const cuenta = cat.porFolio(folio);
    if (!cuenta) return null;
    const hojas = new Set(cat.hojasDe(folio).map((c) => c.folio));
    const entradas = [];
    calc.polizas.forEach((p) => p.movs.forEach((m) => {
      if (!hojas.has(m.folio)) return;
      entradas.push({ poliza: p.id, num: p.num, fecha: p.fecha, folio: m.folio, sub: cat.porFolio(m.folio), debe: m.debe, haber: m.haber });
    }));
    entradas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.poliza - b.poliza));
    const debe = entradas.filter((e) => e.debe > 0);
    const haber = entradas.filter((e) => e.haber > 0);
    const totalDebe = suma(debe, (e) => e.debe);
    const totalHaber = suma(haber, (e) => e.haber);
    const saldo = totalDebe - totalHaber;
    return {
      cuenta,
      consolidada: !cuenta.esHoja,
      debe, haber, totalDebe, totalHaber, saldo,
      lado: saldo > 0 ? 'deudor' : saldo < 0 ? 'acreedor' : 'saldada',
      hijas: cat.hijosDe(folio).filter((h) => calc.saldo(h.folio).activo)
    };
  }

  /* ======================= Estados financieros ======================= */

  function estados(cat, calc) {
    // Cada renglón de un estado es una cuenta de nivel 3 (sus subcuentas se acumulan en ella).
    const nivel3 = cat.cuentas.filter((c) => c.nivel === 3 || (c.nivel < 3 && c.esHoja));
    const de = (claves) => nivel3.filter((c) => claves.includes(c.clasif));
    const sf = (c) => calc.saldo(c.folio).sf;
    const si = (c) => calc.saldo(c.folio).si;

    // signo +1: saldo deudor positivo (activo, costos, gastos); −1: acreedor positivo
    const lineas = (claves, signo) => de(claves)
      .map((c) => ({ folio: c.folio, nombre: c.nombre, nat: c.nat, actual: signo * sf(c), anterior: signo * si(c) }))
      .filter((l) => l.actual !== 0 || l.anterior !== 0);
    const seccion = (claves, signo) => {
      const l = lineas(claves, signo);
      return { lineas: l, actual: suma(l, (x) => x.actual), anterior: suma(l, (x) => x.anterior) };
    };

    const RES = ['in', 'co', 'go', 'rif'];
    const resSF = -suma(de(RES), sf);
    const resSI = -suma(de(RES), si);

    /* --- Balance general (NIF B-6) --- */
    const secActivo = [['ac', 'Activo circulante'], ['anc', 'Activo no circulante'], ['ad', 'Activo diferido']]
      .map(([k, t]) => Object.assign({ clave: k, titulo: t }, seccion([k], 1)));
    const secPasivo = [['pc', 'Pasivo a corto plazo'], ['plp', 'Pasivo a largo plazo']]
      .map(([k, t]) => Object.assign({ clave: k, titulo: t }, seccion([k], -1)));
    const cc = seccion(['cc'], -1);
    const cg = seccion(['cg'], -1);
    const activo = { secciones: secActivo, actual: suma(secActivo, (x) => x.actual), anterior: suma(secActivo, (x) => x.anterior) };
    const pasivo = { secciones: secPasivo, actual: suma(secPasivo, (x) => x.actual), anterior: suma(secPasivo, (x) => x.anterior) };
    const capital = {
      cc, cg,
      resultado: { actual: resSF, anterior: resSI },
      actual: cc.actual + cg.actual + resSF,
      anterior: cc.anterior + cg.anterior + resSI
    };
    const pasivoCapital = { actual: pasivo.actual + capital.actual, anterior: pasivo.anterior + capital.anterior };
    const balance = {
      activo, pasivo, capital, pasivoCapital,
      cuadra: activo.actual === pasivoCapital.actual && activo.anterior === pasivoCapital.anterior
    };

    /* --- Estado de resultado integral (NIF B-3) --- */
    const ventas = seccion(['in'], -1);
    const costo = seccion(['co'], 1);
    const gastos = seccion(['go'], 1);
    const rif = seccion(['rif'], 1);
    const utilidadBruta = ventas.actual - costo.actual;
    const utilidadOperacion = utilidadBruta - gastos.actual;
    const resultados = { ventas, costo, gastos, rif, utilidadBruta, utilidadOperacion, resultado: utilidadOperacion - rif.actual };

    /* --- Estado de cambios en el capital contable (NIF B-4) --- */
    const movCredito = (claves) => suma(de(claves), (c) => { const s = calc.saldo(c.folio); return s.movH - s.movD; });
    const inicialCC = -suma(de(['cc']), si);
    const inicialCG = -suma(de(['cg']), si) + resSI;
    const propietarios = movCredito(['cc']);
    const reservas = movCredito(['cg']);
    const resultadoPeriodo = resSF - resSI;
    const capitalEstado = {
      inicial:      { cc: inicialCC, cg: inicialCG, total: inicialCC + inicialCG },
      propietarios: { cc: propietarios, cg: 0, total: propietarios },
      reservas:     { cc: 0, cg: reservas, total: reservas },
      resultado:    { cc: 0, cg: resultadoPeriodo, total: resultadoPeriodo },
      final: {
        cc: inicialCC + propietarios,
        cg: inicialCG + reservas + resultadoPeriodo,
        total: inicialCC + propietarios + inicialCG + reservas + resultadoPeriodo
      }
    };

    /* --- Hoja de trabajo de origen y aplicación (compara dos balances) --- */
    const filas = de(['ac', 'anc', 'ad', 'pc', 'plp', 'cc', 'cg'])
      .map((c) => ({ folio: c.folio, nombre: c.nombre, nat: c.nat, act: c.act || '', si: si(c), sf: sf(c) }))
      .filter((r) => r.si !== 0 || r.sf !== 0);
    filas.push({ folio: null, nombre: resSF >= 0 ? 'Utilidad del periodo' : 'Pérdida del periodo', nat: 'A', act: 'operacion', si: -resSI, sf: -resSF });
    filas.forEach((r) => {
      r.v = r.sf - r.si; // variación en saldo deudor: sube = aplicación, baja = origen
      r.tipo = r.act === 'efectivo' ? 'efectivo' : r.v < 0 ? 'origen' : r.v > 0 ? 'aplicacion' : 'sin_variacion';
      r.monto = r.tipo === 'origen' || r.tipo === 'aplicacion' ? Math.abs(r.v) : 0;
      r.faltaAct = !r.act && r.v !== 0;
    });
    const grupos = ['operacion', 'inversion', 'financiamiento'].map((a) => {
      const enGrupo = filas.filter((r) => (ACTIVIDADES[r.act] && r.act !== 'efectivo' ? r.act : 'operacion') === a);
      const origenes = enGrupo.filter((r) => r.tipo === 'origen');
      const aplicaciones = enGrupo.filter((r) => r.tipo === 'aplicacion');
      const totalOrigen = suma(origenes, (r) => r.monto);
      const totalAplicacion = suma(aplicaciones, (r) => r.monto);
      return { act: a, origenes, aplicaciones, totalOrigen, totalAplicacion, neto: totalOrigen - totalAplicacion };
    });
    const efectivo = filas.filter((r) => r.tipo === 'efectivo');
    const origen = suma(grupos, (g) => g.totalOrigen);
    const aplicacion = suma(grupos, (g) => g.totalAplicacion);
    const efectivoInicial = suma(efectivo, (r) => r.si);
    const efectivoFinal = suma(efectivo, (r) => r.sf);
    const hoja = {
      filas, grupos, efectivo, origen, aplicacion,
      efectivoInicial, efectivoFinal,
      variacion: efectivoFinal - efectivoInicial,
      efectivoFinalEstado: efectivoInicial + origen - aplicacion,
      cuadra: origen - aplicacion === efectivoFinal - efectivoInicial
    };

    const sinClasificar = cat.cuentas.filter((c) => c.esHoja && calc.saldo(c.folio).activo
      && !CLASIFICACIONES[cat.lineaDe(c).clasif]);
    const sinActividad = filas.filter((r) => r.faltaAct);

    return { balance, resultados, capital: capitalEstado, hoja, sinClasificar, sinActividad };
  }

  /* ======================= Controles de integridad ======================= */

  function controles(cat, calc, ed, bz, polizas) {
    const contables = polizas.filter((p) => p.estado !== 'borrador');
    const cuadran = contables.filter((p) => sumaMovs(p, 'debe') === sumaMovs(p, 'haber')).length;
    const d = (c) => dinero(c);
    const res = ed.resultados.resultado;
    const nombres = (lista) => lista.map((x) => x.nombre).join(', ');
    return [
      { id: 'polizas', titulo: 'Cada póliza registrada cuadra', ok: cuadran === contables.length,
        detalle: cuadran + ' de ' + contables.length + ' pólizas con Debe = Haber' },
      { id: 'balanza', titulo: 'Sumas iguales en la balanza', ok: bz.cuadra.si && bz.cuadra.mov && bz.cuadra.sf,
        detalle: 'Saldos finales: Debe ' + d(bz.totales.sfDebe) + ' · Haber ' + d(bz.totales.sfHaber) },
      { id: 'balance', titulo: 'Activo = Pasivo + Capital contable', ok: ed.balance.cuadra,
        detalle: 'Activo ' + d(ed.balance.activo.actual) + ' · Pasivo + capital ' + d(ed.balance.pasivoCapital.actual) },
      { id: 'utilidad', titulo: 'La utilidad coincide en los tres estados',
        ok: res === ed.balance.capital.resultado.actual && res === ed.capital.resultado.total,
        detalle: 'Resultados ' + d(res) + ' · Balance ' + d(ed.balance.capital.resultado.actual) + ' · Capital ' + d(ed.capital.resultado.total) },
      { id: 'capital', titulo: 'Saldo final del capital contable', ok: ed.capital.final.total === ed.balance.capital.actual,
        detalle: 'Estado de capital ' + d(ed.capital.final.total) + ' · Balance ' + d(ed.balance.capital.actual) },
      { id: 'efectivo', titulo: 'Efectivo final = Bancos + Caja',
        ok: ed.hoja.cuadra && ed.hoja.efectivoFinalEstado === ed.hoja.efectivoFinal,
        detalle: 'Origen y aplicación ' + d(ed.hoja.efectivoFinalEstado) + ' · Cuentas de efectivo ' + d(ed.hoja.efectivoFinal) },
      { id: 'clasificacion', titulo: 'Toda cuenta con saldo está clasificada',
        ok: ed.sinClasificar.length === 0 && ed.sinActividad.length === 0,
        detalle: ed.sinClasificar.length
          ? 'Sin clasificación: ' + nombres(ed.sinClasificar)
          : ed.sinActividad.length ? 'Sin tipo de actividad: ' + nombres(ed.sinActividad) : 'Todas las cuentas con saldo entran en algún estado' }
    ];
  }

  /* ======================= Captura de pólizas ======================= */

  /**
   * Valida una póliza capturada: { fecha, concepto, debe:[{folio, centavos}], haber:[…] }.
   * Devuelve los errores y los totales para mostrar la diferencia Debe − Haber.
   */
  function validarPoliza(p, cat, periodo) {
    const errores = [];
    if (String(p.concepto || '').trim().length < 5) errores.push({ campo: 'concepto', msg: 'Escribe un concepto de al menos 5 caracteres.' });
    if (!p.fecha || p.fecha < periodo.inicio || p.fecha > periodo.fin) errores.push({ campo: 'fecha', msg: 'La fecha debe estar dentro del periodo.' });
    if (!periodo.abierto) errores.push({ campo: 'periodo', msg: 'El periodo está cerrado: no admite pólizas.' });

    const lleno = (l) => !!(l.folio || l.centavos);
    const rotulo = { debe: 'Debe', haber: 'Haber' };
    ['debe', 'haber'].forEach((lado) => {
      const lineas = p[lado] || [];
      lineas.forEach((l, i) => {
        if (!lleno(l)) return;
        const donde = 'Renglón ' + (i + 1) + ' del ' + rotulo[lado];
        const c = l.folio ? cat.resolver(l.folio) : null;
        if (!c) errores.push({ campo: lado, msg: donde + ': la cuenta no existe.' });
        else if (!c.esHoja) errores.push({ campo: lado, msg: donde + ': "' + c.nombre + '" es agrupadora; elige una subcuenta.' });
        if (!(l.centavos > 0)) errores.push({ campo: lado, msg: donde + ': captura un importe mayor a 0.' });
      });
      if (!lineas.some(lleno)) errores.push({ campo: lado, msg: 'Agrega al menos un movimiento al ' + rotulo[lado] + '.' });
    });

    const debe = suma(p.debe || [], (l) => (l.centavos > 0 ? l.centavos : 0));
    const haber = suma(p.haber || [], (l) => (l.centavos > 0 ? l.centavos : 0));
    if (debe !== haber) errores.push({ campo: 'cuadre', msg: 'El Debe y el Haber no cuadran.' });
    return { errores, debe, haber, diferencia: debe - haber };
  }

  /** ¿La cuenta sube o baja con este movimiento? La naturaleza manda, no la columna (RN-12). */
  function efectoMovimiento(naturaleza, lado) {
    return (naturaleza === 'D') === (lado === 'debe') ? 'aumenta' : 'disminuye';
  }

  return {
    ANCHOS, NIVELES, CLASIFICACIONES, ACTIVIDADES, ROLES, PERMISOS,
    puede, normalizar, dinero, aCentavos, fechaLarga, fechaCorta, textoPeriodo,
    segmentos, nivel, padreDe, codigo, folioDesdeCodigo, normalizarFolio, validarFolio,
    crearCatalogo, calcular, balanza, cuentaT, estados, controles,
    validarPoliza, efectoMovimiento, sumaMovs
  };
});