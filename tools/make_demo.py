"""Generate clearly fictional demo content and build app/voorbeeld.zip from it."""
import json
import random
import shutil
import subprocess
import sys
from pathlib import Path

from openpyxl import load_workbook
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / "demo-content"
COLORS = {"Kinderen": "#b5473a", "Wonen": "#3f6e8c", "School": "#6a8a3a", "Werk": "#8a5a9a",
          "Vakanties": "#c98a1e", "Partner": "#5b6e8c", "Portret": "#7a4a2a"}

STORY = ("Dit is een voorbeeldtekst. Hier komt het verhaal: wat ze zich herinnert, "
         "wie erbij waren en wat het bijzonder maakte.\n\nEen tweede alinea kan ook.")
ROWS = {
    "Kinderen": [("Voorbeeldkind 1", "1960", "Dordrecht", STORY), ("Voorbeeldkind 2", "1963", "Dordrecht", STORY),
                 ("Voorbeeldkind 3", "1967", "Utrecht", STORY)],
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
}


def font(size):
    for f in ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def placeholder(path: Path, color: str, title: str, n: int):
    w, hgt = (1600, 1100) if n % 3 else (1100, 1500)
    im = Image.new("RGB", (w, hgt), color)
    d = ImageDraw.Draw(im)
    rnd = random.Random(title + str(n))
    for _ in range(14):
        x, y, r = rnd.randint(0, w), rnd.randint(0, hgt), rnd.randint(60, 260)
        d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(min(255, c + 25) for c in im.getpixel((5, 5))))
    d.text((w / 2, hgt / 2 - 60), "Voorbeeldfoto", font=font(90), fill="white", anchor="mm")
    d.text((w / 2, hgt / 2 + 50), f"{title} ({n})", font=font(60), fill="white", anchor="mm")
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, quality=88)


def main():
    if DEMO.exists():
        shutil.rmtree(DEMO)
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_content.py"), "--template", "--src", str(DEMO)], check=True)
    wb = load_workbook(DEMO / "levensboek.xlsx")
    over = {"Titel": "Voorbeeld levensboek", "Naam": "Voorbeeldnaam", "Ondertitel": "Alle namen en foto's zijn voorbeelden",
            "Portretfoto": "Portret/portret.jpg", "Diashow na minuten": 3,
            "Naam tegel Partner": "Jan"}
    for row in wb["Over"].iter_rows(min_row=2):
        if row[0].value in over:
            row[1].value = over[row[0].value]
    placeholder(DEMO / "fotos/Portret/portret.jpg", COLORS["Portret"], "Portret", 1)
    fotos_rows = []
    for sec, items in ROWS.items():
        for i, r in enumerate(items, 1):
            folder = f"{sec} {i}"
            title = r[0]
            for n in range(1, 4):
                placeholder(DEMO / "fotos" / folder / f"foto{n}.jpg", COLORS[sec], title, n)
                fotos_rows.append([f"{folder}/foto{n}.jpg", f"{title}, voorbeeldonderschrift", "", ""])
            if sec == "Kinderen":
                wb[sec].append([r[0], r[1], r[2], r[3], folder])
            else:
                wb[sec].append([r[0], r[1], r[2], r[3], r[4], r[5], STORY, folder, r[6], r[7]])
    for fr in fotos_rows:
        wb["Fotos"].append(fr)
    wb.save(DEMO / "levensboek.xlsx")
    # One chapter with fixed questions, to show the "Vraag het maar" box.
    (DEMO / "vragen").mkdir(exist_ok=True)
    (DEMO / "vragen" / "voorbeeld.json").write_text(json.dumps({"wonen:Huis met de tuin": [
        {"vraag": "Hoe groot was Utrecht toen?", "antwoord": "Dit is een voorbeeldantwoord. Hier staat een kort, "
         "nagezocht antwoord dat de tablet hardop voorleest.", "bronnen": ["https://nl.wikipedia.org/wiki/Utrecht_(stad)"]},
        {"vraag": "Wat voor huizen werden er gebouwd?", "antwoord": "Ook dit is een voorbeeldantwoord.", "bronnen": []}]},
        ensure_ascii=False, indent=1), "utf-8")
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_content.py"), "--src", str(DEMO),
                    "--out", str(ROOT / "app" / "voorbeeld.zip"), "--no-geocode"], check=True)


if __name__ == "__main__":
    main()
