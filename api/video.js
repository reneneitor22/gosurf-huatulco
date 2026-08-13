/**
 * Videos cortos del sitio.
 *
 *   GET  /api/video?slot=hero&v=...            → el clip (con soporte de rangos)
 *   GET  /api/video?slot=hero&v=...&poster=1   → la imagen de portada del clip
 *   POST /api/video?accion=parte               → { uid, i, b64 }   (pide sesión)
 *   POST /api/video?accion=fin                 → { slot, uid, partes, dur, poster }
 *   POST /api/video?accion=quitar              → { slot }
 *
 * Por qué en partes: el cuerpo de una función de Vercel no pasa de 4.5 MB y un
 * clip pesa más que eso. El navegador lo parte, cada pedazo se guarda suelto en
 * `tmp/` y `fin` los pega, revisa que sea video de verdad y lo publica. Si
 * alguien abandona a medias, quedan pedazos huérfanos: los barre el siguiente
 * `fin`.
 *
 * Por qué con rangos: Safari (y iOS sobre todo) pide `Range` antes de tocar un
 * <video> y si el servidor contesta 200 con todo, no reproduce. Además la
 * respuesta de una función tampoco puede pasar de 4.5 MB, así que cada tajada
 * se recorta a TOPE_RESPUESTA aunque el navegador pida "de aquí al final".
 */
import crypto from 'node:crypto';
import {
  read, update, json, leerBody, tokenValido,
  VIDEOS, VIDEO_IDS, VIDEO_SEG_MAX, videoPublico,
} from '../lib/db.js';
import { guardarBytes, leerBytes, borrarBytes, keysViejas } from '../lib/archivos.js';

const MAX_PARTE   = 3 * 1024 * 1024;        // por pedazo, ya decodificado
const MAX_TOTAL   = 24 * 1024 * 1024;       // el clip entero
const MAX_PARTES  = 40;
const MAX_POSTER  = 2 * 1024 * 1024;
const TOPE_RESPUESTA = 3 * 1024 * 1024;     // lo que se manda por petición
const EDAD_BASURA = 2 * 3600 * 1000;        // pedazos sueltos de más de 2 h

const EXT = { 'video/mp4': 'mp4', 'video/webm': 'webm' };

/** El tipo real sale de los bytes, no de lo que diga el navegador. */
function tipoReal(buf) {
  if (buf.length > 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const marca = buf.toString('ascii', 8, 12);
    // 'qt  ' es un .mov de iPhone: Chrome y Android no lo abren
    if (marca === 'qt  ') return { error: 'Ese archivo es .mov de iPhone y no se ve en Android. Expórtalo como MP4.' };
    return { tipo: 'video/mp4' };
  }
  if (buf.length > 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { tipo: 'video/webm' };
  }
  return { error: 'Ese archivo no es un video MP4 o WEBM.' };
}

/** H.265 se ve en iPhone y en nada más. Vale más rechazarlo que publicar un cuadro negro. */
function esHEVC(buf) {
  return buf.includes(Buffer.from('hvc1')) || buf.includes(Buffer.from('hev1'));
}

function uidValido(s) {
  return /^[a-f0-9]{8,32}$/.test(s);
}

const keyParte = (uid, i) => `tmp/${uid}-${i}.bin`;

/** Contesta el archivo entero o la tajada que pidió el navegador. */
function servir(req, res, bytes, contentType, cacheable) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Accept-Ranges', 'bytes');
  // la URL lleva `v`: si cambia el video cambia la URL, así que se cachea para siempre
  res.setHeader('Cache-Control', cacheable ? 'public, max-age=31536000, immutable' : 'no-store');

  const rango = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (!rango) {
    if (bytes.length > TOPE_RESPUESTA) {
      // sin rango no hay forma de mandar un archivo grande: se pide de nuevo por partes
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${bytes.length}`);
      return res.end();
    }
    res.statusCode = 200;
    res.setHeader('Content-Length', bytes.length);
    return res.end(bytes);
  }

  let ini = rango[1] === '' ? null : Number(rango[1]);
  let fin = rango[2] === '' ? null : Number(rango[2]);
  if (ini === null) {                        // "bytes=-500" = los últimos 500
    const cuantos = Math.min(fin || 0, bytes.length);
    ini = bytes.length - cuantos;
    fin = bytes.length - 1;
  }
  if (fin === null || fin >= bytes.length) fin = bytes.length - 1;
  if (!Number.isFinite(ini) || ini < 0 || ini > fin) {
    res.statusCode = 416;
    res.setHeader('Content-Range', `bytes */${bytes.length}`);
    return res.end();
  }
  fin = Math.min(fin, ini + TOPE_RESPUESTA - 1);   // el tope de la respuesta manda

  const tajada = bytes.subarray(ini, fin + 1);
  res.statusCode = 206;
  res.setHeader('Content-Range', `bytes ${ini}-${fin}/${bytes.length}`);
  res.setHeader('Content-Length', tajada.length);
  return res.end(tajada);
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');

    /* ---------- servir el video o su portada ---------- */
    if (req.method === 'GET' || req.method === 'HEAD') {
      const slot = url.searchParams.get('slot') || '';
      if (!VIDEO_IDS.includes(slot)) return json(res, 404, { error: 'No existe ese video.' });

      const { data } = await read();
      const meta = data.videos?.[slot];
      if (!meta) return json(res, 404, { error: 'Ese hueco no tiene video.' });

      const poster = url.searchParams.get('poster') === '1';
      if (poster && !meta.poster) return json(res, 404, { error: 'Ese video no tiene portada.' });

      const archivo = await leerBytes(poster ? meta.poster : meta.key, poster ? 'image/jpeg' : meta.tipo);
      if (!archivo) return json(res, 404, { error: 'No se encontró el archivo.' });

      if (req.method === 'HEAD') {
        res.statusCode = 200;
        res.setHeader('Content-Type', archivo.contentType);
        res.setHeader('Content-Length', archivo.bytes.length);
        res.setHeader('Accept-Ranges', 'bytes');
        return res.end();
      }
      return servir(req, res, archivo.bytes, archivo.contentType, true);
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

    /* ---------- de aquí en adelante, sesión del panel ---------- */
    const token = req.headers['x-gs-token'] || url.searchParams.get('token') || '';
    const { data: actual } = await read();
    if (!tokenValido(token, actual.pin)) return json(res, 401, { error: 'Sesión expirada. Entra otra vez.' });

    const accion = url.searchParams.get('accion') || '';
    const body = await leerBody(req);

    /* ---------- un pedazo del archivo ---------- */
    if (accion === 'parte') {
      const uid = String(body.uid || '');
      const i = Number(body.i);
      if (!uidValido(uid)) return json(res, 400, { error: 'Subida inválida.' });
      if (!Number.isInteger(i) || i < 0 || i >= MAX_PARTES) return json(res, 400, { error: 'Subida inválida.' });

      const bytes = Buffer.from(String(body.b64 || ''), 'base64');
      if (!bytes.length) return json(res, 400, { error: 'Ese pedazo llegó vacío.' });
      if (bytes.length > MAX_PARTE) return json(res, 413, { error: 'Ese pedazo pesa demasiado.' });

      await guardarBytes(keyParte(uid, i), bytes, 'application/octet-stream');
      return json(res, 200, { ok: true, i, tam: bytes.length });
    }

    /* ---------- pegar los pedazos y publicar ---------- */
    if (accion === 'fin') {
      const slot = String(body.slot || '');
      const uid = String(body.uid || '');
      const partes = Number(body.partes);
      if (!VIDEO_IDS.includes(slot)) return json(res, 400, { error: 'No existe ese video.' });
      if (!uidValido(uid)) return json(res, 400, { error: 'Subida inválida.' });
      if (!Number.isInteger(partes) || partes < 1 || partes > MAX_PARTES) return json(res, 400, { error: 'Subida inválida.' });

      const trozos = [];
      for (let i = 0; i < partes; i++) {
        const p = await leerBytes(keyParte(uid, i), 'application/octet-stream');
        if (!p) return json(res, 400, { error: 'Se perdió un pedazo del video. Vuelve a intentarlo.' });
        trozos.push(p.bytes);
      }
      const bytes = Buffer.concat(trozos);
      const limpiarPartes = async () => {
        for (let i = 0; i < partes; i++) await borrarBytes(keyParte(uid, i));
      };

      if (bytes.length > MAX_TOTAL) {
        await limpiarPartes();
        return json(res, 413, { error: 'El video pesa demasiado.' });
      }
      const { tipo, error } = tipoReal(bytes);
      if (error) { await limpiarPartes(); return json(res, 400, { error }); }
      if (esHEVC(bytes)) {
        await limpiarPartes();
        return json(res, 400, { error: 'Ese video está en H.265 y solo se ve en iPhone. Vuelve a prepararlo desde el panel.' });
      }

      const dur = Math.min(Number(body.dur) || 0, 60);
      if (dur && dur > VIDEO_SEG_MAX + 1.5) {
        await limpiarPartes();
        return json(res, 400, { error: `El clip no puede durar más de ${VIDEO_SEG_MAX} segundos.` });
      }

      const sello = crypto.randomBytes(5).toString('hex');
      const key = `videos/${slot}-${sello}.${EXT[tipo]}`;
      const urlBlob = await guardarBytes(key, bytes, tipo);

      /* La portada viaja en el mismo `fin`: pesa poco y así el video nunca
         queda publicado sin imagen (iOS enseña negro hasta que decide cargar). */
      let posterKey = null;
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.poster || ''));
      if (m) {
        const pb = Buffer.from(m[1], 'base64');
        if (pb.length && pb.length <= MAX_POSTER) {
          posterKey = `videos/${slot}-${sello}-poster.jpg`;
          await guardarBytes(posterKey, pb, 'image/jpeg');
        }
      }

      const meta = {
        key, url: urlBlob, poster: posterKey, v: Date.now(),
        tipo, tam: bytes.length, dur: Math.round(dur * 10) / 10,
        w: Math.max(0, Math.min(8000, Number(body.w) || 0)),
        h: Math.max(0, Math.min(8000, Number(body.h) || 0)),
      };
      const r = await update((data) => {
        const anterior = data.videos?.[slot] || null;
        data.videos[slot] = meta;
        return { anterior };
      });

      await limpiarPartes();
      await borrarBytes(r.anterior);
      if (r.anterior?.poster) await borrarBytes(r.anterior.poster);
      for (const vieja of await keysViejas('tmp/', EDAD_BASURA)) await borrarBytes(vieja);

      return json(res, 200, { ok: true, slot, video: videoPublico(slot, meta) });
    }

    if (accion === 'quitar') {
      const slot = String(body.slot || '');
      if (!VIDEO_IDS.includes(slot)) return json(res, 400, { error: 'No existe ese video.' });
      const r = await update((data) => {
        const meta = data.videos?.[slot] || null;
        delete data.videos[slot];
        return { anterior: meta };
      });
      await borrarBytes(r.anterior);
      if (r.anterior?.poster) await borrarBytes(r.anterior.poster);
      return json(res, 200, { ok: true, slot });
    }

    return json(res, 400, { error: 'Acción desconocida' });
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.mensaje });
    return json(res, 500, { error: 'Error del servidor', detalle: String(e?.message || e) });
  }
}

/** La lista que pinta el panel. */
export const SLOTS = VIDEOS;
