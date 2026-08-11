import {
  read, update, json, leerBody, hoyISO, sumarDias, esISO, fechasDe,
  choques, cotizar, folioNuevo, limpiar, soloDigitos, clamp, normLang,
} from '../lib/db.js';
import { crearPreference, baseURL, pagosDeFolio, aplicarPago, mpConfigurado } from '../lib/mp.js';

const TITULOS = {
  trip: 'GO SURF · Surf trip completo',
  guia: 'GO SURF · Solo guía',
  lessons: 'GO SURF · Surf lessons',
};

/* Los errores que ve el cliente van en su idioma; los cuatro que soporta el sitio. */
const AVISOS = {
  nombre: {
    es: 'Escribe tu nombre.', en: 'Please enter your name.',
    fr: 'Indique ton nom.', pt: 'Escreva seu nome.',
  },
  telefono: {
    es: 'Necesitamos un teléfono válido.', en: 'We need a valid phone number.',
    fr: 'Il nous faut un téléphone valide.', pt: 'Precisamos de um telefone válido.',
  },
  fecha: {
    es: 'Fecha inválida.', en: 'Invalid date.',
    fr: 'Date invalide.', pt: 'Data inválida.',
  },
  pasada: {
    es: 'Esa fecha ya pasó.', en: 'That date is in the past.',
    fr: 'Cette date est déjà passée.', pt: 'Essa data já passou.',
  },
  lejana: {
    es: 'Esa fecha todavía no está abierta para reservar.',
    en: 'That date is not open for booking yet.',
    fr: 'Cette date n’est pas encore ouverte à la réservation.',
    pt: 'Essa data ainda não está aberta para reserva.',
  },
  tomada: {
    es: 'Alguien acaba de apartar ese día. Escoge otra fecha.',
    en: 'Someone just took that day. Please pick another date.',
    fr: 'Quelqu’un vient de prendre cette journée. Choisis une autre date.',
    pt: 'Alguém acabou de reservar esse dia. Escolha outra data.',
  },
  colgadas: {
    es: 'Ya tienes 3 reservas sin pagar. Termina una antes de abrir otra.',
    en: 'You already have 3 unpaid bookings. Finish one before starting another.',
    fr: 'Tu as déjà 3 réservations non payées. Termines-en une avant d’en ouvrir une autre.',
    pt: 'Você já tem 3 reservas sem pagar. Conclua uma antes de abrir outra.',
  },
};
const aviso = (k, lang) => AVISOS[k][lang] || AVISOS[k].en;

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  try {
    const url = new URL(req.url, 'http://x');
    const accion = url.searchParams.get('accion') || 'crear';
    const b = await leerBody(req);

    /* ------------------------------------------------------------------
       Verificar contra Mercado Pago.
       El webhook es el camino normal, pero si no llegó (en local nunca
       llega, y en producción se puede perder) la pantalla de regreso
       pregunta directo y la reserva se confirma igual.
       ------------------------------------------------------------------ */
    if (accion === 'verificar') {
      const folio = limpiar(b.folio, 12).toUpperCase();
      if (!folio) return json(res, 400, { error: 'Falta el folio.' });
      if (!mpConfigurado()) return json(res, 200, { estado: 'sin-pasarela' });

      const pagos = await pagosDeFolio(folio);
      const aprobado = pagos.find((p) => p.status === 'approved') || pagos[0];
      if (!aprobado) return json(res, 200, { estado: 'sin-pago' });

      const r = await update((data) => aplicarPago(data, folio, aprobado, choques));
      return json(res, 200, { estado: r.aprobado ? 'pagada' : 'pendiente', pago: { id: String(aprobado.id), monto: Number(aprobado.transaction_amount) || 0 } });
    }

    /* ------------------------------------------------------------------
       Crear la reserva.
       El precio se recalcula aquí con `cotizar()`: lo que mande el
       navegador solo sirve para pintar, nunca para cobrar.
       ------------------------------------------------------------------ */
    const cliente = limpiar(b.cliente, 60);
    const telefono = soloDigitos(b.telefono).slice(0, 15);
    const fecha = String(b.fecha || '');
    const lang = normLang(b.lang);

    if (cliente.length < 2) return json(res, 400, { error: aviso('nombre', lang) });
    if (telefono.length < 7) return json(res, 400, { error: aviso('telefono', lang) });
    if (!esISO(fecha)) return json(res, 400, { error: aviso('fecha', lang) });

    const salida = await update((data) => {
      const hoy = hoyISO();
      if (fecha < hoy) throw { code: 400, mensaje: aviso('pasada', lang) };
      if (fecha > sumarDias(hoy, data.reglas.diasVista || 180)) {
        throw { code: 400, mensaje: aviso('lejana', lang) };
      }

      const dias = clamp(b.dias, 1, data.reglas.maxDias, 1);
      const fechas = fechasDe(fecha, dias);

      const tomadas = choques(data, fechas);
      if (tomadas.length) {
        throw { code: 409, mensaje: aviso('tomada', lang), fechas: tomadas.map((t) => t.fecha) };
      }

      // Un mismo teléfono no puede dejar reservas colgadas sin fin.
      const abiertas = data.reservas.filter(
        (r) => r.telefono === telefono && r.estado === 'pendiente' && Number(r.holdHasta || 0) > Date.now()
      );
      if (abiertas.length >= 3) {
        throw { code: 429, mensaje: aviso('colgadas', lang) };
      }

      const q = cotizar(data, {
        servicio: b.servicio,
        pax: b.pax,
        dias,
        fecha,
        film: b.film && b.film.opcion ? b.film : null,
      }, lang);

      const hold = clamp(data.reglas.holdMin, 5, 180, 20);
      const reserva = {
        folio: folioNuevo(data.reservas),
        servicio: ['trip', 'guia', 'lessons'].includes(b.servicio) ? b.servicio : 'trip',
        pax: clamp(b.pax, 1, data.reglas.maxPax, 1),
        nivel: limpiar(b.nivel, 20),
        fecha, dias, fechas,
        film: b.film && b.film.opcion ? { opcion: limpiar(b.film.opcion, 8), sesiones: clamp(b.film.sesiones, 1, 30, 1) } : null,
        lineas: q.lineas,
        total: q.total, anticipo: q.anticipo, saldo: q.saldo, pct: q.pct,
        cliente, telefono,
        viene: limpiar(b.viene, 60),
        hospeda: limpiar(b.hospeda, 80),
        notas: limpiar(b.notas, 300),
        lang,
        estado: 'pendiente',
        pago: null,
        holdHasta: Date.now() + hold * 60000,
        creada: Date.now(),
        actualizada: Date.now(),
        historial: [{ t: Date.now(), q: 'cliente', a: 'creada' }],
      };
      data.reservas.push(reserva);
      return { reserva, holdMin: hold, politica: data.anticipo.politica, whatsapp: data.negocio.whatsapp };
    });

    // Sin credenciales de Mercado Pago la reserva igual queda apartada;
    // el cliente cierra por WhatsApp y Robert la marca cobrada en el panel.
    if (!mpConfigurado()) {
      return json(res, 200, { ...salida, pago: null, aviso: 'sin-pasarela' });
    }

    try {
      const pref = await crearPreference({
        reserva: salida.reserva,
        base: baseURL(req),
        minutos: salida.holdMin,
        titulo: TITULOS[salida.reserva.servicio] || TITULOS.trip,
      });
      await update((data) => {
        const r = data.reservas.find((x) => x.folio === salida.reserva.folio);
        if (r) r.preferenceId = pref.id;
      });
      return json(res, 200, { ...salida, pago: { url: pref.url || pref.urlSandbox, preferenceId: pref.id } });
    } catch (e) {
      // La reserva ya existe y las fechas están apartadas: no la tiramos por
      // un fallo de la pasarela, se le ofrece cerrar por WhatsApp.
      return json(res, 200, { ...salida, pago: null, aviso: 'pasarela-falla', detalle: e?.mensaje || String(e) });
    }
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.mensaje, fechas: e.fechas });
    return json(res, 500, { error: 'No se pudo crear la reserva. Intenta de nuevo.' });
  }
}
