/**
 * Fotos del sitio.
 *
 *   GET  /api/foto?slot=hero.jpg&v=...   → sirve la foto que subió Robert
 *   POST /api/foto?accion=subir          → { slot, dataUrl } (pide sesión)
 *   POST /api/foto?accion=quitar         → { slot }  vuelve a la del repo
 *
 * Las fotos viven en el mismo Blob privado que los datos y se sirven por aquí
 * en vez de con una URL pública: así no hay que abrir el store ni depender de
 * cómo esté configurado. El `v` de la URL cambia con cada subida, por eso se
 * puede cachear para siempre y aun así el cambio se ve al instante.
 */
import crypto from 'node:crypto';
import { read, update, json, leerBody, tokenValido, FOTOS, FOTO_IDS, fotoURL } from '../lib/db.js';
import { guardarBytes, leerBytes, borrarBytes } from '../lib/archivos.js';

const TIPOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 4 * 1024 * 1024;   // el cuerpo de una función de Vercel tope 4.5 MB

/* Guardar/leer/borrar viven en lib/archivos.js: los videos usan lo mismo. */

/** El navegador puede mentir en el `data:`; el tipo real sale de los primeros bytes. */
function tipoReal(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'image/png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');

    /* ---------- servir la foto ---------- */
    if (req.method === 'GET') {
      const slot = url.searchParams.get('slot') || '';
      if (!FOTO_IDS.includes(slot)) return json(res, 404, { error: 'No existe esa foto.' });

      const { data } = await read();
      const meta = data.fotos?.[slot];
      if (!meta) return json(res, 404, { error: 'Esa foto no se ha cambiado.' });

      const archivo = await leerBytes(meta.key);
      if (!archivo) return json(res, 404, { error: 'No se encontró la foto.' });

      res.statusCode = 200;
      res.setHeader('Content-Type', archivo.contentType);
      res.setHeader('Content-Length', archivo.bytes.length);
      // la URL trae `v`: si cambia la foto cambia la URL, así que esta se cachea para siempre
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.end(archivo.bytes);
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

    /* ---------- de aquí en adelante, sesión del panel ---------- */
    const token = req.headers['x-gs-token'] || url.searchParams.get('token') || '';
    const { data: actual } = await read();
    if (!tokenValido(token, actual.pin)) return json(res, 401, { error: 'Sesión expirada. Entra otra vez.' });

    const accion = url.searchParams.get('accion') || '';
    const body = await leerBody(req);
    const slot = String(body.slot || '');
    if (!FOTO_IDS.includes(slot)) return json(res, 400, { error: 'No existe esa foto.' });

    if (accion === 'quitar') {
      const r = await update((data) => {
        const meta = data.fotos?.[slot];
        delete data.fotos[slot];
        return { ok: true, slot, anterior: meta || null };
      });
      await borrarBytes(r.anterior);
      return json(res, 200, { ok: true, slot, url: null });
    }

    if (accion === 'subir') {
      const dataUrl = String(body.dataUrl || '');
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!m) return json(res, 400, { error: 'La foto tiene que ser JPG, PNG o WEBP.' });

      const bytes = Buffer.from(m[2], 'base64');
      if (!bytes.length) return json(res, 400, { error: 'La foto llegó vacía.' });
      if (bytes.length > MAX_BYTES) return json(res, 413, { error: 'La foto pesa demasiado. Intenta con una más chica.' });

      const contentType = tipoReal(bytes);
      if (!contentType) return json(res, 400, { error: 'Ese archivo no es una foto.' });

      const base = slot.replace(/\.[^.]+$/, '');
      const key = `fotos/${base}-${crypto.randomBytes(5).toString('hex')}.${TIPOS[contentType]}`;
      const urlBlob = await guardarBytes(key, bytes, contentType);

      const meta = { key, url: urlBlob, v: Date.now(), tipo: contentType, tam: bytes.length };
      const r = await update((data) => {
        const anterior = data.fotos?.[slot] || null;
        data.fotos[slot] = meta;
        return { anterior };
      });
      await borrarBytes(r.anterior);

      return json(res, 200, { ok: true, slot, url: fotoURL(slot, meta), tam: bytes.length });
    }

    return json(res, 400, { error: 'Acción desconocida' });
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.mensaje });
    return json(res, 500, { error: 'Error del servidor', detalle: String(e?.message || e) });
  }
}

/** La lista que pinta el panel. */
export const SLOTS = FOTOS;
