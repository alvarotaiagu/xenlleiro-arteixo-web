# Xenlleiro · Arteixo (A Coruña)

Web de restaurante. Sustituye a la actual, de plantilla Eatbu/DISH
(`xenlleiro.eatbu.com`), de la que solo se han tomado **datos**, nunca la
estructura ni el estilo.

- **Tagline (en gallego, sin traducir):** *Cociña con Xeito*
- **Concepto:** «Capa fina». El arroz es el plato bandera y la web se mira
  **desde arriba**, como una paellera sobre la mesa.
- **Modo:** claro (cerámico) siempre. No hay tema oscuro a propósito
  (`color-scheme: light only`).

---

## El lenguaje de esta plantilla (y por qué no se parece a las otras)

Es la **primera plantilla del taller para restaurante de arroces / cocina
de producto**, y su lenguaje es el **cenital**:

| Recurso | Cómo se usa aquí |
|---|---|
| Círculo | Es **el plato visto desde arriba**, nunca una órbita ni un blob |
| Capa fina | Líneas finas concéntricas como separador (`hr.capa-fina`) y aros alrededor de cada plato |
| Destapar | Cada bloque entra con `clip-path: circle()` creciendo desde el centro, **no** con un fade |
| Giro | Los platos giran 1–3° con el scroll, como si se ajustasen sobre la mesa |
| Azafrán | Acento único: CTA, numeración, marcas de pendiente y las franjas de cena |

Y lo que **no** hay, para no repetir plantillas de la carpeta: nada de
día/noche (Marabú, Melao v2), blob (Melao), iconos orbitando (O Logradouro),
Camino (O Carballo), brasas ni fondo oscuro (A Lareira), espiral (Caracola)
ni flor (Ceibo).

**Estructura propia**, no reutilizada: hero-paellera → marquesina → cocina
(+ cierre con plato cenital y cita) → los arroces (paellera fija que cruza
de imagen mientras se apilan 5 tarjetas) → carta (tres platos cenitales
encabezando los tres bloques) → **pieza gráfica de horario semanal** →
el local → reseñas → contacto.

## Paleta y tipografía

```
#F5F2EC  cerámica moteada (fondo; las motas son CSS estático)
#141414  tinta de choco (texto y bloques)
#D99A2B  azafrán (acento único)
#C9B08C  madera clara del local (secundario)
```

- Titulares e itálicas: **Instrument Serif** (serif de alto contraste).
  Los nombres de plato van **siempre en itálica**.
- Cuerpo y cifras: **Figtree**.

## Archivos

```
index.html            la página entera
404.html              «Plato vacío»
css/style.css         tokens, componentes, responsive y estados de movimiento
js/main.js            Lenis, GSAP/ScrollTrigger, consentimientos y utilidades
assets/img/brand/     wordmark y marca PROVISIONALES + iconos PWA
assets/img/photos/    fotografía de archivo graduada
scripts/              generación de marca, fotos, OG e iconos, y verificación
screenshots/          capturas de la verificación con Playwright
```

Cómo regenerar cada cosa:

```bash
python scripts/generate_brand.py                 # wordmark + marca (SVG)
python scripts/process_photos.py                 # descarga, recorta y gradúa
NODE_PATH=/c/Users/alvar/node_modules node scripts/generate_og.js      # iconos + tarjeta OG
NODE_PATH=/c/Users/alvar/node_modules node scripts/contact_sheets.js   # hojas de contacto de Pexels
python -m http.server 8231
NODE_PATH=/c/Users/alvar/node_modules node scripts/verify.js           # 20 comprobaciones
```

## Decisiones técnicas que conviene no deshacer

- **El mapa no existe hasta que lo pides.** El `iframe` de Google se crea
  en el clic sobre `.map-consent`, con
  `google.com/maps?q=…&output=embed` (sin API key). Si se montara solo, el
  aviso de «sin cookies de terceros» sería mentira.
- **El aviso de cookies se cierra de verdad.** `.cookie-banner` se oculta
  con `[hidden]`; en el CSS **no** hay ningún `display` que pueda ganarle
  (el clásico `display:flex` que deja el botón «sin hacer nada»).
- **Movimiento reducido respetado.** Con `prefers-reduced-motion`, los
  círculos ya están destapados, nada gira y la marquesina se para.
- **Si GSAP o Lenis no cargan, la web se ve entera.** Todos los estados
  «ocultos» viven bajo `html.has-motion`, que solo activa el JS.
- **Sin canvas, sin blur por frame.** El destapado es `clip-path` en un
  tween puntual (no scrubeado) y se **retira al terminar**, para no dejar
  al navegador recortando áreas grandes el resto de la sesión. La textura
  de motas es CSS estático.
- **Los `<li>` de la pila de arroces son los pegajosos**, con
  `margin-bottom` como recorrido y un `top` escalonado (14 px por tarjeta)
  para que se vea el canto de las de debajo. Nada de `min-height` en el
  `<li>` con una tarjeta pegajosa dentro: eso deja tarjetas fantasma.
- **`verify.js` recorre con la rueda del ratón, no con `window.scrollTo`.**
  Con Lenis, `scrollTo` no dispara los ScrollTrigger del final de la página.

### Bugs reales que se cazaron al verificar

1. El plato de los arroces salía **vacío**: su recorte circular arranca en
   radio 0 y solo el del hero estaba animado. Ahora todos los platos fuera
   del hero se destapan al entrar en pantalla (`initPlatos`).
2. `.plato { grid-area: plato }` afectaba a todos los platos; fuera del
   hero ese nombre de área no existe y el plato se montaba encima del
   índice «01 / 05». Ahora `grid-area` vive solo en `.hero-plato`.
3. Los titulares partían palabras por la mitad («**se / mana**»): cada
   carácter es `inline-block` para animarlo, así que la **palabra** también
   tiene que serlo, con `white-space: nowrap`.
4. Las miniaturas de móvil daban 404: una `url()` dentro de una custom
   property se resuelve contra **la hoja de estilos que la usa**, no contra
   el documento, así que `assets/…` se convertía en `css/assets/…`. Se
   sustituyó la variable por un `<img>` real.
5. Desbordamiento horizontal de 2 px a 400 px: el aro exterior del plato
   sobresale un 7,4 % por lado y el círculo medía 92 vw.

---

# LO QUE FALTA (para pedirle al cliente)

Nada de esto se ha inventado. Todo está en la web como marca visible
`[ALGO PENDIENTE]`, en azafrán, para que se vea en una revisión y se pueda
buscar en el HTML.

### Crítico — la web no debería publicarse sin esto

1. **Precios de los 15 platos.** Cada uno lleva `[PRECIO PENDIENTE]`. La
   carta es literal de su web; los precios no aparecen en ninguna parte.
2. **Fotos reales del local.** Hay 6 huecos en «El local»; cinco llevan
   ahora **imágenes de archivo que no son de Xenlleiro** (van etiquetadas
   «Archivo · falta la foto real» sobre la propia foto y en el pie), y el
   sexto está vacío a propósito.
3. **Fotos reales de los platos.** Las que se ven (hero, los 5 arroces,
   zamburiñas, pulpo, rape, manos sirviendo) son **de archivo**, no de
   Xenlleiro. La sección de arroces y el pie lo dicen.
4. **Valoración de Google y nº de reseñas.** `[VALORACIÓN GOOGLE PENDIENTE]`
   y `[Nº RESEÑAS PENDIENTE]`. No aparecían en el material y no se ha
   salido a buscarlas. El contador animado ya está programado: en cuanto
   se ponga `data-valor="4,8"` (o lo que sea) en `.resenas-cifra`,
   se anima solo.
5. **Textos y nombres de 3 reseñas reales** (`[TEXTO DE RESEÑA PENDIENTE]`).

### Importante

6. **Carta de desayunos.** Existen los desayunos (hay galería propia en su
   web) pero no hay carta publicada: `[CARTA DE DESAYUNOS PENDIENTE]`.
   Hay además un hueco de foto de desayuno sin rellenar.
7. **Nombre del chef / propietario.** El aviso legal de su web dice
   *Eduardo Torreira*, pero eso es el **titular**, no necesariamente quien
   quiere aparecer. En el pie está como
   `[NOMBRE DEL CHEF/PROPIETARIO A CONFIRMAR]`.
8. **Listado de alérgenos plato a plato.** Dicen expresamente que adaptan
   la carta a celíacos y veganos, pero no publican el detalle.
9. **Postres, carta de vinos y menú del día.** No los tienen publicados y
   **no se han inventado**: aparecen los tres como pendientes al pie de la
   carta.

### Menor

10. **Año de apertura**, **capacidad / nº de mesas** y **equipo de cocina
    y sala**: tres huecos marcados al final de «El local».
11. **Tiempo de espera de los arroces.** Se dice que se hacen al momento,
    pero no cuántos minutos: `[TIEMPO DE ESPERA DE LOS ARROCES PENDIENTE]`.
12. **Sistema de reserva online.** Hoy la reserva es por WhatsApp o
    teléfono; `[RESERVA ONLINE PENDIENTE]` explica que se conectaría al
    mismo botón.

### Dos avisos sobre lo que sí se ha hecho

- **No hay logo, y el wordmark es una propuesta.** Su web usa solo texto.
  Se ha dibujado un wordmark tipográfico «Xenlleiro» y una marca circular
  (el plato con aros y la X dentro) a partir de Instrument Serif. Está
  declarado como provisional en el pie.
- **La fotografía no está generada.** El encargo pedía fotografía original
  generada; **en este entorno no hay herramienta de generación de imagen**
  (se comprobó). Toda la fotografía es de archivo de **Pexels** (licencia
  comercial libre, sin atribución obligatoria), elegida a mano sobre hojas
  de contacto con criterio cenital y pasada por una gradación común
  (`scripts/process_photos.py`) para que las distintas procedencias
  parezcan la misma cámara. Se descartaron a propósito cuatro fotos ya
  graduadas: una «barra de mármol» con **una persona reconocible y el
  rótulo de otro negocio**, un arroz en plato **azul**, una paella de stock
  con **gambas rojas** y un ventanal con **pinos nevados**. El detalle está
  documentado en la cabecera del script.

### Dato que se decidió NO publicar

El teléfono **677 16 91 21** aparece en el aviso legal de su web, pero es
del titular, no del restaurante. **No está en ninguna parte de esta web.**
Los publicados son el del local (881 10 21 64) y el de reservas por
WhatsApp (617 00 46 70).

---

## Datos publicados (todos confirmados)

- **Dirección:** Rúa Capela, 8 · 15142 Arteixo, A Coruña
- **Teléfono:** 881 10 21 64 · **WhatsApp reservas:** 617 00 46 70
- **Email:** xenlleiro@gmail.com · **Instagram:** [@xenlleiro](https://www.instagram.com/xenlleiro)
- **Horario:** lunes cerrado · martes a domingo 9:00–17:00 · viernes y
  sábado también 19:30–23:30
  → *Desayunos y comidas toda la semana. Cenas, solo viernes y sábado.*
- **Servicios:** terraza, se admiten mascotas, wifi gratis, aire
  acondicionado, zona de fumadores. Pago: efectivo, tarjeta, contactless.
- **Dietas:** opciones para personas celíacas y veganas.

## Verificación

`scripts/verify.js` pasa **20/20** en Chromium: destapado del hero,
botón del aviso de cookies, mapa bajo demanda sin API key, cruce de
imágenes de los arroces sincronizado con el índice, posición exacta de las
franjas horarias (9:00 → 6,25 % del eje 8–24; 19:30 → 71,875 %), marcado
del día de hoy, movimiento reducido, orden y ancho del hero a 400 px, cero
desbordamiento horizontal, cero errores de consola y cero recursos caídos.
Las capturas están en `screenshots/` y el informe en
`scripts/verify-report.json`.
