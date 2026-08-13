/**
 * Guardar y leer archivos binarios (fotos y videos).
 *
 * En Vercel viven en el mismo Blob privado que los datos; en local, sin
 * BLOB_READ_WRITE_TOKEN, van a una carpeta temporal con el mismo contrato de
 * `key`, para que el resto del código no note la diferencia.
 */
import { put, get, del, list } from '@vercel/blob';

export const SIN_BLOB = !process.env.BLOB_READ_WRITE_TOKEN;
const DIR_LOCAL = `${process.env.TMPDIR || '/tmp'}/gosurf-fotos`;

const rutaLocal = async (key) => {
  const path = await import('node:path');
  return path.join(DIR_LOCAL, key.replace(/\//g, '_'));
};

/** Guarda los bytes bajo `key`. Devuelve la URL del blob (null en local). */
export async function guardarBytes(key, bytes, contentType) {
  if (!SIN_BLOB) {
    const r = await put(key, bytes, {
      access: 'private',
      contentType,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    });
    return r.url || null;
  }
  const fs = await import('node:fs/promises');
  await fs.mkdir(DIR_LOCAL, { recursive: true });
  await fs.writeFile(await rutaLocal(key), bytes);
  return null;
}

/** Devuelve { bytes, contentType } o null si no está. */
export async function leerBytes(key, contentTypeSiLocal) {
  if (!SIN_BLOB) {
    const res = await get(key, { access: 'private', useCache: false });
    if (!res || res.statusCode !== 200) return null;
    const buf = Buffer.from(await new Response(res.stream).arrayBuffer());
    return { bytes: buf, contentType: res.blob?.contentType || contentTypeSiLocal || 'application/octet-stream' };
  }
  const fs = await import('node:fs/promises');
  try {
    const bytes = await fs.readFile(await rutaLocal(key));
    return { bytes, contentType: contentTypeSiLocal || porExtension(key) };
  } catch { return null; }
}

/** Borra un archivo. Acepta la meta guardada ({key,url}) o la key pelona. */
export async function borrarBytes(meta) {
  if (!meta) return;
  const key = typeof meta === 'string' ? meta : meta.key;
  const url = typeof meta === 'string' ? null : meta.url;
  if (!key && !url) return;
  try {
    if (!SIN_BLOB) await del(url || key);
    else {
      const fs = await import('node:fs/promises');
      await fs.unlink(await rutaLocal(key));
    }
  } catch { /* si no se pudo borrar el viejo, no pasa nada: ya nadie lo usa */ }
}

/**
 * Basura de subidas que nadie terminó. Devuelve las keys bajo `prefijo` con
 * más de `edadMs` de haberse subido. En local no hace nada: el sistema ya
 * limpia $TMPDIR solo.
 */
export async function keysViejas(prefijo, edadMs) {
  if (SIN_BLOB) return [];
  try {
    const { blobs } = await list({ prefix: prefijo, limit: 500 });
    const corte = Date.now() - edadMs;
    return blobs
      .filter((b) => new Date(b.uploadedAt).getTime() < corte)
      .map((b) => b.url || b.pathname);
  } catch { return []; }
}

function porExtension(key) {
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.mp4')) return 'video/mp4';
  if (key.endsWith('.webm')) return 'video/webm';
  return 'image/jpeg';
}
