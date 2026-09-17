/* Xenlleiro · Arteixo — movimiento y utilidades.

   GSAP, ScrollTrigger y Lenis llegan de un CDN. Si fallan (bloqueador,
   red, CDN caído) nada de lo de aquí puede romper la página: los
   círculos aparecen ya destapados, los textos visibles, el teléfono,
   el WhatsApp y el mapa funcionan. Por eso los estados "ocultos" del
   CSS viven bajo html.has-motion, que solo se activa desde aquí.

   Movimiento de esta plantilla: destapar (clip-path circular), girar
   muy poco (1–3°) y cruzar imágenes dentro del mismo círculo. Nada de
   canvas, ni blur por frame, ni partículas. */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsapReady = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  const motion = gsapReady && !reduce;
  const html = document.documentElement;
  if (gsapReady) gsap.registerPlugin(ScrollTrigger);
  if (motion) html.classList.add("has-motion");
  if (!gsapReady) html.classList.add("sin-gsap");

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const rem = () => parseFloat(getComputedStyle(html).fontSize) || 16;
  const navH = () => parseFloat(getComputedStyle(html).getPropertyValue("--nav-h")) * rem() || 68;
  /* misma cuenta que el `top` pegajoso de .arroz-carta en el CSS */
  const topePegajoso = () => navH() + 3.2 * rem();

  /* ---------- División en caracteres (accesible) ----------
     El texto real se sustituye por spans, así que la palabra
     completa se conserva en aria-label y los spans quedan ocultos
     al lector de pantalla. */
  function splitChars(el) {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    const chars = [];
    text.split(" ").forEach((word, i, arr) => {
      const ws = document.createElement("span");
      ws.className = "split-word";
      ws.setAttribute("aria-hidden", "true");
      Array.from(word).forEach((ch) => {
        const cs = document.createElement("span");
        cs.className = "split-char";
        cs.textContent = ch;
        ws.appendChild(cs);
        chars.push(cs);
      });
      el.appendChild(ws);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return chars;
  }
  const splitMap = new Map();
  if (motion) $$("[data-split-char]").forEach((el) => splitMap.set(el, splitChars(el)));

  /* ---------- Aviso de cookies ----------
     El botón tiene que funcionar de verdad: el banner se oculta con
     [hidden] y en el CSS NO hay ningún display que pueda ganarle. */
  (function initCookieBanner() {
    const banner = $(".cookie-banner");
    const ack = $(".cookie-ack");
    if (!banner || !ack) return;
    const KEY = "xenlleiro-cookie-ack";
    let visto = false;
    try { visto = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (!visto) banner.hidden = false;
    ack.addEventListener("click", () => {
      banner.hidden = true;
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
    });
  })();

  /* ---------- Menú móvil ---------- */
  (function initNavMovil() {
    const toggle = $(".nav-toggle");
    const menu = $(".nav-movil");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => {
      const abierto = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", abierto ? "false" : "true");
      menu.hidden = abierto;
    });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    }));
  })();

  /* ---------- Mapa bajo demanda ----------
     Sin API key y sin contactar con Google hasta que el visitante
     pulsa. Es lo que hace cierto el aviso de "sin cookies de
     terceros": si el iframe se montara solo, sería mentira. */
  (function initMapConsent() {
    const btn = $(".map-consent");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const q = encodeURIComponent("Xenlleiro, Rúa Capela 8, 15142 Arteixo, A Coruña");
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.google.com/maps?q=" + q + "&output=embed";
      iframe.title = "Mapa: Xenlleiro, Rúa Capela 8, Arteixo";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.setAttribute("allowfullscreen", "");
      btn.replaceWith(iframe);
    });
  })();

  /* ---------- Cabecera y botón flotante ---------- */
  (function initCabecera() {
    const cabecera = $(".cabecera");
    const hero = $(".hero");
    const fab = $(".call-fab");
    function onScroll() {
      if (cabecera) cabecera.classList.toggle("is-scrolled", window.scrollY > 24);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (fab && hero && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        fab.classList.toggle("is-visible", !e.isIntersecting);
      }, { threshold: 0.12 }).observe(hero);
    }
  })();

  /* ---------- Enlace activo en la navegación ---------- */
  (function initNavActiva() {
    const enlaces = $$(".nav a");
    if (!enlaces.length || !("IntersectionObserver" in window)) return;
    const porId = new Map();
    enlaces.forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      const sec = document.getElementById(id);
      if (sec) porId.set(sec, a);
    });
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        const a = porId.get(e.target);
        if (a && e.isIntersecting) {
          enlaces.forEach((x) => x.classList.remove("is-activo"));
          a.classList.add("is-activo");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    porId.forEach((_, sec) => obs.observe(sec));
  })();

  /* ---------- Horario: marcar el día de hoy ---------- */
  (function initHoy() {
    const HOY = new Date().getDay(); // 0 domingo … 6 sábado
    const fila = $('.dia[data-dia="' + HOY + '"]');
    if (fila) fila.classList.add("es-hoy");
    const nota = $("[data-hoy]");
    if (!nota) return;
    const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    let texto;
    if (HOY === 1) {
      texto = "Hoy es <strong>lunes</strong>: el restaurante está cerrado. Mañana abrimos a las 9:00.";
    } else if (HOY === 5 || HOY === 6) {
      texto = "Hoy es <strong>" + nombres[HOY] + "</strong>: servimos de <strong>9:00 a 17:00</strong> y, además, cenas de <strong>19:30 a 23:30</strong>.";
    } else {
      texto = "Hoy es <strong>" + nombres[HOY] + "</strong>: servimos de <strong>9:00 a 17:00</strong>. Las cenas son solo viernes y sábado.";
    }
    nota.innerHTML = texto;
    nota.hidden = false;
  })();

  /* ---------- Valoración: contador ----------
     De momento data-valor está vacío a propósito: no hay valoración
     confirmada y no se inventa. En cuanto se rellene con un número
     (p. ej. data-valor="4.8"), este contador la anima sola. */
  function initContador() {
    const el = $("[data-contador]");
    if (!el) return;
    const valor = parseFloat((el.dataset.valor || "").replace(",", "."));
    if (!isFinite(valor) || valor <= 0) return;
    const pinta = (n) => { el.textContent = n.toFixed(1).replace(".", ",") + " ★"; };
    if (!motion) { pinta(valor); return; }
    const obj = { n: 0 };
    pinta(0);
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => gsap.to(obj, {
        n: valor, duration: 1.3, ease: "power2.out",
        onUpdate: () => pinta(obj.n)
      })
    });
  }

  /* ---------- Botones magnéticos ---------- */
  function initMagneticos() {
    if (!motion || window.matchMedia("(hover: none)").matches) return;
    $$(".magnetico").forEach((el) => {
      const fuerza = 0.32;
      el.addEventListener("mousemove", (ev) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (ev.clientX - (r.left + r.width / 2)) * fuerza,
          y: (ev.clientY - (r.top + r.height / 2)) * fuerza,
          duration: 0.45, ease: "power3.out"
        });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)" });
      });
    });
  }

  /* ---------- Los arroces: la paellera cambia de contenido ----------
     Las tarjetas son pegajosas (el <li> es el pegajoso, con
     margin-bottom como recorrido). El momento exacto en que una
     tarjeta se pega al tope es el disparador del cruce de imagen,
     así que el `start` se calcula con el mismo tope del CSS. */
  function initArroces() {
    const imgs = $$(".arroz-img");
    const cartas = $$(".arroz-carta");
    const indice = $(".arroces-indice-n");
    if (!imgs.length || !cartas.length) return;

    let actual = 1;
    function muestra(n) {
      if (n === actual) return;
      actual = n;
      imgs.forEach((img) => img.classList.toggle("is-activa", +img.dataset.arroz === n));
      if (indice) indice.textContent = String(n).padStart(2, "0");
    }
    if (!gsapReady) return;   // sin ScrollTrigger no hay a que engancharse

    cartas.forEach((carta, i) => {
      ScrollTrigger.create({
        trigger: carta,
        start: () => "top " + (topePegajoso() + i * 14 + 4) + "px",
        onEnter: () => muestra(i + 1),
        onLeaveBack: () => muestra(Math.max(1, i))
      });
    });
  }

  /* ---------- Destapar en círculo ----------
     Cada bloque se abre como si se destapase una cazuela, en vez de
     aparecer con un fade. Al terminar se quita la clip-path para no
     dejar al navegador recortando un área grande el resto de la
     sesión (y para no recortar nada pegajoso). */
  function initDestapados() {
    if (!motion) return;
    $$("[data-seccion]").forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.fromTo(el,
            { "--rev": 0 },
            {
              "--rev": 100, duration: 0.95, ease: "power2.inOut",
              onComplete: () => { el.classList.add("ya-visible"); el.style.removeProperty("--rev"); }
            });
          gsap.fromTo(el, { y: 26, opacity: 0.45 },
            { y: 0, opacity: 1, duration: 0.95, ease: "power2.out" });
        }
      });
    });
  }

  /* ---------- Destapar los platos que no son el del hero ----------
     El recorte circular arranca en radio 0 bajo html.has-motion. El
     plato del hero lo abre la linea de tiempo de arriba; los demas
     (cocina, arroces, carta) se destapan al entrar en pantalla. Sin
     esto el circulo se queda vacio, que es justo lo que pasaba. */
  function initPlatos() {
    if (!motion) return;
    $$(".plato-recorte").forEach((el) => {
      if (el.closest(".hero-plato")) return;
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => gsap.fromTo(el,
          { "--rev": 0 },
          {
            "--rev": 50, duration: 1, ease: "power2.inOut",
            /* al acabar se quita el recorte: el borde redondeado y el
               overflow ya dejan el circulo, y el navegador deja de
               recortar un area grande en cada repintado */
            onComplete: () => { el.style.clipPath = "none"; el.style.removeProperty("--rev"); }
          })
      });
    });
  }

  /* ---------- Titulares carácter a carácter ---------- */
  function initTitulares() {
    if (!motion) return;
    splitMap.forEach((chars, el) => {
      if (el.classList.contains("hero-palabra")) return; // lo lleva el hero
      gsap.fromTo(chars,
        { yPercent: 108, opacity: 0 },
        {
          yPercent: 0, opacity: 1, duration: 0.8, ease: "power2.out",
          stagger: { each: 0.016 },
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        });
    });
  }

  /* ---------- Giro lentísimo de los platos ----------
     1–3 grados en todo el recorrido: el plato se "ajusta" sobre la
     mesa, no da vueltas. Solo transform, nada que repintar. */
  function initGiros() {
    if (!motion) return;
    const hero = $(".hero-plato .plato-recorte");
    if (hero) {
      gsap.to(hero, {
        rotation: 3, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      });
    }
    const arroz = $(".arroz-plato .plato-recorte");
    if (arroz) {
      gsap.fromTo(arroz, { rotation: -1.5 }, {
        rotation: 1.5, ease: "none",
        scrollTrigger: { trigger: ".arroces", start: "top bottom", end: "bottom top", scrub: 0.8 }
      });
    }
  }

  /* ---------- Hero ----------
     El círculo se destapa desde el centro (1,1 s) y el resto entra
     detrás. La palabra "Xenlleiro" sube letra a letra. */
  function initHero() {
    const recorte = $(".hero-plato .plato-recorte");
    const img = $(".hero-plato img");
    if (!motion) return;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    if (recorte) {
      tl.fromTo(recorte, { "--rev": 0 }, { "--rev": 50, duration: 1.15, ease: "power2.inOut" }, 0);
    }
    if (img) {
      tl.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.5, ease: "power2.out" }, 0);
    }
    const chars = splitMap.get($(".hero-palabra"));
    if (chars) {
      tl.fromTo(chars,
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.85, stagger: { each: 0.035 } }, 0.25);
    }
    tl.to([".hero-izq", ".hero-der"], { opacity: 1, duration: 0.7, stagger: 0.08 }, 0.7)
      .to(".plato-pie", { opacity: 1, duration: 0.6 }, 0.95)
      .to(".hero-scroll", { opacity: 1, duration: 0.6 }, 1.05);
  }

  /* ---------- Lenis ---------- */
  function initLenis() {
    if (!motion || typeof Lenis === "undefined") return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      a.addEventListener("click", (ev) => {
        const destino = document.querySelector(id);
        if (!destino) return;
        ev.preventDefault();
        lenis.scrollTo(destino, { offset: -navH() - 8 });
      });
    });
  }

  /* ---------- Arranque ----------
     Se espera a las fuentes para que el reparto por caracteres no
     se mida con la fuente de respaldo (y para que el titular no
     salte cuando entra Instrument Serif). */
  function arranca() {
    initLenis();
    initHero();
    initTitulares();
    initDestapados();
    initPlatos();
    initGiros();
    initArroces();
    initMagneticos();
    initContador();
    if (gsapReady) ScrollTrigger.refresh();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(arranca).catch(arranca);
  } else {
    window.addEventListener("load", arranca);
  }

  /* recalcular posiciones cuando cambia el alto real del móvil */
  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => { if (gsapReady) ScrollTrigger.refresh(); }, 220);
  });
})();
