/* Iconos PWA y tarjeta OG de Xenlleiro, renderizados con Playwright a
   partir de la marca provisional y de la foto cenital del arroz negro.
   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/generate_og.js */
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const BRAND = path.join(RAIZ, 'assets', 'img', 'brand');
const TMP = path.join(__dirname, '_tmp');
fs.mkdirSync(TMP, { recursive: true });

const iconoHTML = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}img{width:512px;height:512px;display:block}</style>
<img src="../../assets/img/brand/xenlleiro-marca.svg">`;

const ogHTML = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Figtree:wght@500;600&display=swap" rel="stylesheet">
<style>
  html,body{margin:0}
  body{
    width:1200px;height:630px;display:grid;grid-template-columns:1fr auto;
    align-items:center;gap:56px;padding:0 84px;box-sizing:border-box;
    background-color:#F5F2EC;color:#141414;font-family:Figtree,sans-serif;
    background-image:
      radial-gradient(circle at 15% 22%, rgba(20,20,20,.055) 0 1px, transparent 1.3px),
      radial-gradient(circle at 63% 8%, rgba(20,20,20,.04) 0 1.2px, transparent 1.5px),
      radial-gradient(circle at 82% 55%, rgba(201,176,140,.34) 0 1.4px, transparent 1.7px),
      radial-gradient(circle at 37% 78%, rgba(20,20,20,.045) 0 1px, transparent 1.3px);
    background-size:190px 190px,263px 263px,311px 311px,223px 223px;
  }
  h1{font-family:"Instrument Serif",serif;font-weight:400;font-size:122px;line-height:.9;margin:0 0 14px;letter-spacing:-.03em}
  .xeito{font-family:"Instrument Serif",serif;font-style:italic;font-size:52px;color:#141414;margin:0 0 26px}
  .linea{white-space:nowrap;font-size:22px;letter-spacing:.14em;text-transform:lowercase;color:#6E6A61;margin:0 0 22px}
  .dir{font-size:24px;font-weight:600;color:#B87D18;margin:0}
  .plato{position:relative;width:420px;height:420px}
  .plato img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}
  .aro{position:absolute;inset:-14px;border:1px solid rgba(20,20,20,.16);border-radius:50%}
  .aro2{inset:-30px;border-color:rgba(217,154,43,.5)}
</style>
<div>
  <h1>Xenlleiro</h1>
  <p class="xeito">Cociña con Xeito</p>
  <p class="linea">arroces al momento · fondo casero · capa fina</p>
  <p class="dir">Rúa Capela, 8 · Arteixo (A Coruña)</p>
</div>
<div class="plato">
  <span class="aro"></span><span class="aro2"></span>
  <img src="../../assets/img/photos/arroz-negro-1400.jpg">
</div>`;

(async () => {
  const browser = await chromium.launch();

  // --- iconos ---
  const fIcon = path.join(TMP, 'icono.html');
  fs.writeFileSync(fIcon, iconoHTML);
  for (const tam of [96, 180, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: tam, height: tam }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(fIcon).href);
    await page.addStyleTag({ content: `img{width:${tam}px;height:${tam}px}` });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(BRAND, `icon-${tam}.png`) });
    await page.close();
    console.log('icon', tam);
  }

  // --- tarjeta OG ---
  const fOg = path.join(TMP, 'og.html');
  fs.writeFileSync(fOg, ogHTML);
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(fOg).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(RAIZ, 'assets', 'img', 'og-xenlleiro.jpg'), type: 'jpeg', quality: 86 });
  await page.close();
  console.log('og listo');

  await browser.close();
})();
