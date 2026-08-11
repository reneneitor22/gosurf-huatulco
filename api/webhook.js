import { update, json, leerBody, choques } from '../lib/db.js';
import { buscarPago, aplicarPago } from '../lib/mp.js';

/**
 * Notificación de Mercado Pago.
 *
 * El cuerpo que manda MP no se toma como verdad: solo se saca de ahí el id
 * del pago y se consulta el estado real contra su API con nuestro token.
 * Así una petición falsa a esta ruta no puede marcar nada como pagado.
 *
 * Siempre responde 200: si devolvemos error, MP reintenta en bucle. Los
 * problemas se registran, no se propagan.
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 200, { ok: true });

    const url = new URL(req.url, 'http://x');
    const b = await leerBody(req);

    const tipo = b.type || b.topic || url.searchParams.get('type') || url.searchParams.get('topic') || '';
    const id = b.data?.id || b.resource?.split?.('/').pop() || url.searchParams.get('data.id') || url.searchParams.get('id') || '';

    if (!/payment/i.test(String(tipo)) || !id) return json(res, 200, { ok: true, ignorado: true });

    const pago = await buscarPago(id);
    const folio = String(pago.external_reference || '').toUpperCase();
    if (!folio) return json(res, 200, { ok: true, sinFolio: true });

    const r = await update((data) => aplicarPago(data, folio, pago, choques));
    return json(res, 200, { ok: true, ...r });
  } catch (e) {
    console.error('webhook mercadopago:', e?.mensaje || e?.message || e);
    return json(res, 200, { ok: false });
  }
}
