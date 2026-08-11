/**
 * Servidor local de desarrollo.
 *
 * Sirve los archivos estáticos y monta a mano las funciones de `api/`, con la
 * misma firma (req, res) que usa Vercel. Sirve para probar el flujo completo
 * sin depender de `vercel dev` ni de tener el Blob creado: si no hay
 * BLOB_READ_WRITE_TOKEN, lib/db.js guarda en un archivo temporal.
 *
 *   node dev.mjs            → http://localhost:3541
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT) || 3541;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

const rutas = {
  '/api/public': () => import('./api/public.js'),
  '/api/admin': () => import('./api/admin.js'),
  '/api/reserva': () => import('./api/reserva.js'),
  '/api/webhook': () => import('./api/webhook.js'),
};

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname;

  if (rutas[ruta]) {
    try {
      const mod = await rutas[ruta]();
      await mod.default(req, res);
    } catch (e) {
      console.error(ruta, e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(e?.message || e) }));
    }
    return;
  }

  // estáticos, con cleanUrls como en vercel.json
  let rel = ruta === '/' ? '/index.html' : ruta;
  if (!path.extname(rel)) rel += '.html';
  const archivo = path.join(RAIZ, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));

  try {
    const cuerpo = await fs.readFile(archivo);
    res.statusCode = 200;
    res.setHeader('Content-Type', TIPOS[path.extname(archivo)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(cuerpo);
  } catch {
    res.statusCode = 404;
    res.end('No encontrado');
  }
});

servidor.listen(PUERTO, () => {
  console.log(`GO SURF dev en http://localhost:${PUERTO}`);
  console.log(process.env.BLOB_READ_WRITE_TOKEN ? 'Guardando en Vercel Blob' : 'Guardando en archivo temporal (sin Blob)');
  console.log(process.env.MP_ACCESS_TOKEN ? 'Mercado Pago conectado' : 'Sin Mercado Pago: no se muestra el botón de pagar');
});
