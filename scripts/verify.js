/* Verificacion de la web de Xenlleiro con Playwright.

   Recorre la pagina con la RUEDA del raton, no con window.scrollTo:
   con Lenis, scrollTo no dispara los ScrollTrigger del final de la
   pagina y las capturas salen con secciones sin destapar.

   Comprueba ademas: errores de consola, recursos 404, el boton del
   aviso de cookies, el mapa bajo demanda (que no haya iframe de Google
   antes del clic), el cruce de imagenes de los arroces, el desbordamiento
   horizontal a 400 px y la variante de movimiento reducido.

   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/verify.js [url] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:8231/';
const SHOTS = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const informe = { url: URL, consola: [], fallos: [], pruebas: [] };
const ok = (n, v, extra) => {
  informe.pruebas.push({ prueba: n, ok: !!v, extra: extra || null });
  console.log((v ? 'OK  ' : 'MAL ') + n + (extra ? '  ' + JSON.stringify(extra) : ''));
};

function vigila(page) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') informe.consola.push(m.type() + ': ' + m.text());
  });
  page.on('pageerror', (e) => informe.consola.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) informe.fallos.push(r.status() + ' ' + r.url()); });
}

/* recorre hasta `hasta` px con la rueda y espera a que Lenis se asiente */
async function rueda(page, hasta, paso) {
  paso = paso || 700;
  let y = await page.evaluate(() => window.scrollY);
  while (y < hasta) {
    /* pasos cortos cerca del destino: si no, la rueda se pasa hasta
       700 px y las capturas salen de la seccion siguiente */
    await page.mouse.wheel(0, Math.max(60, Math.min(paso, hasta - y)));
    await page.waitForTimeout(140);
    const ny = await page.evaluate(() => window.scrollY);
    if (ny <= y + 1) break;
    y = ny;
  }
  await page.waitForTimeout(3000);
  return y;
}

async function aSeccion(page, sel) {
  const donde = () => page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.getBoundingClientRect().top + window.scrollY - 90 : 0;
  }, sel);
  await rueda(page, await donde());
  await page.waitForTimeout(600);
  await rueda(page, await donde());   // segunda pasada: el destapado mueve la pagina
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch();

  /* ---------------- escritorio ---------------- */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  vigila(page);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // el hero se destapa en ~1,2 s: una captura a media apertura y otra abierto
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, '01-hero-destapandose.png') });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(SHOTS, '02-hero-abierto.png') });

  const rev = await page.evaluate(() => {
    const el = document.querySelector('.hero-plato .plato-recorte');
    return getComputedStyle(el).clipPath;
  });
  ok('el circulo del hero queda destapado', /circle\((?!0)/.test(rev) || rev === 'none', { clipPath: rev });

  // aviso de cookies: tiene que verse y tiene que cerrarse de verdad
  const bannerVisible = await page.locator('.cookie-banner').isVisible();
  ok('el aviso de cookies aparece', bannerVisible);
  await page.locator('.cookie-ack').click();
  await page.waitForTimeout(350);
  ok('el boton "Entendido" cierra el aviso', !(await page.locator('.cookie-banner').isVisible()));

  // marca y tipografia
  ok('la marca carga (SVG)', await page.locator('.marca-mark').isVisible());

  await aSeccion(page, '#cocina');
  await page.screenshot({ path: path.join(SHOTS, '03-cocina.png') });

  await aSeccion(page, '.cocina-cierre');
  await page.screenshot({ path: path.join(SHOTS, '04-cocina-cierre.png') });

  // arroces: la paellera cambia de contenido al pasar las tarjetas
  await aSeccion(page, '#arroces');
  await page.screenshot({ path: path.join(SHOTS, '05-arroces-01.png') });
  const activa1 = await page.evaluate(() => document.querySelector('.arroz-img.is-activa').dataset.arroz);

  const yTercera = await page.evaluate(() => {
    const c = document.querySelectorAll('.arroz-carta')[2];
    return c.getBoundingClientRect().top + window.scrollY - 120;
  });
  await rueda(page, yTercera);
  await page.waitForTimeout(1200);
  const activa3 = await page.evaluate(() => document.querySelector('.arroz-img.is-activa').dataset.arroz);
  const indice3 = await page.locator('.arroces-indice-n').textContent();
  await page.screenshot({ path: path.join(SHOTS, '06-arroces-cruce.png') });
  ok('la paellera cruza de imagen al avanzar las tarjetas', activa1 !== activa3, { de: activa1, a: activa3, indice: indice3 });
  ok('el indice acompana a la imagen', indice3.trim() === String(activa3).padStart(2, '0'), { indice: indice3, activa: activa3 });

  await aSeccion(page, '#carta');
  await page.screenshot({ path: path.join(SHOTS, '07-carta-platos.png') });
  await aSeccion(page, '.carta-bloques');
  await page.screenshot({ path: path.join(SHOTS, '08-carta-lista.png') });
  await aSeccion(page, '.desayunos');
  await page.screenshot({ path: path.join(SHOTS, '09-desayunos.png') });

  await aSeccion(page, '#horario');
  await page.screenshot({ path: path.join(SHOTS, '10-horario.png') });
  const hoyMarcado = await page.evaluate(() => {
    const f = document.querySelector('.dia.es-hoy');
    return f ? f.querySelector('.dia-nombre').textContent.trim() : null;
  });
  ok('el dia de hoy queda marcado en la semana', !!hoyMarcado, { dia: hoyMarcado });

  // las franjas tienen que caer donde dicen: 9:00 empieza al 6,25 % del eje 8-24
  const franja = await page.evaluate(() => {
    const pista = document.querySelector('.dia[data-dia="5"] .dia-pista');
    const dia = pista.querySelector('.franja-dia');
    const noche = pista.querySelector('.franja-noche');
    const w = pista.getBoundingClientRect().width;
    const r = (el) => {
      const b = el.getBoundingClientRect();
      const p = pista.getBoundingClientRect();
      return { ini: (b.left - p.left) / w, fin: (b.right - p.left) / w };
    };
    return { dia: r(dia), noche: r(noche) };
  });
  const cerca = (a, b) => Math.abs(a - b) < 0.01;
  ok('la franja de 9:00-17:00 cae donde debe', cerca(franja.dia.ini, 1 / 16) && cerca(franja.dia.fin, 9 / 16), franja.dia);
  ok('la franja de 19:30-23:30 cae donde debe', cerca(franja.noche.ini, 11.5 / 16) && cerca(franja.noche.fin, 15.5 / 16), franja.noche);

  await aSeccion(page, '#local');
  await page.screenshot({ path: path.join(SHOTS, '11-local.png') });
  await aSeccion(page, '#resenas');
  await page.screenshot({ path: path.join(SHOTS, '12-resenas.png') });

  await aSeccion(page, '#contacto');
  await page.screenshot({ path: path.join(SHOTS, '13-contacto.png') });

  // el mapa NO puede existir antes del clic
  const iframesAntes = await page.locator('.contacto-mapa iframe').count();
  ok('sin iframe de Google antes del consentimiento', iframesAntes === 0);
  await page.locator('.map-consent').click();
  await page.waitForTimeout(3500);
  const src = await page.locator('.contacto-mapa iframe').getAttribute('src');
  ok('el mapa se monta al pulsar, sin API key', !!src && src.includes('output=embed') && !src.includes('key='), { src: (src || '').slice(0, 80) });
  await page.screenshot({ path: path.join(SHOTS, '14-mapa.png') });

  // ningun texto se sale a lo ancho
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('sin desbordamiento horizontal en escritorio', desborde <= 1, { desborde });

  // marcas de pendiente: tienen que estar y verse
  const pendientes = await page.evaluate(() =>
    (document.body.innerText.match(/\[[^\]]*PENDIENTE[^\]]*\]|\[NOMBRE DEL CHEF[^\]]*\]/g) || []).length);
  ok('los datos que faltan estan marcados a la vista', pendientes >= 20, { marcas: pendientes });

  // pagina completa
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOTS, '15-pagina-completa.png'), fullPage: true });
  await ctx.close();

  /* ---------------- movimiento reducido ---------------- */
  const ctxR = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const pageR = await ctxR.newPage();
  vigila(pageR);
  await pageR.goto(URL, { waitUntil: 'networkidle' });
  await pageR.waitForTimeout(1200);
  const revR = await pageR.evaluate(() => getComputedStyle(document.querySelector('.hero-plato .plato-recorte')).clipPath);
  const giroR = await pageR.evaluate(() => getComputedStyle(document.querySelector('.hero-plato .plato-recorte')).transform);
  ok('con movimiento reducido el circulo ya esta destapado', /circle\((?!0)/.test(revR) || revR === 'none', { clipPath: revR });
  ok('con movimiento reducido el plato no gira', giroR === 'none' || giroR === 'matrix(1, 0, 0, 1, 0, 0)', { transform: giroR });

  /* Las CINCO tarjetas tienen que llegar a fijarse arriba, la ultima
     incluida. Se mide aqui, sin Lenis, porque asi el scroll es exacto y
     lo que se comprueba es el sticky de CSS, sin ruido de GSAP.
     Regresion de: la ultima tarjeta pasaba de largo sin fijarse nunca,
     porque el recorrido de la lista estaba puesto como padding (queda
     fuera de la caja de contenido, que es el bloque contenedor del
     sticky) en vez de como contenido. */
  const pila = await pageR.evaluate(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) * rem;
    return [...document.querySelectorAll(".arroz-carta")].map((c, i) => ({
      base: c.getBoundingClientRect().top + window.scrollY,
      tope: navH + 3.2 * rem + i * 14,
    }));
  });
  const sueltas = [];
  const desparejadas = [];
  for (let i = 0; i < pila.length; i++) {
    for (const extra of [0, 150, 300]) {
      await pageR.evaluate((y) => window.scrollTo(0, y), pila[i].base - pila[i].tope + extra);
      await pageR.waitForTimeout(200);
      const r = await pageR.evaluate((k) => {
        const c = document.querySelectorAll(".arroz-carta")[k];
        const act = document.querySelector(".arroz-img.is-activa");
        return {
          top: c.getBoundingClientRect().top,
          activa: act ? act.dataset.arroz : null,
          indice: document.querySelector(".arroces-indice-n").textContent.trim(),
        };
      }, i);
      if (Math.abs(r.top - pila[i].tope) > 3) {
        sueltas.push({ tarjeta: i + 1, extra: extra, top: Math.round(r.top), tope: Math.round(pila[i].tope) });
      }
      /* cambiar de imagen no es "movimiento": es contenido. Con movimiento
         reducido el cruce se hace instantaneo, pero la paellera y el indice
         tienen que seguir a la tarjeta que esta arriba, no quedarse en el 01. */
      if (extra > 0 && (r.activa !== String(i + 1) || r.indice !== String(i + 1).padStart(2, "0"))) {
        desparejadas.push({ tarjeta: i + 1, extra: extra, activa: r.activa, indice: r.indice });
      }
    }
  }
  ok("las cinco tarjetas de arroz llegan a fijarse arriba", sueltas.length === 0, sueltas.slice(0, 4));
  ok("la paellera y el indice siguen a la tarjeta con movimiento reducido", desparejadas.length === 0, desparejadas.slice(0, 4));
  await pageR.evaluate(() => window.scrollTo(0, 0));
  await pageR.waitForTimeout(300);
  await pageR.screenshot({ path: path.join(SHOTS, '16-reduced-motion.png') });
  await ctxR.close();

  /* ---------------- movil 400 px ---------------- */
  const ctxM = await browser.newContext({
    viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true
  });
  const pageM = await ctxM.newPage();
  vigila(pageM);
  await pageM.goto(URL, { waitUntil: 'networkidle' });
  await pageM.waitForTimeout(3000);
  await pageM.screenshot({ path: path.join(SHOTS, '17-movil-hero.png') });

  const ordenMovil = await pageM.evaluate(() => {
    const p = document.querySelector('.hero-plato').getBoundingClientRect();
    const w = document.querySelector('.hero-palabra').getBoundingClientRect();
    return { platoTop: Math.round(p.top), palabraTop: Math.round(w.top), platoAncho: Math.round(p.width) };
  });
  ok('a 400 px el circulo va arriba y el wordmark debajo', ordenMovil.platoTop < ordenMovil.palabraTop, ordenMovil);
  ok('a 400 px el circulo ocupa casi todo el ancho', ordenMovil.platoAncho >= 330, ordenMovil);

  const desbordeM = await pageM.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('sin desbordamiento horizontal a 400 px', desbordeM <= 1, { desborde: desbordeM });

  await aSeccion(pageM, '#arroces');
  await pageM.screenshot({ path: path.join(SHOTS, '18-movil-arroces.png') });
  await aSeccion(pageM, '#horario');
  await pageM.screenshot({ path: path.join(SHOTS, '19-movil-horario.png') });
  await aSeccion(pageM, '#contacto');
  await pageM.screenshot({ path: path.join(SHOTS, '20-movil-contacto.png') });
  await ctxM.close();

  await browser.close();

  ok('sin errores de consola', informe.consola.length === 0, informe.consola.slice(0, 6));
  ok('sin recursos que fallen', informe.fallos.length === 0, informe.fallos.slice(0, 8));

  fs.writeFileSync(path.join(__dirname, 'verify-report.json'), JSON.stringify(informe, null, 2));
  const malas = informe.pruebas.filter((p) => !p.ok);
  console.log('\n' + (informe.pruebas.length - malas.length) + '/' + informe.pruebas.length + ' pruebas correctas');
  process.exit(malas.length ? 1 : 0);
})();
