import {
  read, update, json, leerBody, crearToken, tokenValido,
  hoyISO, esISO, limpiar, clamp, soloDigitos, diasOcupados, sumarDias, FOTOS, fotoURL,
  VIDEOS, VIDEO_SEG_MAX, videosPublicos,
} from '../lib/db.js';

const ESTADOS = ['pendiente', 'pagada', 'cancelada', 'completada'];

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const accion = url.searchParams.get('accion') || '';
    const body = req.method === 'POST' ? await leerBody(req) : {};

    /* ---- login ---- */
    if (accion === 'login') {
      const pin = String(body.pin || '');
      const r = await update((data) => {
        const s = data.seguridad;
        if (s.bloqueoHasta > Date.now()) {
          const min = Math.ceil((s.bloqueoHasta - Date.now()) / 60000);
          throw { code: 429, mensaje: `Demasiados intentos. Espera ${min} min.` };
        }
        if (pin !== data.pin) {
          s.fallos = (s.fallos || 0) + 1;
          if (s.fallos >= 5) { s.bloqueoHasta = Date.now() + 10 * 60000; s.fallos = 0; }
          throw { code: 401, mensaje: 'PIN incorrecto.' };
        }
        s.fallos = 0; s.bloqueoHasta = 0;
        return { token: crearToken(data.pin), negocio: data.negocio };
      });
      return json(res, 200, r);
    }

    /* ---- de aquí en adelante requiere sesión ---- */
    const token = req.headers['x-gs-token'] || url.searchParams.get('token') || '';
    const { data: actual } = await read();
    if (!tokenValido(token, actual.pin)) return json(res, 401, { error: 'Sesión expirada. Entra otra vez.' });

    if (accion === 'data') {
      const { pin, seguridad, ...resto } = actual;
      return json(res, 200, {
        ...resto,
        // el panel solo necesita saber cuáles cambió y dónde verlas
        fotos: Object.fromEntries(Object.entries(actual.fotos || {}).map(([k, v]) => [k, fotoURL(k, v)])),
        slots: FOTOS,
        videos: videosPublicos(actual),
        slotsVideo: VIDEOS,
        segMax: VIDEO_SEG_MAX,
        hoy: hoyISO(),
        ocupados: Object.fromEntries(diasOcupados(actual)),
        mpConfigurado: Boolean(process.env.MP_ACCESS_TOKEN),
      });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

    /* ---- guardar configuración (precios, textos, reglas, PIN) ---- */
    if (accion === 'guardar') {
      const r = await update((data) => {
        const p = body.parche || {};

        if (p.negocio) {
          const n = p.negocio;
          data.negocio = {
            nombre: limpiar(n.nombre, 40) || data.negocio.nombre,
            guia: limpiar(n.guia, 60) || data.negocio.guia,
            whatsapp: soloDigitos(n.whatsapp).slice(0, 15) || data.negocio.whatsapp,
            email: limpiar(n.email, 80),
            instagram: limpiar(n.instagram, 40).replace(/^@/, ''),
          };
        }

        if (p.servicios) {
          for (const k of ['trip', 'guia', 'lancha']) {
            const s = p.servicios[k];
            if (!s) continue;
            const dest = data.servicios[k];
            if (s.activo !== undefined) dest.activo = !!s.activo;
            if (s.provisional !== undefined) dest.provisional = !!s.provisional;
            if (Array.isArray(s.tiers) && s.tiers.length) {
              dest.tiers = s.tiers.slice(0, 10).map((t) => ({
                min: clamp(t.min, 1, 99, 1),
                max: clamp(t.max, 1, 99, 99),
                precio: clamp(t.precio, 0, 500000, 0),
              })).sort((a, b) => a.min - b.min);
            }
          }
          const le = p.servicios.lessons;
          if (le) {
            const d = data.servicios.lessons;
            if (le.activo !== undefined) d.activo = !!le.activo;
            if (le.provisional !== undefined) d.provisional = !!le.provisional;
            if (le.precio !== undefined) d.precio = clamp(le.precio, 0, 500000, d.precio);
            if (le.mesInicio !== undefined) d.mesInicio = clamp(le.mesInicio, 1, 12, d.mesInicio);
            if (le.mesFin !== undefined) d.mesFin = clamp(le.mesFin, 1, 12, d.mesFin);
          }
        }

        if (p.filmacion) {
          const f = p.filmacion;
          if (f.activo !== undefined) data.filmacion.activo = !!f.activo;
          if (f.provisional !== undefined) data.filmacion.provisional = !!f.provisional;
          if (f.maxSesiones !== undefined) data.filmacion.maxSesiones = clamp(f.maxSesiones, 1, 30, 10);
          if (Array.isArray(f.opciones) && f.opciones.length) {
            data.filmacion.opciones = f.opciones.slice(0, 6).map((o, i) => ({
              id: limpiar(o.id, 8) || `f${i}`,
              horas: clamp(o.horas, 1, 24, 4),
              precio: clamp(o.precio, 0, 500000, 0),
            })).sort((a, b) => a.horas - b.horas);
          }
        }

        if (p.anticipo) {
          const pi = p.anticipo.politicaI18n || {};
          data.anticipo = {
            activo: !!p.anticipo.activo,
            pct: clamp(p.anticipo.pct, 0, 100, data.anticipo.pct),
            politica: limpiar(p.anticipo.politica, 300) || data.anticipo.politica,
            politicaI18n: Object.fromEntries(['en', 'fr', 'pt'].map((k) => [
              k, limpiar(pi[k], 300) || data.anticipo.politicaI18n[k],
            ])),
          };
        }

        if (p.puravida) {
          const pv = p.puravida.i18n || {};
          data.puravida = {
            activo: !!p.puravida.activo,
            provisional: !!p.puravida.provisional,
            nombre: limpiar(p.puravida.nombre, 60) || data.puravida.nombre,
            lugar: limpiar(p.puravida.lugar, 120),
            instagram: limpiar(p.puravida.instagram, 40).replace(/^@/, ''),
            linea: limpiar(p.puravida.linea, 100),
            horario: limpiar(p.puravida.horario, 80),
            texto: limpiar(p.puravida.texto, 400),
            i18n: Object.fromEntries(['en', 'fr', 'pt'].map((k) => [k, {
              linea: limpiar(pv[k]?.linea, 100) || data.puravida.i18n[k].linea,
              horario: limpiar(pv[k]?.horario, 80) || data.puravida.i18n[k].horario,
              texto: limpiar(pv[k]?.texto, 400) || data.puravida.i18n[k].texto,
            }])),
          };
        }

        /* Extras (masaje, hospedaje, carro, pesca, yoga): sin precio, solo
           nombre y texto por idioma. Se guardan sobre los que ya existen para
           no perder uno si el panel manda la lista incompleta. */
        if (Array.isArray(p.extras)) {
          for (const e of p.extras.slice(0, 12)) {
            const dest = data.extras.find((x) => x.id === e.id);
            if (!dest) continue;
            if (e.activo !== undefined) dest.activo = !!e.activo;
            dest.nombre = limpiar(e.nombre, 40) || dest.nombre;
            dest.texto = limpiar(e.texto, 300) || dest.texto;
            for (const k of ['en', 'fr', 'pt']) {
              const tr = e.i18n?.[k] || {};
              dest.i18n[k] = {
                nombre: limpiar(tr.nombre, 40) || dest.i18n[k].nombre,
                texto: limpiar(tr.texto, 300) || dest.i18n[k].texto,
              };
            }
          }
        }

        /* Textos largos de la página. Cada bloque trae los mismos campos en
           los cuatro idiomas; lo que llegue vacío conserva lo de antes. */
        if (p.textos) {
          for (const [bloque, val] of Object.entries(p.textos)) {
            const dest = data.textos[bloque];
            if (!dest || !val) continue;
            const campos = (origen, destino) => {
              for (const campo of ['kicker', 'titulo', 'sub', 'texto']) {
                if (destino[campo] === undefined || origen[campo] === undefined) continue;
                destino[campo] = limpiar(origen[campo], campo === 'kicker' ? 40 : 400) || destino[campo];
              }
              if (Array.isArray(destino.puntos) && Array.isArray(origen.puntos)) {
                const pts = origen.puntos.map((x) => limpiar(x, 80)).filter(Boolean);
                if (pts.length) destino.puntos = pts.slice(0, 6);
              }
            };
            campos(val, dest);
            for (const k of ['en', 'fr', 'pt']) if (val.i18n?.[k]) campos(val.i18n[k], dest.i18n[k]);
          }
        }

        if (p.reglas) {
          data.reglas = {
            maxPax: clamp(p.reglas.maxPax, 1, 40, data.reglas.maxPax),
            maxDias: clamp(p.reglas.maxDias, 1, 60, data.reglas.maxDias),
            diasVista: clamp(p.reglas.diasVista, 7, 730, data.reglas.diasVista),
            holdMin: clamp(p.reglas.holdMin, 5, 180, data.reglas.holdMin),
          };
        }

        return { ok: true };
      });
      return json(res, 200, r);
    }

    /* ---- cambiar el PIN ----
       Va aparte de `guardar` y pide el PIN actual: con la sesión abierta en un
       teléfono prestado, cambiar el PIN no debe ser un clic de distancia. */
    if (accion === 'pin') {
      const actual = String(body.actual || '');
      const nuevo = String(body.nuevo || '').trim();
      const confirma = String(body.confirma || '').trim();

      if (nuevo.length < 4) return json(res, 400, { error: 'El PIN nuevo debe tener al menos 4 caracteres.' });
      if (nuevo.length > 32) return json(res, 400, { error: 'El PIN nuevo es demasiado largo.' });
      if (nuevo !== confirma) return json(res, 400, { error: 'El PIN nuevo y su confirmación no coinciden.' });

      const r = await update((data) => {
        const s = data.seguridad;
        if (s.bloqueoHasta > Date.now()) {
          const min = Math.ceil((s.bloqueoHasta - Date.now()) / 60000);
          throw { code: 429, mensaje: `Demasiados intentos. Espera ${min} min.` };
        }
        if (actual !== data.pin) {
          s.fallos = (s.fallos || 0) + 1;
          if (s.fallos >= 5) { s.bloqueoHasta = Date.now() + 10 * 60000; s.fallos = 0; }
          throw { code: 401, mensaje: 'El PIN actual no es correcto.' };
        }
        if (nuevo === data.pin) throw { code: 400, mensaje: 'El PIN nuevo es igual al actual.' };
        s.fallos = 0; s.bloqueoHasta = 0;
        data.pin = nuevo;
        // el token viejo se firma con el PIN viejo, así que hay que reemplazarlo
        return { ok: true, token: crearToken(data.pin) };
      });
      return json(res, 200, r);
    }

    /* ---- bloquear / desbloquear días a mano ----
       Acepta un día suelto (`fecha`) o un rango (`desde`/`hasta`), que es lo
       que necesita Robert cuando se va una semana: sin rango tendría que
       tocar día por día. El rango se recorre entero en una sola escritura. */
    if (accion === 'bloqueo') {
      const op = body.op === 'quitar' ? 'quitar' : 'poner';
      const desde = String(body.desde || body.fecha || '');
      const hasta = String(body.hasta || body.fecha || desde || '');
      if (!esISO(desde) || !esISO(hasta)) return json(res, 400, { error: 'Fecha inválida.' });
      const ini = desde <= hasta ? desde : hasta;
      const fin = desde <= hasta ? hasta : desde;

      const fechas = [];
      for (let f = ini; f <= fin && fechas.length < 400; f = sumarDias(f, 1)) fechas.push(f);
      if (!fechas.length) return json(res, 400, { error: 'Rango vacío.' });

      const r = await update((data) => {
        const nota = limpiar(body.nota, 60);
        let tocados = 0;
        for (const fecha of fechas) {
          const i = data.bloqueos.findIndex((b) => b.fecha === fecha);
          if (op === 'quitar') {
            if (i >= 0) { data.bloqueos.splice(i, 1); tocados++; }
            continue;
          }
          if (i >= 0) data.bloqueos[i].nota = nota;
          else data.bloqueos.push({ fecha, nota, puesta: Date.now() });
          tocados++;
        }
        data.bloqueos.sort((a, b) => a.fecha.localeCompare(b.fecha));
        return { ok: true, desde: ini, hasta: fin, dias: fechas.length, tocados, bloqueado: op === 'poner' };
      });
      return json(res, 200, r);
    }

    /* ---- acciones sobre una reserva ---- */
    if (accion === 'reserva') {
      const folio = limpiar(body.folio, 12).toUpperCase();
      const op = String(body.op || '');
      const r = await update((data) => {
        const i = data.reservas.findIndex((x) => x.folio === folio);
        if (i < 0) throw { code: 404, mensaje: 'No existe esa reserva.' };
        const rv = data.reservas[i];

        if (op === 'eliminar') {
          data.reservas.splice(i, 1);
          return { ok: true, eliminada: folio };
        }
        if (op === 'nota') {
          rv.notaRobert = limpiar(body.nota, 300);
        } else if (op === 'cobrado') {
          // Robert cobró por fuera (transferencia, efectivo): cuenta como pagada
          const monto = clamp(body.monto, 0, 500000, rv.anticipo);
          rv.estado = 'pagada';
          rv.pago = { id: 'MANUAL', status: 'approved', monto, metodo: limpiar(body.metodo, 30) || 'manual', fecha: Date.now() };
          rv.holdHasta = 0;
        } else if (ESTADOS.includes(op)) {
          rv.estado = op;
          if (op === 'pagada' && !rv.pago) {
            rv.pago = { id: 'MANUAL', status: 'approved', monto: rv.anticipo, metodo: 'manual', fecha: Date.now() };
          }
          // Cancelar libera las fechas; el hold ya no aplica.
          if (op === 'cancelada') rv.holdHasta = 0;
        } else {
          throw { code: 400, mensaje: 'Operación desconocida.' };
        }
        rv.actualizada = Date.now();
        (rv.historial = rv.historial || []).push({ t: Date.now(), q: 'robert', a: op });
        return { ok: true, reserva: rv };
      });
      return json(res, 200, r);
    }

    return json(res, 400, { error: 'Acción desconocida' });
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.mensaje });
    return json(res, 500, { error: 'Error del servidor', detalle: String(e?.message || e) });
  }
}
