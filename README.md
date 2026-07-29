# GO SURF HUATULCO — Robert

Landing + motor de reservas por WhatsApp para Robert (@gosurf.huatulco), guía de surf **y filmer**.

Un solo archivo: `index.html`. Sin build, sin dependencias que instalar.

## Ver en local

```bash
python3 serve.py
```

Luego abre <http://localhost:3540>

## Lo que hay que cambiar antes de publicar

### 1. Número de WhatsApp (obligatorio)

En `index.html`, dentro de `const CONFIG`:

```js
whatsapp: '529541494680',   // ← número real de Robert
```

Formato internacional, sin `+`, sin espacios, sin guiones.
México en WhatsApp: `52` + lada + número, **sin el `1` extra** (ese `1` es de llamadas
telefónicas viejas; en links `wa.me` rompe el número). Ej. `529581234567`.

Ese número recibe **todas** las reservas.

### 2. Precios

También en `CONFIG`. Son por día y por grupo de hasta 2 personas:

| id      | Experiencia        | USD/día |
|---------|--------------------|---------|
| `guide` | Surf Guiding       | 130     |
| `trip`  | Private Surf Trip  | 230     |
| `film`  | Filming Session    | 190     |
| `full`  | Full Experience    | 340     |

Extras: tabla 25, drone 60, edit largo 90, traslado aeropuerto 45 (una vez), comida 18 (por persona/día).
Persona extra: `extraPax: 45` por día.
Descuentos: 3+ días 10%, 5+ días 15% (`CONFIG.discounts`).

**Todos son estimados que inventé para que la demo funcione.** Confírmalos con Robert.

### 3. Fotos

Ahorita usa fotos de Unsplash (libres de uso) como relleno. **Hay que cambiarlas por el
contenido de Robert** — es el punto entero del sitio, él es el filmer.

Dónde:

- **Hero**: `<img id="heroImg" src="...">`
- **Retrato de Robert**: dentro de `.shot-portrait` (tiene un letrero que dice que es temporal — quítalo)
- **Banda entre secciones**: `<div class="band">`
- **Grid de filmación**: `CONFIG.filmImgs` (4 fotos)
- **Hover de spots**: `CONFIG.spotImgs` (9 fotos, una por pico)
- **Hover de experiencias**: campo `img` de cada entrada en `CONFIG.experiences`
- **CTA final**: dentro de `.final .bg`

Lo más simple: crear carpeta `fotos/` y cambiar las URLs por rutas locales
(`fotos/hero.jpg`, etc.). Recomendado ≤ 400 KB por foto.

### 4. Datos que faltan confirmar con Robert

- Años de experiencia (dice `12+`)
- Los 9 spots y su dificultad — están basados en picos reales de la costa, pero
  hay que validar cuáles trabaja de verdad y si quiere publicarlos
- Testimonios: los 3 que están son inventados. Poner reseñas reales o quitar la sección
- Si el drone va incluido en Full Experience o siempre es extra

## Cómo llega la reserva

El cliente contesta 5 pasos → el sitio arma un mensaje y abre WhatsApp con todo
prellenado hacia el número de Robert:

```
*NUEVA RESERVA — GO SURF HUATULCO*

*CLIENTE*
Nombre: Jenna Kowalski
Teléfono: +1 619 555 0134
Viene de: San Diego, CA
Se hospeda en: Airbnb en La Crucecita

*EL TRIP*
Experiencia: Full Experience
Nivel: Intermedio
Primer día: 15 ago 2026
Días: 5
Personas: 3
Extras: Drone, Traslado aeropuerto
Vuelo: AM 123 (llega 14:35)

*COBRO*
Descuento: -$353 USD (15%)
Estimado: $1,997 USD

*NOTAS*
Traigo mi shortboard 6'0"…
```

No hay cobro en línea. Robert lee, confirma disponibilidad y da luz verde.

**Sin emojis a propósito.** Los emoji tipo 👤 📱 están fuera del BMP (pares surrogados) y
la pantalla intermedia de `wa.me` los rompe: salen como `�`. Con texto plano + negritas
se ve igual de ordenado y funciona en cualquier cliente. Si algún día se quieren íconos,
solo sirven los del BMP (`✈`, `⏱`, `★`).

### Vuelo de llegada

El campo de vuelo aparece **solo** si el cliente marcó el extra "Traslado aeropuerto",
y ahí sí es obligatorio (sin vuelo Robert no sabe cuándo ir a HUX). Si desmarca el extra,
el campo se oculta y se limpia solo.

## Idiomas

ES / EN completo, con toggle en el nav. Detecta el idioma del navegador y recuerda
la elección en `localStorage`. El mensaje de WhatsApp también sale en el idioma
en que el cliente llenó el formulario.

## Deploy

Es un archivo estático. Subir `index.html` (+ carpeta `fotos/`) por FTP a
maxitravel.mx en una subcarpeta, o a Netlify si quiere dominio propio.
`serve.py` es solo para ver en local, no se sube.
