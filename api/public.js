import { read, publico, json, hoyISO, sumarDias, diasOcupados, cotizar, limpiar } from '../lib/db.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const accion = url.searchParams.get('accion') || 'config';
    const { data } = await read();

    if (accion === 'config') {
      return json(res, 200, publico(data));
    }

    /* Días ocupados dentro de la ventana que el cliente puede reservar.
       No se dice por qué está ocupado: para el visitante es solo "apartado". */
    if (accion === 'dias') {
      const hoy = hoyISO();
      const hasta = sumarDias(hoy, data.reglas.diasVista || 180);
      const ocupados = [...diasOcupados(data).keys()]
        .filter((f) => f >= hoy && f <= hasta)
        .sort();
      return json(res, 200, { hoy, hasta, ocupados });
    }

    /* Estado de una reserva — para la pantalla de regreso de Mercado Pago.
       Solo devuelve lo que el propio cliente ya sabe. */
    if (accion === 'reserva') {
      const folio = limpiar(url.searchParams.get('folio'), 12).toUpperCase();
      const r = data.reservas.find((x) => x.folio === folio);
      if (!r) return json(res, 404, { error: 'No encontramos esa reserva.' });
      return json(res, 200, {
        folio: r.folio,
        estado: r.estado,
        servicio: r.servicio,
        pax: r.pax,
        fechas: r.fechas,
        dias: r.dias,
        lineas: r.lineas,
        total: r.total,
        anticipo: r.anticipo,
        saldo: r.saldo,
        pct: r.pct,
        cliente: r.cliente,
        pagado: r.estado === 'pagada' || r.estado === 'completada',
        pago: r.pago ? { monto: r.pago.monto, id: r.pago.id, fecha: r.pago.fecha } : null,
      });
    }

    /* Cotización de referencia. La página ya calcula el mismo número para
       pintarlo al instante; esto sirve para comprobar que coinciden. */
    if (accion === 'cotizar') {
      const q = url.searchParams;
      const p = {
        servicio: q.get('servicio'),
        pax: q.get('pax'),
        dias: q.get('dias'),
        fecha: q.get('fecha'),
        film: q.get('film') ? { opcion: q.get('film'), sesiones: q.get('sesiones') } : null,
      };
      try {
        return json(res, 200, cotizar(data, p, q.get('lang') || 'es'));
      } catch (e) {
        return json(res, e.code || 400, { error: e.mensaje || 'No se pudo cotizar.' });
      }
    }

    return json(res, 400, { error: 'Acción desconocida' });
  } catch (e) {
    return json(res, 500, { error: 'Error del servidor', detalle: String(e?.message || e) });
  }
}
