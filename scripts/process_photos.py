# -*- coding: utf-8 -*-
"""Fotografia de la web de Xenlleiro: descarga, recorte y gradacion.

AVISO IMPORTANTE SOBRE EL ENCARGO
---------------------------------
El brief pedia "fotografia original generada". En este entorno NO hay
herramienta de generacion de imagen (se comprobo), asi que ninguna de
estas fotos esta generada: todas son de archivo de Pexels (licencia
comercial libre, sin atribucion obligatoria), elegidas a mano sobre
hojas de contacto (scripts/contact_sheets/*.png) con un criterio unico:

    cenital estricto, mesa de madera clara o marmol blanco, ceramica
    clara (a poder ser moteada o estriada), luz de dia lateral suave,
    nada de fuego, nada de chef posando, nada de paella de stock con
    gambas rojas de plastico.

NINGUNA foto es de Xenlleiro ni de sus platos. La web lo dice en la
seccion de arroces, en la galeria del local y en el pie.

Descartadas a proposito tras verlas graduadas:
  28793148  la "barra de marmol" tenia una persona reconocible y el rotulo
            de OTRO negocio: publicarla como local de Xenlleiro seria falso.
  28503603  arroz meloso servido en plato AZUL: rompe la paleta ceramica.
  22880517  paella de stock con gambas rojas y cuchara roja: justo lo que
            el brief prohibe.
  18613024  flores a contraluz, foto oscura: contradice "local luminoso".
  4254015   jarron sobre una repisa de hormigon gris: ni marmol ni barra.
  37727446  ventanal con pinos NEVADOS: frio, no pega con un local calido.

Correspondencias (id de Pexels -> uso):
  32240994  arroz negro sobre plato blanco, cenital      -> hero + arroz 03
  38336089  arroz en capa fina con corte de carne         -> arroz 01 (chuleton)
  9295693   arroz seco de marisco en paellera, cenital    -> arroz 02 (mixto)
  31085544  arroz meloso en plato estriado blanco, cenital -> arroz 04 (senyoret)
  10422365  arroz con verduras en plato claro, cenital    -> arroz 05 (vegano)
  33283959  vieiras sobre plato estriado, cenital         -> cocina (zamburinas)
  37068830  pulpo sobre plato claro estriado, cenital     -> carta "Para compartir"
  25856536  mano sirviendo arroz con cuchara sobre madera -> carta "Arroces"
  15671371  pescado blanco en salsa clara, cenital        -> carta "Carnes y pescados"
  12784534  barra clara de cafeteria con luz de dia        -> local 01
  16480438  sala luminosa con ventanales y madera clara   -> local 02
  34791601  mesa de madera junto a un ventanal            -> local 03
  30476957  mesa de madera junto a un ventanal con planta -> local 04
  29626517  terraza con mesas y sillas, luz de dia        -> local 05

Gradacion por script (no filtros CSS, que costarian por frame):
balance de blancos gray-world suave, curva en S leve, saturacion
contenida, split-toning con sombras a tinta de choco #141414 y luces a
ceramica calida #F5F2EC, un empujon de azafran #D99A2B en los medios
altos (los "puntos de luz" del brief) y un velo de madera clara
#C9B08C en los medios. Vineta muy leve y grano fino para que las
cuatro procedencias distintas parezcan la misma camara.

Salida: assets/img/photos/<nombre>-<ancho>.jpg + LQIP en lqip.txt
Uso: python scripts/process_photos.py
"""
import base64
import concurrent.futures
import io
import os
import urllib.request

import numpy as np
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(os.path.dirname(__file__), "photos_src")
OUT = os.path.join(RAIZ, "assets", "img", "photos")
os.makedirs(SRC, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# nombre: (id de Pexels, proporcion ancho/alto, anclaje vertical 0..1, anchos de salida)
PHOTOS = {
    "arroz-negro":    ("32240994", 1 / 1, 0.50, (1400, 1200, 560)),
    "arroz-chuleton": ("38336089", 1 / 1, 0.50, (1200, 560)),
    "arroz-mixto":    ("9295693",  1 / 1, 0.50, (1200, 560)),
    "arroz-senyoret": ("31085544", 1 / 1, 0.50, (1200, 560)),
    "arroz-vegano":   ("10422365", 1 / 1, 0.50, (1200, 560)),
    "zamburinas":     ("33283959", 1 / 1, 0.50, (900, 560)),
    "pulpo":          ("37068830", 1 / 1, 0.50, (700,)),
    "manos-arroz":    ("25856536", 1 / 1, 0.50, (700,)),
    "rape":           ("15671371", 1 / 1, 0.50, (700,)),
    "local-barra":    ("12784534", 4 / 3, 0.50, (1100, 700)),
    "local-sala":     ("16480438", 4 / 3, 0.50, (1100, 700)),
    "local-ventanal": ("34791601", 4 / 3, 0.50, (1100, 700)),
    "local-flores":   ("30476957", 4 / 3, 0.50, (1100, 700)),
    "local-terraza":  ("29626517", 4 / 3, 0.50, (1100, 700)),
}

CERAMICA = np.array([0xF5, 0xF2, 0xEC]) / 255.0
TINTA = np.array([0x14, 0x14, 0x14]) / 255.0
AZAFRAN = np.array([0xD9, 0x9A, 0x2B]) / 255.0
MADERA = np.array([0xC9, 0xB0, 0x8C]) / 255.0
LUMA = np.array([0.299, 0.587, 0.114])

# el arroz negro y el pulpo ya son oscuros y saturados: se contienen mas
SATURACION = {
    "arroz-negro": 0.74, "arroz-chuleton": 0.80, "arroz-mixto": 0.78,
    "arroz-senyoret": 0.80, "arroz-vegano": 0.82, "zamburinas": 0.80,
    "pulpo": 0.78, "manos-arroz": 0.80, "rape": 0.84,
    "local-barra": 0.74, "local-sala": 0.74, "local-ventanal": 0.74,
    "local-flores": 0.78, "local-terraza": 0.74,
}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")


def origen(nombre, src):
    destino = os.path.join(SRC, "%s-%s.jpg" % (nombre, src))
    if os.path.exists(destino) and os.path.getsize(destino) > 40000:
        return destino
    url = ("https://images.pexels.com/photos/%s/pexels-photo-%s.jpeg"
           "?auto=compress&cs=tinysrgb&w=2400" % (src, src))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(destino, "wb") as f:
        f.write(r.read())
    return destino


def recortar(im, prop, anclaje):
    w, h = im.size
    if w / h > prop:
        nw = int(round(h * prop))
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(round(w / prop))
        y = int(round((h - nh) * anclaje))
        im = im.crop((0, y, w, y + nh))
    return im


def gradar(a, nombre):
    # balance de blancos gray-world, aplicado a medias (0.45) para no
    # lavar las fotos que son legitimamente calidas
    medias = a.reshape(-1, 3).mean(0)
    a = np.clip(a * (medias.mean() / np.maximum(medias, 1e-4)) ** 0.45, 0, 1)
    a = np.clip(a * 1.035, 0, 1)
    # curva en S leve: mas cuerpo sin romper las luces
    a = np.clip(a + 0.4 * (a - 0.5) * (1 - np.abs(a - 0.5) * 2) * 0.55, 0, 1)

    l = a @ LUMA
    gris = np.repeat(l[..., None], 3, axis=2)
    a = np.clip(gris + (a - gris) * SATURACION.get(nombre, 0.78), 0, 1)

    sombras = np.clip((0.48 - l) * 2.1, 0, 1)[..., None]
    luces = np.clip((l - 0.56) * 2.3, 0, 1)[..., None]
    medios = np.clip(1 - np.abs(l - 0.5) * 3.0, 0, 1)[..., None]
    medios_altos = np.clip(1 - np.abs(l - 0.68) * 3.4, 0, 1)[..., None]

    a = np.clip(a * (1 - sombras * 0.20) + TINTA * sombras * 0.20, 0, 1)
    a = np.clip(a * (1 - luces * 0.24) + CERAMICA * luces * 0.24, 0, 1)
    a = np.clip(a * (1 - medios * 0.05) + MADERA * medios * 0.05, 0, 1)
    # azafran solo en los puntos de luz, que es donde el brief lo pide
    a = np.clip(a * (1 - medios_altos * 0.07) + AZAFRAN * medios_altos * 0.07, 0, 1)

    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a = np.clip(a * (1 - np.clip(r - 0.72, 0, None) * 0.20)[..., None], 0, 1)

    rng = np.random.default_rng(11)
    a = np.clip(a + rng.normal(0, 0.005, a.shape), 0, 1)
    return a


def procesar(nombre, cfg):
    src, prop, anclaje, anchos = cfg
    im = Image.open(origen(nombre, src)).convert("RGB")
    im = recortar(im, prop, anclaje)
    mayor = max(anchos)
    if im.width > mayor:
        im = im.resize((mayor, int(round(mayor / prop))), Image.LANCZOS)
    a = gradar(np.asarray(im).astype(np.float32) / 255.0, nombre)
    base = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    hechos = []
    for ancho in sorted(set(anchos), reverse=True):
        o = base if base.width <= ancho else base.resize(
            (ancho, int(round(ancho / prop))), Image.LANCZOS)
        o.save(os.path.join(OUT, "%s-%d.jpg" % (nombre, ancho)),
               quality=congelar_calidad(ancho), optimize=True, progressive=True)
        hechos.append(ancho)
    lq = base.resize((24, max(2, int(round(24 / prop)))), Image.LANCZOS)
    buf = io.BytesIO()
    lq.save(buf, "JPEG", quality=50)
    return nombre, hechos, "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def congelar_calidad(ancho):
    return 80 if ancho >= 1100 else 84


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(4) as ex:
        res = list(ex.map(lambda kv: procesar(*kv), PHOTOS.items()))
    with open(os.path.join(os.path.dirname(__file__), "lqip.txt"), "w") as f:
        for nombre, anchos, lq in sorted(res):
            f.write("%s %s %s\n" % (nombre, ",".join(map(str, anchos)), lq))
            print(nombre, anchos)
