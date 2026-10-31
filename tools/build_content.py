"""Build the Life Tiles tablet package (lifetiles-1.zip, -2.zip, ...) from an Excel file and photo folders.

Usage:
  python tools/build_content.py                        # content/ -> dist/lifetiles-*.zip
  python tools/build_content.py --template             # write an empty English content/lifetiles.xlsx
  python tools/build_content.py --template --lang nl   # the same in Dutch
  python tools/build_content.py --src DIR --out FILE   # other content folder / output

Content folder layout:
  lifetiles.xlsx (or levensboek.xlsx)  tabs in English (About, Children, ...) or Dutch (Over, Kinderen, ...)
  fotos/<photo folder>/*.jpg            one folder per row; photos sorted by file name
Internally (and in data.json) the Dutch names are used; English names are translated on reading.
"""
import argparse
import io
import json
import shutil
import subprocess
import tempfile
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SECTIONS = ["Kinderen", "Partner", "Gezin", "Wonen", "School", "Werk", "Vakanties", "Feesten"]
PLACE_COLS = ["Titel", "Adres", "Plaats", "Land", "Van", "Tot", "Verhaal", "Fotomap", "Lat", "Lon", "Diashow"]
COLUMNS = {
    "Over": ["Veld", "Waarde", "Uitleg"],
    "Kinderen": ["Naam", "Geboren", "Plaats", "Verhaal", "Fotomap"],
    "Partner": PLACE_COLS,
    "Gezin": PLACE_COLS,
    "Wonen": PLACE_COLS,
    "School": PLACE_COLS,
    "Werk": PLACE_COLS,
    "Vakanties": PLACE_COLS,
    "Feesten": PLACE_COLS,
    "Fotos": ["Bestand", "Onderschrift", "Jaar", "Wie staan erop"],
}
OVER_FIELDS = [
    ("Taal", "nl", "nl, en, de, fr of es: taal van de knoppen en de voorleesstem"),
    ("Titel", "", "Bovenaan het startscherm, bijvoorbeeld: Het leven van mam"),
    ("Naam", "", "Volledige naam onder de portretfoto"),
    ("Ondertitel", "", "Bijvoorbeeld: geboren 12 maart 1937 in Dordrecht"),
    ("Portretfoto", "", "Pad binnen de map fotos, bijvoorbeeld: Portret/mam.jpg"),
    ("Diashow seconden", 8, "Hoe lang elke foto in de diashow blijft staan"),
    ("Diashow na minuten", 3, "Na hoeveel minuten zonder aanraken de diashow start"),
] + [(f"Inleiding {s}", "", "Korte tekst boven de lijst (mag leeg)" if s == "Kinderen" else "") for s in SECTIONS] + [
    (f"Naam tegel {s}", "", "Andere naam voor deze tegel, bijvoorbeeld: Jan" if s == "Partner" else "")
    for s in SECTIONS]
# English names for tabs, columns and About fields; the Dutch names are the internal ones.
SHEET_EN = {"About": "Over", "Children": "Kinderen", "Partner": "Partner", "Family": "Gezin", "Homes": "Wonen",
            "School": "School", "Work": "Werk", "Holidays": "Vakanties", "Celebrations": "Feesten", "Photos": "Fotos"}
COL_EN = {"Field": "Veld", "Value": "Waarde", "Explanation": "Uitleg", "Name": "Naam", "Born": "Geboren",
          "Title": "Titel", "Address": "Adres", "Town": "Plaats", "Country": "Land", "From": "Van", "To": "Tot",
          "Story": "Verhaal", "Photo folder": "Fotomap", "Lat": "Lat", "Lon": "Lon", "Slideshow": "Diashow",
          "File": "Bestand", "Caption": "Onderschrift", "Year": "Jaar", "Who is in it": "Wie staan erop"}
SEC_EN = {nl: en for en, nl in SHEET_EN.items() if nl in SECTIONS}
OVER_EN = {"Title": "Titel", "Name": "Naam", "Subtitle": "Ondertitel", "Portrait photo": "Portretfoto",
           "Slideshow seconds": "Diashow seconden", "Slideshow after minutes": "Diashow na minuten", "Language": "Taal",
           **{f"Introduction {SEC_EN[s]}": f"Inleiding {s}" for s in SECTIONS},
           **{f"Tile name {SEC_EN[s]}": f"Naam tegel {s}" for s in SECTIONS}}
OVER_HELP_EN = {
    "Language": "en, nl, de, fr or es: language of the buttons and the reading voice",
    "Title": "At the top of the home screen, for example: Mum's life",
    "Name": "Full name under the portrait photo",
    "Subtitle": "For example: born 12 March 1937 in Dordrecht",
    "Portrait photo": "Path inside the fotos folder, for example: Portrait/mum.jpg",
    "Slideshow seconds": "How long each photo stays in the slideshow",
    "Slideshow after minutes": "After how many minutes without touching the slideshow starts",
    "Introduction Children": "Short text above the list (may be empty)",
    "Tile name Partner": "Another name for this tile, for example: Jan",
}
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff", ".bmp"}
VID_EXT = {".mp4", ".mov", ".m4v", ".3gp", ".avi", ".mkv", ".mts"}
MEDIA_EXT = IMG_EXT | VID_EXT
MAX_SIDE = 1920
PART_MB = 150


def write_template(path: Path, lang: str = "en"):
    en = lang == "en"
    sheet_name = {nl: e for e, nl in SHEET_EN.items()}
    col_name = {nl: e for e, nl in COL_EN.items()}
    field_name = {nl: e for e, nl in OVER_EN.items()}
    wb = Workbook()
    wb.remove(wb.active)
    head_fill = PatternFill("solid", fgColor="EAD9C6")
    for name, cols in COLUMNS.items():
        if en:
            name, cols = sheet_name[name], [col_name[c] for c in cols]
        ws = wb.create_sheet(name)
        ws.append(cols)
        for c in ws[1]:
            c.font = Font(bold=True)
            c.fill = head_fill
        for i, col in enumerate(cols, 1):
            width = 60 if col in ("Verhaal", "Uitleg", "Story", "Explanation") else 22
            ws.column_dimensions[ws.cell(1, i).column_letter].width = width
        ws.freeze_panes = "A2"
    for field, value, help_nl in OVER_FIELDS:
        if en:
            field = field_name[field]
            value = "en" if field == "Language" else value
            wb["About"].append([field, value, OVER_HELP_EN.get(field, "")])
        else:
            wb["Over"].append([field, value, help_nl])
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                c.alignment = Alignment(wrap_text=True, vertical="top")
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    print(f"Template written: {path}")


def rows(ws):
    it = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h else "" for h in next(it, [])]
    header = [COL_EN.get(h, h) for h in header]
    for r in it:
        if not any(v not in (None, "") for v in r):
            continue
        yield {header[i]: (r[i] if i < len(r) else None) for i in range(len(header))}


def txt(v):
    if v is None:
        return ""
    if hasattr(v, "strftime"):
        return v.strftime("%d-%m-%Y")
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def year_key(v):
    m = re.search(r"(1[89]\d\d|20\d\d)", txt(v))
    return int(m.group(1)) if m else 9999


class Geocoder:
    """Looks up coordinates for place names via OpenStreetMap Nominatim, cached on disk."""

    def __init__(self, cache_file: Path, enabled: bool):
        self.file = cache_file
        self.enabled = enabled
        self.cache = json.loads(cache_file.read_text("utf-8")) if cache_file.exists() else {}

    def lookup(self, query):
        if not query:
            return None
        if query in self.cache:
            return self.cache[query]
        if not self.enabled:
            return None
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"q": query, "format": "json", "limit": 1})
        req = urllib.request.Request(url, headers={"User-Agent": "levensboek-builder/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                res = json.load(r)
        except Exception as e:  # network trouble: just skip the pin
            print(f"  geocode failed for {query!r}: {e}")
            return None
        time.sleep(1.1)  # Nominatim policy: max 1 request per second
        val = [float(res[0]["lat"]), float(res[0]["lon"])] if res else None
        self.cache[query] = val
        self.file.write_text(json.dumps(self.cache, ensure_ascii=False, indent=1), "utf-8")
        print(f"  geocoded {query!r} -> {val}")
        return val


def build(src: Path, out: Path, geocode: bool):
    xlsx = next((x for x in (src / "lifetiles.xlsx", src / "levensboek.xlsx") if x.exists()), None)
    fotos_dir = src / "fotos"
    if not xlsx:
        sys.exit(f"Not found: {src / 'lifetiles.xlsx'}  (run with --template first)")
    book = load_workbook(xlsx, data_only=True)
    wb = {SHEET_EN.get(ws.title.strip(), ws.title.strip()): ws for ws in book.worksheets}
    geo = Geocoder(src / "geocache.json", geocode)

    fotos = {}          # id -> {src, onderschrift, jaar, wie}
    by_path = {}        # relative path -> id
    images = []         # (zip name, source path)
    captions = {}
    if "Fotos" in wb:
        for r in rows(wb["Fotos"]):
            p = txt(r.get("Bestand")).replace("\\", "/")
            if p:
                captions[p.lower()] = r

    def add_photo(path: Path):
        rel = path.relative_to(fotos_dir).as_posix()
        if rel in by_path:
            return by_path[rel]
        pid = f"f{len(fotos) + 1}"
        cap = captions.get(rel.lower(), {})
        is_vid = path.suffix.lower() in VID_EXT
        fotos[pid] = {
            "src": f"img/{pid}.jpg",
            **({"video": f"vid/{pid}.mp4"} if is_vid else {}),
            "onderschrift": txt(cap.get("Onderschrift")),
            "jaar": txt(cap.get("Jaar")),
            "wie": txt(cap.get("Wie staan erop")),
        }
        by_path[rel] = pid
        images.append((pid, path, is_vid))
        return pid

    def folder_photos(name):
        name = txt(name)
        if not name:
            return []
        d = fotos_dir / name
        if not d.is_dir():
            print(f"  WARNING: photo folder missing: {d}")
            return []
        files = sorted(p for p in d.rglob("*") if p.suffix.lower() in MEDIA_EXT)
        return [add_photo(p) for p in files]

    over = {OVER_EN.get(txt(r.get("Veld")), txt(r.get("Veld"))): r.get("Waarde") for r in rows(wb["Over"])} if "Over" in wb else {}
    taal = txt(over.get("Taal")).lower()
    taal = "nl" if taal.startswith(("nl", "ned", "dut")) else "en" if taal.startswith(("en", "eng")) else (taal[:2] or "en")
    data = {
        "taal": taal,
        "titel": txt(over.get("Titel")),  # empty: the app shows "My life" in the book's language
        "naam": txt(over.get("Naam")),
        "ondertitel": txt(over.get("Ondertitel")),
        "diashowSeconden": int(over.get("Diashow seconden") or 8),
        "diashowNaMinuten": float(over.get("Diashow na minuten") or 3),
        "inleiding": {s.lower(): txt(over.get(f"Inleiding {s}")) for s in SECTIONS},
        "labels": {s.lower(): txt(over.get(f"Naam tegel {s}")) for s in SECTIONS if txt(over.get(f"Naam tegel {s}"))},
        "secties": {},
        "fotos": fotos,
    }

    vragen = {}
    for f in sorted((src / "vragen").glob("*.json")) if (src / "vragen").is_dir() else []:
        vragen.update(json.loads(f.read_text("utf-8")))

    for sec in SECTIONS:
        if sec not in wb:
            continue
        items = []
        for r in rows(wb[sec]):
            it = {k.lower(): txt(v) for k, v in r.items() if k and k not in ("Fotomap", "Lat", "Lon", "Diashow")}
            it["fotos"] = folder_photos(r.get("Fotomap"))
            if txt(r.get("Diashow")).lower() in ("nee", "no"):
                # e.g. the farewell chapter: shown in its chapter, never in the automatic slideshow
                for pid in it["fotos"]:
                    fotos[pid]["diashow"] = False
            if sec != "Kinderen":
                lat, lon = r.get("Lat"), r.get("Lon")
                if lat in (None, "") or lon in (None, ""):
                    q = ", ".join(x for x in (txt(r.get("Adres")), txt(r.get("Plaats")), txt(r.get("Land"))) if x)
                    hit = geo.lookup(q) or (geo.lookup(", ".join(x for x in (txt(r.get("Plaats")), txt(r.get("Land"))) if x))
                                            if txt(r.get("Adres")) else None)
                    if hit:
                        lat, lon = hit
                if lat not in (None, "") and lon not in (None, ""):
                    it["lat"], it["lon"] = float(lat), float(lon)
            items.append(it)
        # Chronological; an entry without a year keeps its place after the entry above it.
        sort_field = "geboren" if sec == "Kinderen" else "van"
        last = 0
        for n, it in enumerate(items):
            y = year_key(it.get(sort_field) or it.get("tot"))
            last = last if y == 9999 else y
            it["_k"] = (last, n)
        items.sort(key=lambda it: it.pop("_k"))
        # Question buttons with checked, sourced answers: content/vragen/*.json, keyed "<sectie>:<titel>".
        for it in items:
            name = it.get('titel') or it.get('naam')
            qs = vragen.get(f"{sec.lower()}:{name}") or vragen.get(f"{SEC_EN[sec].lower()}:{name}")
            if qs:
                it["vragen"] = [{"vraag": q["vraag"], "antwoord": q["antwoord"], "bronnen": q.get("bronnen", [])} for q in qs]
        data["secties"][sec.lower()] = items

    portret = txt(over.get("Portretfoto")).replace("\\", "/")
    if portret and (fotos_dir / portret).exists():
        data["portret"] = add_photo(fotos_dir / portret)
    elif fotos:
        data["portret"] = next(iter(fotos))

    # Photos anywhere under fotos/ that no row refers to still go into the slideshow.
    if fotos_dir.exists():
        for p in sorted(fotos_dir.rglob("*")):
            if p.suffix.lower() in MEDIA_EXT:
                add_photo(p)

    out.parent.mkdir(parents=True, exist_ok=True)
    for old in out.parent.glob(out.stem + "-*.zip"):
        old.unlink()
    # Encode everything first, then pack into parts of about PART_MB so the tablet never
    # has to hold one huge zip in memory.
    blobs = []
    for i, (pid, path, is_vid) in enumerate(images, 1):
        if is_vid:
            mp4, poster = convert_video(path)
            if mp4 is None:
                print(f"  WARNING: video skipped (cannot convert): {path.name}")
                fotos[pid].pop("video", None)
                blobs.append((f"img/{pid}.jpg", to_jpeg_frame_fallback()))
                continue
            blobs += [(f"vid/{pid}.mp4", mp4), (f"img/{pid}.jpg", poster)]
        else:
            blobs.append((f"img/{pid}.jpg", to_jpeg(path)))
        if i % 25 == 0 or i == len(images):
            print(f"  media {i}/{len(images)}")
    parts, cur, size = [], [], 0
    for name, b in blobs:
        if cur and size + len(b) > PART_MB * 1e6:
            parts.append(cur); cur, size = [], 0
        cur.append((name, b)); size += len(b)
    parts.append(cur)
    data["delen"] = len(parts)
    paths = []
    for n, part in enumerate(parts, 1):
        pth = out.parent / f"{out.stem}-{n}.zip"
        with zipfile.ZipFile(pth, "w", zipfile.ZIP_STORED) as z:
            if n == 1:
                z.writestr("data.json", json.dumps(data, ensure_ascii=False, indent=1))
            for name, b in part:
                z.writestr(name, b)
        paths.append(pth)
    out = paths[0]
    n_items = sum(len(v) for v in data["secties"].values())
    total = sum(p.stat().st_size for p in paths) / 1e6
    print(f"Done: {len(paths)} part(s) in {paths[0].parent}  ({n_items} entries, {len(fotos)} media, {total:.0f} MB)")


def convert_video(path: Path):
    """Re-encode to 720p H.264 MP4 (plays on any Android tablet) and grab a poster frame."""
    ff = shutil.which("ffmpeg")
    if not ff:
        return None, None
    cache = ROOT / "werk" / "videocache" / f"{path.stem}_{path.stat().st_size}"
    if (cache / "v.mp4").exists() and (cache / "p.jpg").exists():
        return (cache / "v.mp4").read_bytes(), (cache / "p.jpg").read_bytes()
    with tempfile.TemporaryDirectory() as td:
        out, pos = Path(td) / "v.mp4", Path(td) / "p.jpg"
        r = subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(path), "-vf",
                            "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27",
                            "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(out)])
        if r.returncode or not out.exists():
            return None, None
        subprocess.run([ff, "-y", "-loglevel", "error", "-ss", "1", "-i", str(out), "-frames:v", "1", str(pos)])
        if not pos.exists():
            subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(out), "-frames:v", "1", str(pos)])
        mp4, poster = out.read_bytes(), to_jpeg(pos)
        cache.mkdir(parents=True, exist_ok=True)
        (cache / "v.mp4").write_bytes(mp4)
        (cache / "p.jpg").write_bytes(poster)
        return mp4, poster


def to_jpeg_frame_fallback() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (640, 360), "#222").save(buf, "JPEG")
    return buf.getvalue()


def to_jpeg(path: Path) -> bytes:
    if path.suffix.lower() == ".heic":
        try:
            import pillow_heif  # noqa: F401
            pillow_heif.register_heif_opener()
        except ImportError:
            sys.exit("HEIC photo found; install support with: pip install pillow-heif")
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85, optimize=True, progressive=True)
    return buf.getvalue()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "content"))
    ap.add_argument("--out", default=str(ROOT / "dist" / "lifetiles.zip"))
    ap.add_argument("--template", action="store_true")
    ap.add_argument("--lang", choices=["en", "nl"], default="en", help="language of the template")
    ap.add_argument("--no-geocode", action="store_true")
    a = ap.parse_args()
    if a.template:
        write_template(Path(a.src) / ("levensboek.xlsx" if a.lang == "nl" else "lifetiles.xlsx"), a.lang)
    else:
        build(Path(a.src), Path(a.out), not a.no_geocode)
