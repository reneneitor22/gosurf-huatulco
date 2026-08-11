/**
 * Mercado Pago — Checkout Pro por API directa (sin SDK).
 *
 * El token vive solo en el servidor. Si `MP_ACCESS_TOKEN` no está puesto,
 * `pagoActivo` sale false y la página esconde el botón de pagar: el sitio
 * sigue funcionando con WhatsApp mientras Robert nos pasa sus credenciales.
 */

const API = 'https://api.mercadopago.com';

export function mpConfigurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

async function mpFetch(ruta, opciones = {}) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw { code: 503, mensaje: 'El pago en línea todavía no está configurado.' };

  const r = await fetch(API + ruta, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opciones.headers || {}),
    },
  });
  const texto = await r.text();
  let cuerpo;
  try { cuerpo = texto ? JSON.parse(texto) : {}; } catch { cuerpo = { raw: texto }; }
  if (!r.ok) {
    const detalle = cuerpo?.message || cuerpo?.error || r.statusText;
    throw { code: 502, mensaje: `Mercado Pago rechazó la operación: ${detalle}` };
  }
  return cuerpo;
}

/** URL pública de este despliegue, para back_urls y notification_url. */
export function baseURL(req) {
  if (process.env.SITE_URL) return String(process.env.SITE_URL).replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function crearPreference({ reserva, base, minutos, titulo }) {
  const vence = new Date(Date.now() + minutos * 60000).toISOString();
  const pref = await mpFetch('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [{
        id: reserva.folio,
        title: titulo,
        description: `Anticipo ${reserva.pct}% · ${reserva.fechas[0]}${reserva.dias > 1 ? ` a ${reserva.fechas[reserva.fechas.length - 1]}` : ''}`,
        quantity: 1,
        unit_price: reserva.anticipo,
        currency_id: 'MXN',
      }],
      payer: { name: reserva.cliente },
      external_reference: reserva.folio,
      statement_descriptor: 'GOSURF',
      back_urls: {
        success: `${base}/?pago=ok&folio=${reserva.folio}`,
        pending: `${base}/?pago=pendiente&folio=${reserva.folio}`,
        failure: `${base}/?pago=error&folio=${reserva.folio}`,
      },
      auto_return: 'approved',
      notification_url: `${base}/api/webhook`,
      // Si no paga dentro del hold, la preference muere sola.
      expires: true,
      expiration_date_to: vence,
    }),
  });
  return { id: pref.id, url: pref.init_point, urlSandbox: pref.sandbox_init_point };
}

export function buscarPago(id) {
  return mpFetch(`/v1/payments/${encodeURIComponent(id)}`);
}

/** Todos los pagos de un folio — sirve cuando el webhook no llegó (p. ej. en local). */
export async function pagosDeFolio(folio) {
  const r = await mpFetch(`/v1/payments/search?external_reference=${encodeURIComponent(folio)}&sort=date_created&criteria=desc`);
  return Array.isArray(r.results) ? r.results : [];
}

/**
 * Marca la reserva como pagada. Idempotente: si ya está pagada con ese mismo
 * pago no vuelve a tocar nada, porque Mercado Pago reintenta la notificación.
 *
 * Si mientras tanto alguien más pagó esas fechas, se cobra igual pero se marca
 * `conflicto` — perder el registro de un pago recibido sería peor que avisarle
 * a Robert que hay dos grupos encimados.
 */
export function aplicarPago(data, folio, pago, choquesFn) {
  const r = data.reservas.find((x) => x.folio === folio);
  if (!r) return { ok: false, motivo: 'sin-reserva' };

  const aprobado = pago.status === 'approved';
  if (!aprobado) {
    r.pago = { id: String(pago.id), status: pago.status, monto: Number(pago.transaction_amount) || 0, metodo: pago.payment_method_id || '', fecha: Date.now() };
    r.actualizada = Date.now();
    (r.historial = r.historial || []).push({ t: Date.now(), q: 'mp', a: pago.status });
    return { ok: true, estado: r.estado, aprobado: false };
  }

  if (r.estado === 'pagada' && r.pago?.id === String(pago.id)) {
    return { ok: true, estado: 'pagada', aprobado: true, repetido: true };
  }

  const encimados = choquesFn ? choquesFn(data, r.fechas, r.folio).filter((c) => c.motivo === 'pagada') : [];
  r.estado = 'pagada';
  r.holdHasta = 0;
  r.conflicto = encimados.length ? encimados.map((c) => c.fecha) : null;
  r.pago = {
    id: String(pago.id),
    status: pago.status,
    monto: Number(pago.transaction_amount) || 0,
    metodo: pago.payment_method_id || '',
    fecha: Date.now(),
  };
  r.actualizada = Date.now();
  (r.historial = r.historial || []).push({ t: Date.now(), q: 'mp', a: 'pagada' });
  return { ok: true, estado: 'pagada', aprobado: true, conflicto: r.conflicto };
}
