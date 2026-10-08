# GO SURF Huatulco — notas para quien lo edite

Sitio + motor de reservas de Robert (@gosurf.huatulco). Vercel + Vercel Blob privado + panel en `/admin`.
Detalle completo en README.md. Local: `node dev.mjs` → :3541 (sin tokens guarda en archivo temporal y esconde el pago).

## Reglas que sostienen el cobro (no romper)
- El precio se recalcula en el servidor con `cotizar()`; lo del navegador solo pinta. Lanza error si el total es 0.
- Hold de 20 min al crear la reserva; si no paga, vence. Sin eso dos personas pagan el mismo día.
- El webhook no le cree a Mercado Pago: saca el id y consulta el estado a su API.
- Anticipo 30% no reembolsable. Un grupo por día.

## Trampas
- `vercel.json`: `cleanUrls` redirige `/admin.html` → `/admin`; los `headers` deben apuntar a `/admin`. No acepta propiedades extra (ni comentarios).
- Video de portada = estático (`video/hero.mp4`), no por `/api/video`. Si Robert sube uno desde el panel, `aplicarVideos()` le pisa el `src`.
- Las fotos del panel viven en el Blob y pisan `fotos/*.jpg` en runtime. Si "cambió una foto sola": compara `/api/public?accion=config` en local y en vivo.
- Textos libres van en 4 idiomas (ES/EN/FR/PT); fallback a inglés.
- Calendario propio, no `input[type=date]`.

## Pendientes con Robert
Token de Mercado Pago (`MP_ACCESS_TOKEN` en Vercel + redeploy) · precios reales de solo-guía, lessons y lancha · fotos en alta · testimonios (son inventados).
Cambia el PIN del panel desde Ajustes si sigue el inicial.

Deploy: `vercel deploy --prod --yes` (necesita Blob propio: `BLOB_READ_WRITE_TOKEN`).
