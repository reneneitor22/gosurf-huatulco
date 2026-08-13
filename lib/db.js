import { put, get } from '@vercel/blob';
import crypto from 'node:crypto';

const KEY = 'gosurf-data.json';
export const TZ = 'America/Mexico_City';

/* ============================================================
   Datos por defecto
   Los precios que trae Robert de su deck van en firme; los que
   todavía no nos ha dado quedan marcados con `provisional: true`
   para que el panel y la página los señalen como tentativos.
   ============================================================ */

export function defaultData() {
  return {
    version: 1,
    pin: '1234',
    negocio: {
      nombre: 'GO SURF',
      guia: 'Roberto Alonso Cisneros',
      whatsapp: '529541494680',
      email: 'gosurfmexico@gmail.com',
      instagram: 'gosurf.huatulco',
    },

    servicios: {
      // Paquete completo del deck: transporte, guía, sombra, comida, botiquín.
      trip: {
        activo: true,
        provisional: false,
        tiers: [
          { min: 1, max: 1, precio: 4000 },
          { min: 2, max: 2, precio: 3600 },
          { min: 3, max: 3, precio: 3000 },
          { min: 4, max: 99, precio: 2500 },
        ],
      },
      // El cliente trae carro y solo contrata guía. FALTA el precio real de Robert.
      guia: {
        activo: true,
        provisional: true,
        tiers: [
          { min: 1, max: 1, precio: 2500 },
          { min: 2, max: 2, precio: 2200 },
          { min: 3, max: 3, precio: 1800 },
          { min: 4, max: 99, precio: 1500 },
        ],
      },
      // Clases, solo temporada. FALTA el precio real de Robert.
      lessons: {
        activo: true,
        provisional: true,
        precio: 1200,          // por persona por clase
        mesInicio: 12,         // diciembre
        mesFin: 2,             // a febrero
      },
      /* Surf trip en lancha: se llega por mar a los picos que no tienen
         acceso por tierra. Robert todavía no da precio, así que los tiers
         nacen en 0 = "por confirmar": la página lo enseña, deja escoger
         y lo manda a WhatsApp, pero no cobra anticipo de $0. */
      lancha: {
        activo: true,
        provisional: true,
        tiers: [
          { min: 1, max: 1, precio: 0 },
          { min: 2, max: 2, precio: 0 },
          { min: 3, max: 3, precio: 0 },
          { min: 4, max: 99, precio: 0 },
        ],
      },
    },

    /* Lo que Robert no cobra en la página: lo arregla por WhatsApp con su
       gente de confianza. Sin precio a propósito — el botón abre el chat
       con el mensaje ya escrito. */
    extras: [
      {
        id: 'masaje', activo: true, nombre: 'Masaje',
        texto: 'Masaje después de la sesión, con terapeuta de confianza. Se agenda por WhatsApp.',
        i18n: {
          en: { nombre: 'Massage', texto: 'A massage after the session, with a therapist we trust. Booked over WhatsApp.' },
          fr: { nombre: 'Massage', texto: 'Un massage après la session, avec une thérapeute de confiance. Ça se réserve sur WhatsApp.' },
          pt: { nombre: 'Massagem', texto: 'Massagem depois da sessão, com terapeuta de confiança. Combina pelo WhatsApp.' },
        },
      },
      {
        id: 'hospedaje', activo: true, nombre: 'Hospedaje',
        texto: 'Dile cuántos días vienes y Robert te ayuda a encontrar dónde quedarte cerca de los picos.',
        i18n: {
          en: { nombre: 'Where to stay', texto: 'Tell him how many days you are coming and Robert helps you find a place close to the breaks.' },
          fr: { nombre: 'Hébergement', texto: 'Dis-lui combien de jours tu viens et Robert t’aide à trouver où loger près des spots.' },
          pt: { nombre: 'Hospedagem', texto: 'Fala quantos dias você vem e o Robert te ajuda a achar onde ficar perto dos picos.' },
        },
      },
      {
        id: 'carro', activo: true, nombre: 'Renta de carro',
        texto: 'Si quieres moverte por tu cuenta, él te consigue la renta con quien ya conoce.',
        i18n: {
          en: { nombre: 'Car rental', texto: 'If you want to move around on your own, he sorts the rental with people he already knows.' },
          fr: { nombre: 'Location de voiture', texto: 'Si tu veux bouger par toi-même, il s’occupe de la location avec ses contacts.' },
          pt: { nombre: 'Aluguel de carro', texto: 'Se quiser se mover por conta própria, ele consegue o aluguel com quem já conhece.' },
        },
      },
      {
        id: 'pesca', activo: true, nombre: 'Pesca',
        texto: 'Salida de pesca con pescadores de aquí, los días que el mar no está para surfear.',
        i18n: {
          en: { nombre: 'Fishing', texto: 'A fishing trip with local fishermen, for the days the ocean is not for surfing.' },
          fr: { nombre: 'Pêche', texto: 'Sortie pêche avec les pêcheurs d’ici, les jours où la mer n’est pas pour surfer.' },
          pt: { nombre: 'Pesca', texto: 'Saída de pesca com pescadores daqui, nos dias em que o mar não está para surfar.' },
        },
      },
      {
        id: 'yoga', activo: true, nombre: 'Clases de yoga',
        texto: 'Clases de yoga para estirar antes o después del agua. Individuales o para el grupo.',
        i18n: {
          en: { nombre: 'Yoga classes', texto: 'Yoga to stretch out before or after the water. One on one or for the whole group.' },
          fr: { nombre: 'Cours de yoga', texto: 'Du yoga pour t’étirer avant ou après l’eau. En solo ou pour tout le groupe.' },
          pt: { nombre: 'Aulas de yoga', texto: 'Yoga para alongar antes ou depois da água. Individual ou para o grupo.' },
        },
      },
    ],

    /* Textos largos de la página que Robert edita desde la pestaña "Textos".
       Cada uno lleva su versión por idioma; si deja una en blanco se usa la
       de español (misma regla que Pura Vida). */
    textos: {
      hero: {
        titulo: 'Surf · Eat · Sleep · Repeat',
        sub: 'Las mejores olas locales de la costa de Oaxaca, con un guía certificado que se encarga de convertir tu surftrip en una experiencia de por vida.',
        i18n: {
          en: { titulo: 'Surf · Eat · Sleep · Repeat',
                sub: 'The best local waves around the area with a certified guide who is in charge of turning your surftrip into a lifetime experience.' },
          fr: { titulo: 'Surf · Eat · Sleep · Repeat',
                sub: 'Les meilleures vagues locales de la côte d’Oaxaca, avec un guide certifié qui transforme ton surftrip en expérience de toute une vie.' },
          pt: { titulo: 'Surf · Eat · Sleep · Repeat',
                sub: 'As melhores ondas locais da costa de Oaxaca, com um guia certificado que transforma o seu surftrip numa experiência para a vida toda.' },
        },
      },
      costa: {
        kicker: 'La costa',
        titulo: 'Donde el monte se acaba.',
        texto: 'Kilómetros de costa sin nombre, con niebla en la mañana y nadie más en el agua. El pico del día lo decide el mar.',
        puntos: [
          'Swell del sur casi todo el año',
          'Derechas largas, beach breaks y reef',
          'Muy poca gente en el agua',
          'El pico se escoge la misma mañana',
        ],
        i18n: {
          en: { kicker: 'The coast', titulo: 'Where the hills run out.',
                texto: 'Miles of unnamed coast, fog in the morning and nobody else in the water. The ocean picks the break of the day.',
                puntos: ['South swell most of the year', 'Long rights, beach breaks and reef', 'Very few people out', 'The break is called that same morning'] },
          fr: { kicker: 'La côte', titulo: 'Là où la montagne s’arrête.',
                texto: 'Des kilomètres de côte sans nom, la brume au petit matin et personne d’autre à l’eau. C’est l’océan qui choisit le spot du jour.',
                puntos: ['Houle de sud presque toute l’année', 'Droites longues, beach breaks et reef', 'Très peu de monde à l’eau', 'Le spot se décide le matin même'] },
          pt: { kicker: 'A costa', titulo: 'Onde o morro termina.',
                texto: 'Quilômetros de costa sem nome, névoa de manhã e ninguém mais na água. O pico do dia quem escolhe é o mar.',
                puntos: ['Swell de sul quase o ano todo', 'Direitas longas, beach breaks e reef', 'Muito pouca gente na água', 'O pico se escolhe na mesma manhã'] },
        },
      },
      extras: {
        kicker: 'Fuera del agua',
        titulo: 'Lo demás también lo resuelve.',
        texto: 'Nada de esto se cobra en la página: le escribes por WhatsApp, te dice precio y lo arregla con su gente.',
        i18n: {
          en: { kicker: 'Out of the water', titulo: 'He sorts the rest too.',
                texto: 'None of this is charged on the site: you message him on WhatsApp, he gives you the price and arranges it with his people.' },
          fr: { kicker: 'Hors de l’eau', titulo: 'Il s’occupe aussi du reste.',
                texto: 'Rien de tout ça ne se paie sur le site : tu lui écris sur WhatsApp, il te donne le prix et arrange ça avec ses contacts.' },
          pt: { kicker: 'Fora da água', titulo: 'O resto ele também resolve.',
                texto: 'Nada disso é cobrado no site: você fala com ele no WhatsApp, ele passa o preço e arruma com o pessoal dele.' },
        },
      },
    },

    // Se cobra por SESIÓN, no por persona.
    filmacion: {
      activo: true,
      provisional: false,
      opciones: [
        { id: 'f4', horas: 4, precio: 2000 },
        { id: 'f6', horas: 6, precio: 2500 },
      ],
      maxSesiones: 10,
    },

    /* Los textos libres llevan traducción aparte: sin esto un visitante
       francés vería el párrafo en español, porque en la base hay un solo
       valor. Robert edita el español y, si quiere, los otros tres. */
    anticipo: {
      activo: true,
      pct: 30,
      politica: 'El anticipo del 30% formaliza el trip y no es reembolsable en caso de cancelación.',
      politicaI18n: {
        en: 'The 30% deposit confirms the trip and is non-refundable if you cancel.',
        fr: 'L’acompte de 30 % confirme le trip et n’est pas remboursable en cas d’annulation.',
        pt: 'O sinal de 30% confirma o trip e não é reembolsável em caso de cancelamento.',
      },
    },

    /* El beach club es de Robert y solo abre fin de semana: de ahí sale
       "on the weekends the flow goes on". El nombre y el lugar son propios,
       así que no se traducen; el horario y el párrafo sí. */
    puravida: {
      activo: true,
      provisional: false,
      nombre: 'Pura Vida Surf & Beach Club',
      lugar: 'Hotel Casa Mystica · Playa Mojón, Oaxaca',
      instagram: 'puravida.beachclub',
      linea: 'On the weekends the flow goes on.',
      horario: 'Sábados y domingos · 12:30 a 7 pm',
      texto: 'Robert también tiene su propio beach club, y abre justo los fines de semana. Después de la sesión el trip sigue ahí: comida, bebida y el mar enfrente. Pregúntale qué entra en el tuyo.',
      i18n: {
        en: { linea: 'On the weekends the flow goes on.',
              horario: 'Saturdays and Sundays · 12:30 to 7 pm',
              texto: 'Robert also runs his own beach club, and it opens exactly on weekends. After the session the trip carries on there: food, drinks and the ocean in front of you. Ask him what is included in yours.' },
        fr: { linea: 'On the weekends the flow goes on.',
              horario: 'Samedis et dimanches · 12h30 à 19h',
              texto: 'Robert a aussi son propre beach club, et il ouvre justement le week-end. Après la session, le trip continue là-bas : à manger, à boire et l’océan en face. Demande-lui ce qui est compris dans le tien.' },
        pt: { linea: 'On the weekends the flow goes on.',
              horario: 'Sábados e domingos · 12h30 às 19h',
              texto: 'O Robert também tem o próprio beach club, e ele abre justamente nos fins de semana. Depois da sessão o trip continua lá: comida, bebida e o mar na frente. Pergunte a ele o que entra no seu.' },
      },
    },

    reglas: {
      maxPax: 12,
      maxDias: 14,
      diasVista: 180,   // hasta dónde puede reservar el cliente
      holdMin: 20,      // minutos que se aparta la fecha mientras paga
    },

    /* Fotos que Robert cambió desde el panel: { 'hero.jpg': {key, url, v} }.
       Lo que no está aquí se sirve del archivo que trae el repo. */
    fotos: {},

    /* Videos cortos que subió Robert: { hero: {key, poster, v, dur} }.
       A diferencia de las fotos aquí no hay nada de respaldo en el repo:
       el hueco sin video simplemente enseña la foto de siempre. */
    videos: {},

    bloqueos: [],   // [{fecha:'2026-08-12', nota:'Vacaciones'}] — los que pone Robert a mano
    reservas: [],
    seguridad: { fallos: 0, bloqueoHasta: 0 },
  };
}

/* ============================================================
   Fotos editables desde el panel

   La llave es el nombre del archivo que ya vive en el repo. Así la
   página no necesita saber nada nuevo: cuando Robert sube una foto,
   se reemplaza todo lo que apuntaba a ese archivo, y si la quiere
   quitar, el original sigue ahí de respaldo.
   ============================================================ */

/* `forma` es la proporción con la que la página recorta esa foto (object-fit:
   cover). El editor del panel la usa como marco por defecto, para que Robert
   vea al recortar exactamente lo que va a quedar en el sitio. Puede cambiarla
   en el editor si esa foto le queda mejor de otra forma. */
export const FOTOS = [
  { id: 'hero.jpg',        zona: 'Portada',      label: 'Ola de la portada',        forma: '16/9', nota: 'La primera que se ve al abrir. También sale en el trío de la costa.' },
  { id: 'logo-cactus.jpg', zona: 'Portada',      label: 'Miniatura para WhatsApp',  forma: '16/9', nota: 'La imagen que aparece cuando compartes el link.' },
  { id: 'robert.jpg',      zona: 'Quién te lleva', label: 'Tu foto',                forma: '3/4',  nota: 'La de la sección donde te presentas.' },
  { id: 'lifeguard.jpg',   zona: 'Quién te lleva', label: 'Certificación 1',        forma: '4/3',  nota: 'Cuadrito chico junto a tu foto.' },
  { id: 'cooperativa.jpg', zona: 'Quién te lleva', label: 'Certificación 2',        forma: '4/3',  nota: 'El otro cuadrito chico.' },
  { id: 'band-barrel.jpg', zona: 'Franjas anchas', label: 'Franja 1',               forma: '16/9', nota: 'La banda de foto que cruza toda la pantalla.' },
  { id: 'band-costa.jpg',  zona: 'Franjas anchas', label: 'Franja 2',               forma: '16/9', nota: 'La segunda banda ancha, más abajo.' },
  { id: 'verde-1.jpg',     zona: 'La costa',     label: 'Ladera vertical',          forma: '4/5',  nota: 'La foto alta del bloque verde.' },
  { id: 'verde-2.jpg',     zona: 'La costa',     label: 'Bajada al pico',           forma: '4/5',  nota: 'La de junto, más chica.' },
  { id: 'cactus.jpg',      zona: 'La costa',     label: 'Nopales',                  forma: '3/2',  nota: 'Trío de fotos de la costa.' },
  { id: 'ridge.jpg',       zona: 'La costa',     label: 'Loma al atardecer',        forma: '3/2',  nota: 'Trío de fotos y fondo de la sección de reserva.' },
  { id: 'costline.jpg',    zona: 'La costa',     label: 'Foto grande de la costa',  forma: '21/9', nota: 'La foto que cruza toda la pantalla en el bloque oscuro. Entre más abierta y con más mar, mejor.' },
  { id: 'barrel.jpg',      zona: 'Las olas',     label: 'Tubo',                     forma: '4/5',  nota: 'Sale al pasar el dedo sobre los spots.' },
  { id: 'turn.jpg',        zona: 'Las olas',     label: 'Maniobra',                 forma: '4/5',  nota: 'Fotos de los spots y de filmación.' },
  { id: 'barrel2.jpg',     zona: 'Las olas',     label: 'Tubo 2',                   forma: '4/5',  nota: 'Sale al pasar el dedo sobre los spots.' },
  { id: 'surf-rocks.jpg',  zona: 'Las olas',     label: 'Piedras 1',                forma: '4/5',  nota: 'Sale al pasar el dedo sobre los spots.' },
  { id: 'surf-rocks2.jpg', zona: 'Las olas',     label: 'Piedras 2',                forma: '4/5',  nota: 'Sale al pasar el dedo sobre los spots.' },
  { id: 'board.jpg',       zona: 'Filmación',    label: 'Tabla',                    forma: '4/5',  nota: 'Galería de filmación y spots.' },
  { id: 'film-barrel.jpg', zona: 'Filmación',    label: 'Toma de tubo',             forma: '4/5',  nota: 'Foto de banco: cámbiala por una tuya en cuanto puedas.' },
  { id: 'film-beach.jpg',  zona: 'Filmación',    label: 'Toma de playa',            forma: '4/5',  nota: 'Foto de banco: cámbiala por una tuya en cuanto puedas.' },
  { id: 'puravida-bar.jpg', zona: 'Pura Vida',   label: 'Beach club',               forma: '4/3',  nota: 'La foto del cuadro de Pura Vida.' },
];

export const FOTO_IDS = FOTOS.map((f) => f.id);

/** URL pública de una foto cambiada. `v` hace que el navegador no se quede con la vieja. */
export function fotoURL(id, meta) {
  return `/api/foto?slot=${encodeURIComponent(id)}&v=${meta.v}`;
}

/* ============================================================
   Videos cortos

   Cuatro huecos, no una galería libre: cada uno tiene un lugar fijo en la
   página y una proporción. `foto` es la imagen que ocupa ese lugar cuando no
   hay video — así el panel puede enseñar de qué hueco se trata y la página
   sabe cuál <img> tapar.
   ============================================================ */
export const VIDEOS = [
  { id: 'hero', zona: 'Portada', label: 'Video de portada', forma: '16/9', foto: 'hero.jpg',
    nota: 'Se pone encima de la foto de la portada, sin sonido y en bucle. Horizontal se ve mejor.' },
  { id: 'film-1', zona: 'Filmación', label: 'Clip 1', forma: '4/5', foto: 'film-barrel.jpg',
    nota: 'Ocupa el primer cuadro de la galería de filmación.' },
  { id: 'film-2', zona: 'Filmación', label: 'Clip 2', forma: '4/5', foto: 'turn.jpg',
    nota: 'Segundo cuadro de la galería de filmación.' },
  { id: 'film-3', zona: 'Filmación', label: 'Clip 3', forma: '4/5', foto: 'board.jpg',
    nota: 'Tercer cuadro de la galería de filmación.' },
];

export const VIDEO_IDS = VIDEOS.map((v) => v.id);

/** Segundos máximos de un clip. Más largo se corta solo al prepararlo. */
export const VIDEO_SEG_MAX = 7;

export function videoURL(id, meta) {
  return `/api/video?slot=${encodeURIComponent(id)}&v=${meta.v}`;
}

export function videoPosterURL(id, meta) {
  return meta.poster ? `/api/video?slot=${encodeURIComponent(id)}&v=${meta.v}&poster=1` : null;
}

/** Lo que el panel y la página necesitan de cada video: dónde verlo, no dónde vive. */
export function videoPublico(id, meta) {
  return {
    src: videoURL(id, meta),
    poster: videoPosterURL(id, meta),
    dur: meta.dur || 0,
    tam: meta.tam || 0,
    tipo: meta.tipo || 'video/mp4',
  };
}

export function videosPublicos(data) {
  return Object.fromEntries(
    Object.entries(data.videos || {}).map(([k, v]) => [k, videoPublico(k, v)]),
  );
}

/* ============================================================
   Lectura / escritura con control de concurrencia
   (mismo motor probado en Del Mar Barber)
   ============================================================ */

/* ------------------------------------------------------------
   Sin BLOB_READ_WRITE_TOKEN (en local, antes de crear el store)
   se guarda en un archivo temporal. Mismo contrato de etag para
   que `update()` no note la diferencia. En Vercel siempre hay
   token, así que este camino nunca corre en producción.
   ------------------------------------------------------------ */
const SIN_BLOB = !process.env.BLOB_READ_WRITE_TOKEN;
const RUTA_LOCAL = `${process.env.TMPDIR || '/tmp'}/${KEY}`;

async function fsLeer() {
  const fs = await import('node:fs/promises');
  try {
    const txt = await fs.readFile(RUTA_LOCAL, 'utf8');
    return { data: migrate(JSON.parse(txt)), etag: crypto.createHash('sha1').update(txt).digest('hex') };
  } catch {
    return { data: defaultData(), etag: null };
  }
}

async function fsEscribir(data, etag) {
  const fs = await import('node:fs/promises');
  const actual = await fsLeer();
  if (etag && actual.etag && actual.etag !== etag) {
    throw Object.assign(new Error('precondition'), { constructor: { name: 'BlobPreconditionFailedError' } });
  }
  await fs.writeFile(RUTA_LOCAL, JSON.stringify(data), 'utf8');
}

export async function read() {
  if (SIN_BLOB) return fsLeer();
  try {
    const res = await get(KEY, { access: 'private', useCache: false });
    if (!res || res.statusCode !== 200) return { data: defaultData(), etag: null };
    const txt = await new Response(res.stream).text();
    // el CDN devuelve un ETag débil (W/"..."); `ifMatch` espera el fuerte
    const etag = String(res.blob.etag || '').replace(/^W\//, '') || null;
    return { data: migrate(JSON.parse(txt)), etag };
  } catch (e) {
    if (e?.constructor?.name === 'BlobNotFoundError' || /not found/i.test(e?.message || '')) {
      return { data: defaultData(), etag: null };
    }
    throw e;
  }
}

async function write(data, etag) {
  if (SIN_BLOB) return fsEscribir(data, etag);
  const opts = {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  };
  if (etag) opts.ifMatch = etag;
  const r = await put(KEY, JSON.stringify(data), opts);
  return r.etag;
}

/**
 * Lee, aplica mutate(data) y guarda. Si otro proceso escribió en medio,
 * reintenta con los datos frescos. mutate puede lanzar {code, mensaje}.
 */
export async function update(mutate) {
  let ultimo;
  for (let intento = 0; intento < 7; intento++) {
    const { data, etag } = await read();
    const salida = await mutate(data);
    try {
      await write(data, etag);
      return salida;
    } catch (e) {
      if (e?.constructor?.name === 'BlobPreconditionFailedError') {
        ultimo = e;
        await new Promise((r) => setTimeout(r, 120 * intento + Math.random() * 500));
        continue;
      }
      throw e;
    }
  }
  throw ultimo || new Error('No se pudo guardar');
}

function migrate(d) {
  const base = defaultData();
  const out = { ...base, ...d };
  out.negocio = { ...base.negocio, ...(d.negocio || {}) };
  out.reglas = { ...base.reglas, ...(d.reglas || {}) };
  out.anticipo = { ...base.anticipo, ...(d.anticipo || {}) };
  out.anticipo.politicaI18n = { ...base.anticipo.politicaI18n, ...(d.anticipo?.politicaI18n || {}) };
  out.puravida = { ...base.puravida, ...(d.puravida || {}) };
  out.puravida.i18n = Object.fromEntries(['en', 'fr', 'pt'].map((k) => [
    k, { ...base.puravida.i18n[k], ...(d.puravida?.i18n?.[k] || {}) },
  ]));
  out.seguridad = { ...base.seguridad, ...(d.seguridad || {}) };
  out.filmacion = { ...base.filmacion, ...(d.filmacion || {}) };
  if (!Array.isArray(out.filmacion.opciones) || !out.filmacion.opciones.length) {
    out.filmacion.opciones = base.filmacion.opciones;
  }
  const s = d.servicios || {};
  out.servicios = {
    trip: { ...base.servicios.trip, ...(s.trip || {}) },
    guia: { ...base.servicios.guia, ...(s.guia || {}) },
    lessons: { ...base.servicios.lessons, ...(s.lessons || {}) },
    lancha: { ...base.servicios.lancha, ...(s.lancha || {}) },
  };
  for (const k of ['trip', 'guia', 'lancha']) {
    if (!Array.isArray(out.servicios[k].tiers) || !out.servicios[k].tiers.length) {
      out.servicios[k].tiers = base.servicios[k].tiers;
    }
  }

  /* Extras: se conservan los que Robert haya editado, con la forma completa.
     Si el archivo trae basura o viene vacío, vuelven los de fábrica. */
  const ex = Array.isArray(d.extras) ? d.extras : [];
  out.extras = (ex.length ? ex : base.extras).map((e, i) => {
    const bse = base.extras.find((b) => b.id === e.id) || base.extras[i] || base.extras[0];
    return {
      id: String(e.id || bse.id),
      activo: e.activo !== false,
      nombre: String(e.nombre ?? bse.nombre),
      texto: String(e.texto ?? bse.texto),
      i18n: Object.fromEntries(['en', 'fr', 'pt'].map((k) => [k, {
        nombre: String(e.i18n?.[k]?.nombre ?? bse.i18n[k].nombre),
        texto: String(e.i18n?.[k]?.texto ?? bse.i18n[k].texto),
      }])),
    };
  }).slice(0, 12);

  /* Textos largos: se mezclan bloque por bloque para que un archivo viejo
     (sin `textos`) siga estrenando los de fábrica sin romper la página. */
  const tx = d.textos || {};
  out.textos = {};
  for (const bloque of Object.keys(base.textos)) {
    const b = base.textos[bloque];
    const v = tx[bloque] || {};
    out.textos[bloque] = {
      ...b, ...v,
      puntos: Array.isArray(v.puntos) ? v.puntos.slice(0, 6).map(String) : b.puntos,
      i18n: Object.fromEntries(['en', 'fr', 'pt'].map((k) => [k, {
        ...b.i18n[k], ...(v.i18n?.[k] || {}),
        ...(b.puntos ? { puntos: Array.isArray(v.i18n?.[k]?.puntos) ? v.i18n[k].puntos.slice(0, 6).map(String) : b.i18n[k].puntos } : {}),
      }])),
    };
  }
  out.fotos = {};
  for (const [k, v] of Object.entries(d.fotos || {})) {
    if (FOTO_IDS.includes(k) && v && v.key) out.fotos[k] = v;
  }
  out.videos = {};
  for (const [k, v] of Object.entries(d.videos || {})) {
    if (VIDEO_IDS.includes(k) && v && v.key) out.videos[k] = v;
  }
  out.reservas = Array.isArray(d.reservas) ? d.reservas : [];
  out.bloqueos = Array.isArray(d.bloqueos) ? d.bloqueos : [];
  return out;
}

/* ============================================================
   Fecha / hora en horario de Huatulco
   ============================================================ */

export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function esISO(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Las fechas que ocupa una reserva: `dias` días corridos desde `inicio`. */
export function fechasDe(inicio, dias) {
  return Array.from({ length: Math.max(1, dias) }, (_, i) => sumarDias(inicio, i));
}

/** ¿La fecha cae en la temporada de clases? El rango puede cruzar el año (dic → feb). */
export function enTemporada(iso, mesInicio, mesFin) {
  const m = Number(String(iso).slice(5, 7));
  const ini = Number(mesInicio) || 1;
  const fin = Number(mesFin) || 12;
  return ini <= fin ? m >= ini && m <= fin : m >= ini || m <= fin;
}

/* ============================================================
   Disponibilidad — un solo grupo por día
   ============================================================ */

/** Una reserva pendiente solo aparta la fecha mientras su hold siga vivo. */
export function reservaVigente(r) {
  if (r.estado === 'pagada' || r.estado === 'completada') return true;
  if (r.estado === 'pendiente') return Number(r.holdHasta || 0) > Date.now();
  return false; // cancelada / vencida
}

/**
 * Mapa de fechas ocupadas → motivo ('pagada' | 'hold' | 'robert').
 * El pago manda: si un día está pagado, ese motivo gana sobre un hold.
 */
export function diasOcupados(data) {
  const mapa = new Map();
  for (const b of data.bloqueos) {
    if (esISO(b.fecha)) mapa.set(b.fecha, 'robert');
  }
  for (const r of data.reservas) {
    if (!reservaVigente(r)) continue;
    const motivo = r.estado === 'pendiente' ? 'hold' : 'pagada';
    for (const f of r.fechas || []) {
      if (motivo === 'pagada' || !mapa.has(f)) mapa.set(f, motivo);
    }
  }
  return mapa;
}

/** Fechas del rango pedido que ya están tomadas, ignorando una reserva propia. */
export function choques(data, fechas, folioPropio = null) {
  const mapa = new Map();
  for (const b of data.bloqueos) if (esISO(b.fecha)) mapa.set(b.fecha, 'robert');
  for (const r of data.reservas) {
    if (folioPropio && r.folio === folioPropio) continue;
    if (!reservaVigente(r)) continue;
    const motivo = r.estado === 'pendiente' ? 'hold' : 'pagada';
    for (const f of r.fechas || []) if (motivo === 'pagada' || !mapa.has(f)) mapa.set(f, motivo);
  }
  return fechas.filter((f) => mapa.has(f)).map((f) => ({ fecha: f, motivo: mapa.get(f) }));
}

/* ============================================================
   Cotización — la única fuente de verdad del precio.
   El navegador calcula lo mismo para mostrarlo, pero lo que se
   cobra siempre sale de aquí.
   ============================================================ */

export function precioTier(tiers, pax) {
  const t = tiers.find((x) => pax >= x.min && pax <= x.max) || tiers[tiers.length - 1];
  return Number(t?.precio) || 0;
}

const ETIQUETAS = {
  es: {
    trip: 'Surf trip completo',
    guia: 'Solo guía (traigo carro)',
    lancha: 'Surf trip en lancha',
    lessons: 'Surf lessons',
    film: 'Filmación',
    porPax: (p, d, r) => `${p} ${p === 1 ? 'persona' : 'personas'} × ${d} ${d === 1 ? 'día' : 'días'} × $${miles(r)}`,
    porClase: (p, d, r) => `${p} ${p === 1 ? 'persona' : 'personas'} × ${d} ${d === 1 ? 'clase' : 'clases'} × $${miles(r)}`,
    porSesion: (n, h, r) => `${n} ${n === 1 ? 'sesión' : 'sesiones'} de ${h} h × $${miles(r)}`,
  },
  en: {
    trip: 'Full surf trip',
    guia: 'Guide only (I bring a car)',
    lancha: 'Surf trip by boat',
    lessons: 'Surf lessons',
    film: 'Filming',
    porPax: (p, d, r) => `${p} ${p === 1 ? 'person' : 'people'} × ${d} ${d === 1 ? 'day' : 'days'} × $${miles(r)}`,
    porClase: (p, d, r) => `${p} ${p === 1 ? 'person' : 'people'} × ${d} ${d === 1 ? 'class' : 'classes'} × $${miles(r)}`,
    porSesion: (n, h, r) => `${n} ${n === 1 ? 'session' : 'sessions'} of ${h} h × $${miles(r)}`,
  },
  fr: {
    trip: 'Surf trip complet',
    guia: 'Guide seul (j’ai une voiture)',
    lancha: 'Surf trip en bateau',
    lessons: 'Cours de surf',
    film: 'Vidéo',
    porPax: (p, d, r) => `${p} ${p === 1 ? 'personne' : 'personnes'} × ${d} ${d === 1 ? 'jour' : 'jours'} × $${miles(r)}`,
    porClase: (p, d, r) => `${p} ${p === 1 ? 'personne' : 'personnes'} × ${d} ${d === 1 ? 'cours' : 'cours'} × $${miles(r)}`,
    porSesion: (n, h, r) => `${n} ${n === 1 ? 'session' : 'sessions'} de ${h} h × $${miles(r)}`,
  },
  pt: {
    trip: 'Surf trip completo',
    guia: 'Só guia (tenho carro)',
    lancha: 'Surf trip de lancha',
    lessons: 'Aulas de surf',
    film: 'Filmagem',
    porPax: (p, d, r) => `${p} ${p === 1 ? 'pessoa' : 'pessoas'} × ${d} ${d === 1 ? 'dia' : 'dias'} × $${miles(r)}`,
    porClase: (p, d, r) => `${p} ${p === 1 ? 'pessoa' : 'pessoas'} × ${d} ${d === 1 ? 'aula' : 'aulas'} × $${miles(r)}`,
    porSesion: (n, h, r) => `${n} ${n === 1 ? 'sessão' : 'sessões'} de ${h} h × $${miles(r)}`,
  },
};

/** Servicios que se pueden cotizar y reservar. */
export const SERVICIOS = ['trip', 'guia', 'lessons', 'lancha'];

const SIN_PRECIO = {
  es: 'Ese servicio todavía no tiene precio publicado. Ciérralo con Robert por WhatsApp.',
  en: 'That service does not have a published price yet. Sort it out with Robert on WhatsApp.',
  fr: 'Ce service n’a pas encore de prix publié. Arrange ça avec Robert sur WhatsApp.',
  pt: 'Esse serviço ainda não tem preço publicado. Combine com o Robert pelo WhatsApp.',
};

export const IDIOMAS = ['es', 'en', 'fr', 'pt'];
export const normLang = (l) => (IDIOMAS.includes(l) ? l : 'en');

const miles = (n) => Number(n || 0).toLocaleString('en-US');

/**
 * @returns {{lineas:Array, total:number, anticipo:number, saldo:number, pct:number}}
 * Lanza {code, mensaje} si la combinación no es válida.
 */
export function cotizar(data, p, lang = 'es') {
  const L = ETIQUETAS[normLang(lang)] || ETIQUETAS.en;
  const servicio = SERVICIOS.includes(p.servicio) ? p.servicio : 'trip';
  const cfg = data.servicios[servicio];
  if (!cfg || cfg.activo === false) throw { code: 400, mensaje: 'Ese servicio no está disponible.' };

  const pax = clamp(p.pax, 1, data.reglas.maxPax, 1);
  const dias = clamp(p.dias, 1, data.reglas.maxDias, 1);
  const lineas = [];

  if (servicio === 'lessons') {
    if (!enTemporada(p.fecha, cfg.mesInicio, cfg.mesFin)) {
      throw { code: 400, mensaje: 'Las clases solo se dan en temporada. Escoge una fecha dentro del rango.' };
    }
    const r = Number(cfg.precio) || 0;
    lineas.push({ label: L.lessons, detail: L.porClase(pax, dias, r), monto: r * pax * dias });
  } else {
    const r = precioTier(cfg.tiers, pax);
    lineas.push({ label: L[servicio], detail: L.porPax(pax, dias, r), monto: r * pax * dias });
  }

  // Filmación: por sesión, no por persona
  if (p.film && data.filmacion.activo !== false) {
    const op = data.filmacion.opciones.find((o) => o.id === p.film.opcion);
    if (!op) throw { code: 400, mensaje: 'Esa opción de filmación no existe.' };
    const n = clamp(p.film.sesiones, 1, data.filmacion.maxSesiones || 10, 1);
    lineas.push({ label: L.film, detail: L.porSesion(n, op.horas, op.precio), monto: Number(op.precio) * n });
  }

  const total = lineas.reduce((a, l) => a + l.monto, 0);
  /* Un servicio sin precio (la lancha, mientras Robert no lo ponga) daría un
     anticipo de $0: no se cobra por la página, se cierra por WhatsApp. */
  if (total <= 0) throw { code: 400, mensaje: SIN_PRECIO[normLang(lang)] || SIN_PRECIO.en };

  const pct = data.anticipo.activo ? clamp(data.anticipo.pct, 0, 100, 30) : 0;
  const anticipo = Math.round((total * pct) / 100);
  return { lineas, total, anticipo, saldo: total - anticipo, pct };
}

/* ============================================================
   Utilidades
   ============================================================ */

export function folioNuevo(reservas) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let f;
  do {
    f = 'GS-' + Array.from({ length: 4 }, () => abc[crypto.randomInt(abc.length)]).join('');
  } while (reservas.some((r) => r.folio === f));
  return f;
}

export function soloDigitos(s) { return String(s || '').replace(/\D/g, ''); }

export function limpiar(s, max = 80) {
  return String(s ?? '').replace(/[\x00-\x1f<>]/g, '').trim().slice(0, max);
}

export function clamp(v, min, max, def) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/* ============================================================
   Sesión del panel
   ============================================================ */

function secreto(pin) {
  return crypto.createHash('sha256').update('gosurf::' + pin).digest('hex');
}

export function crearToken(pin) {
  const exp = Date.now() + 12 * 3600 * 1000;
  const firma = crypto.createHmac('sha256', secreto(pin)).update(String(exp)).digest('hex').slice(0, 32);
  return `${exp}.${firma}`;
}

export function tokenValido(token, pin) {
  if (!token || !token.includes('.')) return false;
  const [exp, firma] = token.split('.');
  if (!exp || !firma || Number(exp) < Date.now()) return false;
  const esperado = crypto.createHmac('sha256', secreto(pin)).update(String(exp)).digest('hex').slice(0, 32);
  if (firma.length !== esperado.length) return false;
  return crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperado));
}

/* ============================================================
   Helpers HTTP
   ============================================================ */

export function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function leerBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/** Lo que la página pública puede ver: precios y reglas, nunca reservas ni PIN. */
export function publico(data) {
  return {
    negocio: data.negocio,
    servicios: data.servicios,
    extras: (data.extras || []).filter((e) => e.activo !== false),
    textos: data.textos,
    filmacion: data.filmacion,
    anticipo: {
      activo: data.anticipo.activo,
      pct: data.anticipo.pct,
      politica: data.anticipo.politica,
      politicaI18n: data.anticipo.politicaI18n,
    },
    puravida: data.puravida,
    fotos: Object.fromEntries(Object.entries(data.fotos || {}).map(([k, v]) => [k, fotoURL(k, v)])),
    videos: videosPublicos(data),
    reglas: data.reglas,
    pagoActivo: Boolean(process.env.MP_ACCESS_TOKEN),
  };
}
