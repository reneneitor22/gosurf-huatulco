# GO SURF — Roberto Alonso Cisneros (Huatulco)

**En vivo: <https://gosurf-huatulco.vercel.app>** · panel en `/admin`

Landing + motor de reservas para Robert (@gosurf.huatulco), guía de surf certificado
**y filmer**. Cobra el anticipo por Mercado Pago, bloquea el día pagado, y tiene panel
para que Robert mueva precios sin tocar código.

```
index.html      la página
admin.html      el panel de Robert (PIN)
api/            funciones de Vercel
lib/db.js       datos, precios y disponibilidad — la fuente de verdad
lib/mp.js       Mercado Pago
dev.mjs         servidor local
```

## Ver en local

```bash
npm install
node dev.mjs
```

Luego abre <http://localhost:3541> y el panel en <http://localhost:3541/admin.html>.

Sin `BLOB_READ_WRITE_TOKEN` los datos se guardan en un archivo temporal, así que el
flujo completo se puede probar sin haber creado el store. Sin `MP_ACCESS_TOKEN` la
página esconde el botón de pagar y todo se cierra por WhatsApp: el sitio nunca queda
roto por falta de credenciales.

## Identidad (viene del deck de Robert)

Paleta y tipografía sacadas de su presentación GO SURF, no inventadas:

| Token | Hex | Uso |
|---|---|---|
| `--bone` | `#EDEFE9` | fondo principal (el del deck) |
| `--cream` | `#FBF2E9` | fondo cálido (hoja de precios) |
| `--brown` / `--fg` | `#5A4833` | texto y títulos |
| `--sage` | `#55655A` | acento (SURF EAT SLEEP REPEAT) |
| `--sage-d` | `#3D4941` | bloques oscuros (footer) |

Tipografía: **Jost** (geométrica ligera, caja alta con tracking amplio) para logo,
títulos y etiquetas; **Poppins** para texto corrido. El logo GO SURF está reconstruido
en SVG (círculo + firma) para que escale y no dependa de un PNG.

**Capa botánica** (a Robert le gusta lo verde): el patrón de curvas orgánicas detrás de
las secciones es el mismo del deck (`.sec::before`, SVG inline); hay nopales de línea
decorativos (`.nopal`), la sección "El lugar" con fotos de monte, y la banda delgada de
nopales antes de filmación. Todo con sus propias fotos, sin stock.

## Contenido real ya cargado

- **Bio de Robert** literal de su deck: 31 años, nacido y criado en Bahías de Huatulco,
  empezó a surfear a los 15, guía local y filmer, miembro de la Cooperativa de Surf de
  Huatulco, certificado salvavidas + First Aid, RCP, Stop the Bleed, Basic Life Support,
  Trauma / Surfers Awareness in Lifesaving Techniques.
- **Fotos** suyas, extraídas del PDF, en `fotos/`.
- **Contacto**: gosurfmexico@gmail.com · +52 954 149 4680 · @gosurf.huatulco

## Precios (los suyos, no inventados)

Por **persona** y por **día de surf**, en MXN — `CONFIG.tiers`:

| Grupo | MXN / persona / día |
|---|---|
| 1 persona | 4,000 |
| 2 personas | 3,600 |
| 3 personas | 3,000 |
| 4 o más | 2,500 |

Incluye (los 7 conceptos de su hoja): transportación diaria a y desde el spot, sesiones
de surf todo el día, guía certificado en primeros auxilios, carpas para sombra, fruta,
café y snacks, bebidas sin alcohol, botiquín de primeros auxilios.

La **filmación NO va incluida**: se agrega en el paso 4 y se cobra **por sesión, no por
persona** — $2,500 la de 6 horas, $2,000 la mínima de 4 horas.

Además del trip completo hay otros dos servicios, con precio **provisional** hasta que
Robert nos dé el suyo (salen marcados "Precio por confirmar" en la página):

| Servicio | Precio provisional | Unidad |
|---|---|---|
| Solo guía (el cliente trae carro) | 2500 / 2200 / 1800 / 1500 | persona · día |
| Surf lessons — solo diciembre a febrero | 1,200 | persona · clase |
| **Surf trip en lancha** | **en blanco** — lo pone Robert | persona · día |

El de la **lancha nace sin precio a propósito**: en cero, la página lo enseña como
"precio por confirmar", deja armar el trip y manda todo a WhatsApp — no cobra anticipo
de $0. `cotizar()` en `lib/db.js` rechaza cualquier reserva cuyo total dé 0, así que el
candado no depende del navegador. En cuanto Robert escribe los precios en el panel se
reserva y se paga como los demás, sin tocar código.

El total es la suma de las líneas. Sobre ese total se cobra el **anticipo del 30 %**,
que no es reembolsable. Todo se edita desde el panel.

## Número de WhatsApp

Se edita desde el panel (Ajustes → Contacto). El respaldo, por si la API no contesta,
está en `CFG.negocio.whatsapp` en `index.html` y en `defaultData()` en `lib/db.js`:

```js
whatsapp: '529541494680',   // +52 954 149 4680
```

Formato internacional, sin `+`, sin espacios. México: `52` + lada + número, **sin el `1`
extra** (en links `wa.me` ese `1` rompe el número).

## Fotos

Todas en `fotos/`, sacadas del PDF de Robert (máx. 800 px de origen; hero, band y CTA
final van reescalados y afilados). Si Robert manda los originales, reemplazar respetando
nombres:

| Archivo | Dónde |
|---|---|
| `hero.jpg` | hero |
| `robert.jpg` | retrato en la sección Robert |
| `lifeguard.jpg`, `cooperativa.jpg` | mini fotos de certificaciones |
| `barrel.jpg` | banda entre secciones |
| `barrel2.jpg`, `turn.jpg`, `board.jpg` | grid de filmación (`CONFIG.gallery`) |
| `crew.jpg` | cuadro Pura Vida |
| `verde-1.jpg`, `verde-2.jpg` | sección "El lugar" (monte verde) |
| `cactus.jpg` | tira de nopales + banda `.band.thin` |
| `band-barrel.jpg`, `film-barrel.jpg`, `film-beach.jpg` | **temporales de Unsplash** (banda + 2 del grid) — cambiar por las de Robert en alta |
| `ridge.jpg` | CTA final |
| `logo-cactus.jpg` | og:image |

### Cambiarlas desde el panel

Robert puede reemplazar cualquiera de las 20 fotos desde **Fotos** sin tocar el repo.
La llave de cada una es el nombre del archivo original (`hero.jpg`, `robert.jpg`…), así
que al subir una nueva se reescribe todo lo que apuntaba a ese archivo: las `<img>` ya
puestas, los `data-img` del hover y las listas de `CONFIG`. "Quitar" borra la suya y
vuelve la del repo, que nunca se toca.

El navegador achica la foto a 2000 px de lado y JPEG 0.82 antes de subirla (las del
teléfono pesan más que el límite de 4.5 MB del cuerpo de una función), y usa
`createImageBitmap(..., {imageOrientation:'from-image'})` para que las verticales no
se suban acostadas.

Las fotos nuevas viven en el mismo Blob **privado** que los datos y se sirven por
`/api/foto?slot=hero.jpg&v=…`, no con URL pública: así no hay que abrir el store. El `v`
cambia con cada subida, por eso la respuesta va con `immutable` y un año de caché y aun
así el cambio se ve al instante. La lista de slots (id, zona, texto de ayuda) vive en
`FOTOS` de `lib/db.js` y es también la lista blanca del endpoint. Sin
`BLOB_READ_WRITE_TOKEN` (local) se guardan en una carpeta temporal.

## Videos

Cuatro huecos, no una galería libre: **portada** (16/9, encima de la foto del hero) y
**tres clips** que toman el lugar de los primeros cuadros de la galería de filmación.
La lista vive en `VIDEOS` de `lib/db.js` y es también la lista blanca del endpoint.
Hueco sin video = la foto de siempre; nada se rompe si Robert no sube ninguno.

Se ven **en silencio, en bucle y sin controles**. Los de filmación solo corren mientras
están en pantalla (un `IntersectionObserver` los pausa al salir): tres videos en bucle a
la vez calientan el teléfono. Si el navegador no deja arrancar el de portada —segundo
plano, bajo consumo— **no se quita**: se reintenta al volver al frente, y mientras se ve
su portada. Quitarlo al primer `play()` rechazado dejaba la portada sin video.

### Lo que hace el panel antes de subir

Un clip del teléfono pesa 40 MB y viene en H.265, que solo se ve en iPhone. El panel lo
**vuelve a grabar**: lo pinta cuadro por cuadro en un canvas a 1280 px de ancho y lo
graba con `MediaRecorder` (MP4/H.264 si el navegador puede, WEBM si no). Eso arregla de
un golpe peso, códec y duración —la grabación se corta sola a los **7 s** de
`VIDEO_SEG_MAX`—. Tarda lo que dura el clip porque se reproduce en tiempo real: no hay
otra forma sin un servidor con ffmpeg. Si el archivo ya viene chico (≤6 MB), corto y
compatible, se sube tal cual.

El dibujo va con `setInterval`, no con `requestAnimationFrame`: si Robert se cambia de
app a media subida, rAF se congela y la grabación se queda colgada para siempre.

También se saca una **portada** del primer cuadro y viaja en la misma petición final:
sin ella iOS enseña negro hasta que decide cargar el video.

### Cómo viaja y cómo se sirve

El cuerpo de una función de Vercel no pasa de 4.5 MB, así que el navegador parte el
archivo en pedazos de 2 MB (`accion=parte` → `tmp/`) y `accion=fin` los pega, comprueba
por **bytes** que sea MP4 o WEBM de verdad (rechaza `.mov` de iPhone y cualquier cosa con
`hvc1`/`hev1`) y lo publica. Si alguien abandona a media subida quedan pedazos huérfanos:
los barre el siguiente `fin` (más de 2 h).

Se sirve por `/api/video?slot=hero&v=…` **con rangos**: Safari pide `Range` antes de
tocar un `<video>` y si el servidor contesta 200 con todo, no reproduce. Y como la
respuesta tampoco puede pasar de 4.5 MB, cada tajada se recorta a 3 MB aunque el
navegador pida "de aquí al final" — un archivo de 8 MB se entrega en tres tajadas, byte
por byte idéntico al original (probado). La portada sale del mismo endpoint con
`&poster=1`.

## Pendientes con Robert

- **Credenciales de Mercado Pago** (Access Token). Sin ellas no se cobra en línea.
- **Precio real de solo-guía** y de **surf lessons**: los de ahora son provisionales.
- **Fotos del Pura Vida Beach Club** — el cuadro usa `crew.jpg` de relleno.
- **Si los del surf trip tienen algo del club incluido** (comida, bebida, descuento).
- **Testimonios**: los 3 que están son inventados. Pedir reseñas reales o quitar la sección.
- Fotos en alta (las del PDF están a 800 px).

## La costa y los extras

Donde antes iba una galería de cinco olas, ahora hay **una sola foto de la costa a
pantalla completa** (`costline.jpg`, cambiable desde el panel) con el texto encima y
**cuatro puntos**, nada más. Lo "místico" no es un filtro: es una imagen grande, dos
capas de niebla y una bruma que sube y baja lentísimo, apagada con `prefers-reduced-motion`.

Debajo va **Fuera del agua**: masaje, hospedaje, renta de carro, pesca y
clases de yoga. **Ninguno lleva precio** — cada tarjeta abre el WhatsApp de Robert con el
mensaje ya escrito diciendo por cuál pregunta. La lista vive en `extras` de `lib/db.js`,
se edita entera desde el panel (nombre, descripción y si se muestra) y va en los cuatro
idiomas.

## Pura Vida Surf & Beach Club

El bloque verde no es del surf trip: es **el beach club de Robert**, dentro del Hotel Casa
Mystica en Playa Mojón, y **abre solo sábados y domingos de 12:30 a 7 pm**. De ahí sale
"on the weekends the flow goes on" — después de la sesión el trip sigue ahí.
Instagram [@puravida.beachclub](https://www.instagram.com/puravida.beachclub/).

Nombre, lugar, horario, Instagram y el párrafo se editan desde el panel; el horario y el
párrafo tienen versión por idioma, el nombre y el lugar no (son propios).

## El panel de Robert

`/admin.html`, con PIN. Seis pestañas: **Reservas** (con quién pagó y cuánto),
**Calendario**, **Precios** (tiers, solo-guía, lancha, filmación, lessons y sus meses, y
el % de anticipo), **Textos**, **Fotos** (cambiar cualquier foto de la página) y
**Ajustes** (contacto, Pura Vida Beach Club, reglas y PIN).

En el **Calendario**, tocar un día ya no lo bloquea de un golpe: abre una ventana con lo
que se puede hacer con él —bloquear con motivo, bloquear una racha de días de un jalón,
liberar, o brincar a la reserva que lo tiene apartado—. El rango se resuelve en una sola
escritura del lado del servidor (`accion=bloqueo` con `desde`/`hasta`).

**Textos** es lo que dice la página: la portada, el bloque de la costa (con sus cuatro
puntos) y los extras de "Fuera del agua". Un solo selector de idioma manda sobre toda la
pestaña, y se edita sobre una copia que se manda completa al guardar: cambiar de idioma a
media edición no pierde lo escrito. Los cuatro idiomas vienen ya traducidos de fábrica.

PIN inicial **1234**. Se cambia en **Ajustes → PIN del panel**, que pide el PIN actual y
va aparte del botón de "Guardar ajustes" (para no cambiarlo sin querer). Cinco intentos
fallidos bloquean 10 minutos.

## Cómo llega la reserva

5 pasos. Al final el cliente puede pagar el anticipo o mandarle todo a Robert por
WhatsApp. El mensaje sale con el desglose completo y **dice si ya se cobró y cuánto**:

```
*NUEVA RESERVA — GO SURF*

*CLIENTE*
Nombre: Jenna Kowalski
Teléfono: +1 619 555 0134
Viene de: San Diego, CA
Se hospeda en: Airbnb en La Crucecita

*EL TRIP*
Personas: 3
Primer día: 15 ago 2026
Días: 5
Nivel: Intermedio

*COBRO*
Surf trip completo (3 personas × 5 días × $3,000): $45,000 MXN
Filmación (2 sesiones · 6 horas × $2,500): $5,000 MXN
Total: $50,000 MXN
Anticipo (30%): $15,000 MXN — PAGADO por Mercado Pago
Resta el día del trip: $35,000 MXN
Folio: GS-4K7P

*NOTAS*
Traigo mi shortboard 6'0"…
```

Si todavía no paga, esa línea dice `NO pagado todavía`. Y si el cliente escoge un día ya
apartado, el mismo mensaje sale encabezado con **"Vi que está bloqueado pero me gustaría
ir"** — un día ocupado no es un callejón sin salida.

**Sin emojis a propósito.** Los emoji tipo 👤 📱 están fuera del BMP (pares surrogados) y
la pantalla intermedia de `wa.me` los rompe: salen como `�`. Si algún día se quieren
íconos, solo sirven los del BMP (`✈`, `⏱`, `★`).

## Idiomas

**Español, inglés, francés y portugués**, con selector en el nav. Detecta el idioma del
navegador y recuerda la elección en `localStorage`; si el navegador viene en otro idioma,
cae a inglés. El mensaje de WhatsApp y los errores del servidor salen en el idioma en que
el cliente llenó el formulario, y el desglose de precios se arma traducido en `cotizar()`.

Si a un idioma le falta una clave, cae a **inglés** antes que a español.

Los textos libres que edita Robert (el cuadro Pura Vida y la política de cancelación) no
son traducibles solos: en la base hay un valor por idioma, y el panel los edita con
pestañas Español / English / Français / Português. El español es la base; lo que quede en
blanco usa el español.

## Cómo funciona el cobro

Tres cosas sostienen todo, y conviene no tocarlas sin entenderlas:

1. **El precio se recalcula en el servidor.** `cotizar()` en `lib/db.js` es la única
   fuente de verdad. Lo que manda el navegador solo sirve para pintar la pantalla.
2. **Hold de 20 minutos.** Al crear la reserva se aparta la fecha mientras el cliente
   paga. Si no paga, vence sola. Sin esto, dos personas pagan el mismo día.
3. **El webhook no le cree a Mercado Pago.** Del cuerpo de la notificación solo se saca
   el id del pago; el estado se consulta contra su API con nuestro token. Un POST falso
   a `/api/webhook` no puede marcar nada como pagado.

Si dos pagos aprobados caen sobre el mismo día, se cobran los dos y la reserva se marca
`conflicto` para que Robert lo vea en el panel: perder el registro de un pago recibido
sería peor que avisarle que hay dos grupos encimados.

## Deploy

Ya no es estático: necesita Vercel por las funciones de `api/`.

El Blob ya está creado y conectado (`gosurf`, `store_vZpuqgzruQyO6qLO`, privado, iad1).
Para desplegar cambios:

```bash
vercel deploy --prod --yes
```

Cuando Robert mande sus credenciales de Mercado Pago, **no hay que tocar código**:

```bash
vercel env add MP_ACCESS_TOKEN production
vercel deploy --prod --yes
```

El botón de pagar aparece solo en cuanto la variable existe (`pagoActivo` sale de ahí).

**Ojo con `cleanUrls`:** redirige `/admin.html` a `/admin`, así que las reglas de
`headers` tienen que apuntar a `/admin` o no se aplican. Ya mordió una vez.

`serve.py` quedó del sitio estático anterior y ya no sirve; usar `dev.mjs`.
