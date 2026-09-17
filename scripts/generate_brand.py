# -*- coding: utf-8 -*-
"""Marca PROVISIONAL de Xenlleiro.

El negocio no tiene logo: su web actual (Eatbu) usa solo texto. Aqui se
dibuja un wordmark tipografico a partir de Instrument Serif (OFL), la misma
familia que titula la web, convertido a trazados para que no dependa de la
carga de la fuente. El motivo es el cenital: un circulo (el plato / la
paellera vista desde arriba) con anillos finos concentricos ("capa fina")
y la X centrada.

Salidas:
  assets/img/brand/xenlleiro-wordmark.svg   la palabra en trazados
  assets/img/brand/xenlleiro-marca.svg      circulo + anillos + X (favicon)
  assets/img/brand/icon-{96,180,192,512}.png

Uso: python scripts/generate_brand.py
"""
import io, os, urllib.request
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

RAIZ = os.path.join(os.path.dirname(__file__), "..")
BRAND = os.path.join(RAIZ, "assets", "img", "brand")
CACHE = os.path.join(os.path.dirname(__file__), "fonts")
os.makedirs(BRAND, exist_ok=True); os.makedirs(CACHE, exist_ok=True)

TINTA = "#141414"
AZAFRAN = "#D99A2B"

FUENTES = {
    "regular": "https://github.com/google/fonts/raw/main/ofl/instrumentserif/InstrumentSerif-Regular.ttf",
    "italic": "https://github.com/google/fonts/raw/main/ofl/instrumentserif/InstrumentSerif-Italic.ttf",
}

def fuente(nombre):
    ruta = os.path.join(CACHE, "InstrumentSerif-%s.ttf" % nombre)
    if not os.path.exists(ruta):
        req = urllib.request.Request(FUENTES[nombre], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=90) as r:
            open(ruta, "wb").write(r.read())
    return TTFont(ruta)

def texto_a_path(font, texto, tracking=0.0):
    """Devuelve (path_d, ancho_em, upem) del texto compuesto en coordenadas de la fuente."""
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font["hmtx"]
    kern = {}
    try:
        gpos = font["GPOS"].table
        for lookup in gpos.LookupList.Lookup:
            if lookup.LookupType != 2:
                continue
            for st in lookup.SubTable:
                if getattr(st, "Format", None) == 1 and getattr(st, "PairSet", None):
                    cov = st.Coverage.glyphs
                    for gi, ps in zip(cov, st.PairSet):
                        for rec in ps.PairValueRecord:
                            v = rec.Value1
                            if v is not None and getattr(v, "XAdvance", 0):
                                kern[(gi, rec.SecondGlyph)] = v.XAdvance
    except Exception:
        pass
    partes, x = [], 0.0
    prev = None
    for ch in texto:
        gname = cmap.get(ord(ch))
        if gname is None:
            continue
        if prev is not None:
            x += kern.get((prev, gname), 0)
        pen = SVGPathPen(gs)
        gs[gname].draw(pen)
        d = pen.getCommands()
        if d:
            partes.append('<path transform="translate(%.2f 0)" d="%s"/>' % (x, d))
        x += hmtx[gname][0] + tracking
        prev = gname
    return "\n    ".join(partes), x, font["head"].unitsPerEm

def escribir(ruta, contenido):
    io.open(ruta, "w", encoding="utf-8").write(contenido)
    print("->", os.path.relpath(ruta, RAIZ))

# ---------- wordmark ----------
reg = fuente("regular")
d, ancho, upem = texto_a_path(reg, "Xenlleiro", tracking=12)
asc = reg["hhea"].ascent; desc = reg["hhea"].descent
# recorte ajustado a mayusculas + descendentes reales de la palabra
alto_cap = reg["OS/2"].sCapHeight if hasattr(reg["OS/2"], "sCapHeight") else int(upem * 0.7)
margen = upem * 0.06
vb_y = -(alto_cap + margen)
vb_h = alto_cap + margen * 2
wordmark = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 %.1f %.1f %.1f" role="img" aria-label="Xenlleiro">
  <title>Xenlleiro</title>
  <g fill="%s" transform="scale(1 -1)">
    %s
  </g>
</svg>
""" % (vb_y, ancho, vb_h, TINTA, d.replace('transform="translate(', 'transform="translate('))
# el eje Y de las fuentes crece hacia arriba: se invierte con scale(1 -1)
wordmark = wordmark.replace('transform="scale(1 -1)"', 'transform="translate(0 0) scale(1 -1)"')
escribir(os.path.join(BRAND, "xenlleiro-wordmark.svg"), wordmark)

# ---------- marca circular: el plato visto desde arriba ----------
dx, anchox, _ = texto_a_path(reg, "X")
# la X ocupa 215 px de altura de mayuscula dentro del anillo de azafran (r=186)
esc = 215.0 / alto_cap
marca = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Xenlleiro">
  <title>Xenlleiro</title>
  <circle cx="256" cy="256" r="248" fill="#F5F2EC"/>
  <circle cx="256" cy="256" r="238" fill="none" stroke="%(tinta)s" stroke-width="10"/>
  <circle cx="256" cy="256" r="206" fill="none" stroke="%(tinta)s" stroke-width="3" opacity="0.5"/>
  <circle cx="256" cy="256" r="186" fill="none" stroke="%(azafran)s" stroke-width="7"/>
  <g fill="%(tinta)s" transform="translate(256 256) scale(%(esc).5f -%(esc).5f) translate(%(cx).1f %(cy).1f)">
    %(d)s
  </g>
</svg>
""" % {"tinta": TINTA, "azafran": AZAFRAN, "esc": esc, "cx": -anchox / 2.0,
       "cy": -(alto_cap / 2.0), "d": dx}
escribir(os.path.join(BRAND, "xenlleiro-marca.svg"), marca)
