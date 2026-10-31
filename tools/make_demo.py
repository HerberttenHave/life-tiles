"""Generate clearly fictional demo content and build app/demo-en-1.zip and app/demo-nl-1.zip from it."""
import json
import random
import shutil
import subprocess
import sys
from pathlib import Path

from openpyxl import load_workbook
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
COLORS = {"Kinderen": "#b5473a", "Wonen": "#3f6e8c", "School": "#6a8a3a", "Werk": "#8a5a9a",
          "Vakanties": "#c98a1e", "Partner": "#5b6e8c", "Portret": "#7a4a2a"}

# Per language: About fields, the story text, and rows (title, address, town, country, from, to, lat, lon).
DEMO = {
    "en": {
        "over": {"Taal": "en", "Titel": "Example life book", "Naam": "Example name",
                 "Ondertitel": "All names and photos are examples", "Naam tegel Partner": "John"},
        "photo": "Example photo", "caption": "example caption",
        "story": ("This is an example text. The story goes here: what she remembers, "
                  "who was there and what made it special.\n\nA second paragraph works too."),
        "rows": {
            "Kinderen": [("Example child 1", "1960", "Dordrecht"), ("Example child 2", "1963", "Dordrecht"),
                         ("Example child 3", "1967", "Utrecht")],
            "Partner": [("Our wedding", "", "Dordrecht", "Netherlands", "1958", "1958", 51.814, 4.668)],
            "Wonen": [("Parents' house", "", "Dordrecht", "Netherlands", "1937", "1958", 51.813, 4.690),
                      ("First home of our own", "", "Zwijndrecht", "Netherlands", "1958", "1965", 51.815, 4.640),
                      ("House with the garden", "", "Utrecht", "Netherlands", "1965", "2001", 52.090, 5.121)],
            "School": [("Primary school", "", "Dordrecht", "Netherlands", "1943", "1949", 51.810, 4.668),
                       ("Domestic science school", "", "Dordrecht", "Netherlands", "1949", "1953", 51.806, 4.676)],
            "Werk": [("Shop in town", "", "Rotterdam", "Netherlands", "1953", "1960", 51.922, 4.479)],
            "Vakanties": [("Camping by the sea", "", "Renesse", "Netherlands", "1966", "1966", 51.733, 3.775),
                          ("To the mountains", "", "Innsbruck", "Austria", "1972", "1972", 47.269, 11.404),
                          ("Sun in the south", "", "Lloret de Mar", "Spain", "1985", "1985", 41.700, 2.845)],
        },
        "vragen": {"wonen:House with the garden": [
            {"vraag": "How big was Utrecht back then?", "antwoord": "This is an example answer. A short, checked "
             "answer goes here, and the tablet reads it aloud.", "bronnen": ["https://en.wikipedia.org/wiki/Utrecht"]},
            {"vraag": "What kind of houses were built?", "antwoord": "This is an example answer too.", "bronnen": []}]},
    },
    "nl": {
        "over": {"Taal": "nl", "Titel": "Voorbeeld levensboek", "Naam": "Voorbeeldnaam",
                 "Ondertitel": "Alle namen en foto's zijn voorbeelden", "Naam tegel Partner": "Jan"},
        "photo": "Voorbeeldfoto", "caption": "voorbeeldonderschrift",
        "story": ("Dit is een voorbeeldtekst. Hier komt het verhaal: wat ze zich herinnert, "
                  "wie erbij waren en wat het bijzonder maakte.\n\nEen tweede alinea kan ook."),
        "rows": {
            "Kinderen": [("Voorbeeldkind 1", "1960", "Dordrecht"), ("Voorbeeldkind 2", "1963", "Dordrecht"),
                         ("Voorbeeldkind 3", "1967", "Utrecht")],
            "Partner": [("Ons trouwen", "", "Dordrecht", "Nederland", "1958", "1958", 51.814, 4.668)],
            "Wonen": [("Ouderlijk huis", "", "Dordrecht", "Nederland", "1937", "1958", 51.813, 4.690),
                      ("Eerste eigen huis", "", "Zwijndrecht", "Nederland", "1958", "1965", 51.815, 4.640),
                      ("Huis met de tuin", "", "Utrecht", "Nederland", "1965", "2001", 52.090, 5.121)],
            "School": [("Lagere school", "", "Dordrecht", "Nederland", "1943", "1949", 51.810, 4.668),
                       ("Huishoudschool", "", "Dordrecht", "Nederland", "1949", "1953", 51.806, 4.676)],
            "Werk": [("Winkel in de stad", "", "Rotterdam", "Nederland", "1953", "1960", 51.922, 4.479)],
            "Vakanties": [("Kamperen aan zee", "", "Renesse", "Nederland", "1966", "1966", 51.733, 3.775),
                          ("Naar de bergen", "", "Innsbruck", "Oostenrijk", "1972", "1972", 47.269, 11.404),
                          ("Zon in het zuiden", "", "Lloret de Mar", "Spanje", "1985", "1985", 41.700, 2.845)],
        },
        "vragen": {"wonen:Huis met de tuin": [
            {"vraag": "Hoe groot was Utrecht toen?", "antwoord": "Dit is een voorbeeldantwoord. Hier staat een kort, "
             "nagezocht antwoord dat de tablet hardop voorleest.", "bronnen": ["https://nl.wikipedia.org/wiki/Utrecht_(stad)"]},
            {"vraag": "Wat voor huizen werden er gebouwd?", "antwoord": "Ook dit is een voorbeeldantwoord.", "bronnen": []}]},
    },
}


def font(size):
    for f in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def placeholder(path: Path, color: str, label: str, title: str, n: int):
    w, hgt = (1600, 1100) if n % 3 else (1100, 1500)
    im = Image.new("RGB", (w, hgt), color)
    d = ImageDraw.Draw(im)
    rnd = random.Random(title + str(n))
    for _ in range(14):
        x, y, r = rnd.randint(0, w), rnd.randint(0, hgt), rnd.randint(60, 260)
        d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(min(255, c + 25) for c in im.getpixel((5, 5))))
    d.text((w / 2, hgt / 2 - 60), label, font=font(90), fill="white", anchor="mm")
    d.text((w / 2, hgt / 2 + 50), f"{title} ({n})", font=font(60), fill="white", anchor="mm")
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, quality=88)


def build(lang):
    cfg = DEMO[lang]
    src = ROOT / f"demo-content-{lang}"
    if src.exists():
        shutil.rmtree(src)
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_content.py"), "--template", "--lang", "nl",
                    "--src", str(src)], check=True)
    wb = load_workbook(src / "levensboek.xlsx")
    over = {**cfg["over"], "Portretfoto": "Portret/portret.jpg", "Diashow na minuten": 3}
    for row in wb["Over"].iter_rows(min_row=2):
        if row[0].value in over:
            row[1].value = over[row[0].value]
    placeholder(src / "fotos/Portret/portret.jpg", COLORS["Portret"], cfg["photo"], cfg["over"]["Naam"], 1)
    for sec, items in cfg["rows"].items():
        for i, r in enumerate(items, 1):
            folder = f"{sec} {i}"
            for n in range(1, 4):
                placeholder(src / "fotos" / folder / f"foto{n}.jpg", COLORS[sec], cfg["photo"], r[0], n)
                wb["Fotos"].append([f"{folder}/foto{n}.jpg", f"{r[0]}, {cfg['caption']}", "", ""])
            if sec == "Kinderen":
                wb[sec].append([r[0], r[1], r[2], cfg["story"], folder])
            else:
                wb[sec].append([r[0], r[1], r[2], r[3], r[4], r[5], cfg["story"], folder, r[6], r[7]])
    wb.save(src / "levensboek.xlsx")
    # One chapter with fixed questions, to show the question box.
    (src / "vragen").mkdir(exist_ok=True)
    (src / "vragen" / "demo.json").write_text(json.dumps(cfg["vragen"], ensure_ascii=False, indent=1), "utf-8")
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_content.py"), "--src", str(src),
                    "--out", str(ROOT / "app" / f"demo-{lang}.zip"), "--no-geocode"], check=True)
    shutil.rmtree(src)


if __name__ == "__main__":
    for lang in DEMO:
        build(lang)
