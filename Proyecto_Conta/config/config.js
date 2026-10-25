/**
 * config.js — único lugar con rutas, endpoints y claves del front.
 *
 * Contrato Ajax (JSON). Cada nombre se pide a: api.base + nombre + api.sufijo
 * Errores: responde 4xx/5xx (o 200 con ok:false) con { error: "codigo", ...datos }.
 * Una respuesta 401 en cualquier llamada del home devuelve al login.
 *
 *  GET  sesion                  → { usuario, periodo: { desde, hasta } }
 *  POST login        {username,password}      → { destino? }  | error: credenciales (+restantes) | captcha:true
 *  POST salida                  → { }
 *  POST registro     FormData (multipart)     → { }           | error: usuario_existe|correo_existe|datos|archivo
 *  POST captcha      {token}                  → { }           | error: captcha
 *  GET  catalogo                → { cuentas: [{ folio, nombre, alias, naturaleza:"D"|"A", nivel:1-5, hoja:bool }] }
 *  GET  catalogo/siguiente ?madre=FOLIO       → { folio | null }
 *  POST catalogo     {madre,nombre,naturaleza}→ { cuenta:{folio} } | error: duplicado|madre_con_movimientos|folio_agotado|datos
 *  POST polizas      {fecha,concepto,movimientos:[{folio,debe,haber}]} → { numero } | error: no_cuadra|datos
 *  GET  cuentas-t    ?folio=FOLIO             → { cuenta:{folio,nombre}, movimientos:[{poliza,debe,haber}],
 *                                                 sumas:{debe,haber}, saldo:{lado:"deudor"|"acreedor"|"",importe},
 *                                                 subcuentas:[{folio,nombre,lado,importe}] }
 *  GET  balanza      ?desde&hasta             → { filas:[{folio,nombre,nivel,hoja,inicial:{debe,haber},
 *                                                 movimientos:{debe,haber},final:{debe,haber}}], totales:{ las mismas tres claves }, leyenda? }
 *  GET  estados      ?tipo&desde&hasta&comparar → { titulo, empresa, periodo, columnas:[...],
 *                                                 filas:[{ concepto, nivel:0-3, estilo:"titulo"|"normal"|"subtotal"|"total", valores:[...] }] }
 *       tipo: balance | resultados | flujo_efectivo | cambios_situacion | cambios_capital
 */
window.CONFIG = {
  api: { base: '../api/', sufijo: '', timeoutMs: 15000 },
  rutas: {
    login: '../login/login.html',
    registro: '../registro/registro.html',
    captcha: '../captcha/captcha.html',
    home: '../home/home.html'
  },
  // Clave de PRUEBA de Google (siempre pasa). En producción usa la tuya: https://www.google.com/recaptcha/admin
  recaptchaSiteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
  archivos: { maxMB: 5, tipos: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] }
};
