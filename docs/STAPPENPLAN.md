# Stappenplan: zelf een levensboek maken

Met dit stappenplan maak je een levensboek-app voor een familielid: foto's, verhalen, een kaart en een diashow op een tablet. Het werkt zonder internet en de foto's blijven op de tablet.

Je hebt nodig:

- een computer met Windows, Mac of Linux;
- een Android-tablet (10 inch is prettig) met Chrome; een iPad met Safari werkt ook;
- een paar avonden tijd, vooral voor het uitzoeken van foto's en het schrijven van de verhalen.

Programmeren hoeft niet. Je vult een Excel-bestand in, zet foto's in mappen en draait één opdracht.

---

## Stap 1. Bedenk wat erin moet

Vul eerst het [werkblad](WERKBLAD.md) in: voor wie het is, welke hoofdstukken, de tijdlijn, de verhalen en waar de foto's staan. Dit is de belangrijkste stap.

## Stap 2. Haal dit project op je computer

1. Ga naar de GitHub-pagina van dit project en klik op **Code > Download ZIP**. Pak het bestand uit, bijvoorbeeld in `Documenten\levensboek`.
2. Installeer **Python** (gratis) van [python.org](https://www.python.org/downloads/). Vink bij Windows **Add Python to PATH** aan.
3. Open een opdrachtvenster in de map `levensboek` (Windows: typ `cmd` in de adresbalk van de Verkenner en druk op Enter) en installeer de hulpmiddelen:

   ```
   pip install -r requirements.txt
   ```

4. Optioneel, alleen voor video's: installeer [ffmpeg](https://ffmpeg.org/download.html). Zonder ffmpeg worden video's overgeslagen.

## Stap 3. Maak het lege Excel-bestand

```
python tools/build_content.py --template
```

Dit maakt `content/levensboek.xlsx` met deze tabbladen:

| Tabblad | Wat vul je in |
|---|---|
| **Over** | Titel, naam, ondertitel (bijvoorbeeld "geboren 12 maart 1937 in Dordrecht"), portretfoto, diashow-instellingen, een korte inleiding per hoofdstuk en eventueel een eigen naam per tegel ("Naam tegel Partner" = "Jan") |
| **Kinderen** | Naam, geboren, plaats, verhaal, fotomap |
| **Partner, Gezin, Wonen, School, Werk, Vakanties, Feesten** | Per regel één hoofdstuk: titel, adres, plaats, land, van, tot, verhaal, fotomap. Lat en Lon mogen leeg blijven. Zet in kolom **Diashow** "nee" als die foto's niet in de automatische diashow mogen |
| **Fotos** (optioneel) | Per foto een onderschrift, het jaar en wie erop staan |

Tips:

- Laat een tabblad leeg als je dat hoofdstuk niet wilt; de tegel verschijnt dan niet.
- Hoofdstukken worden vanzelf op jaartal gesorteerd.
- Een lege regel tussen twee alinea's in **Verhaal** wordt een nieuwe alinea in de app. In Excel maak je een nieuwe regel in een cel met Alt+Enter.
- Plaatsen komen vanzelf op de kaart. Het programma zoekt de coördinaten op via OpenStreetMap. Staat een pin verkeerd, vul dan Lat en Lon zelf in (rechtsklik in Google Maps op de plek).

## Stap 4. Verzamel de foto's

Maak in `content/fotos/` één map per hoofdstuk en zet de mapnaam in de kolom **Fotomap**. Voorbeeld: regel "Ouderlijk huis" krijgt Fotomap `Wonen 1`, en de foto's staan in `content/fotos/Wonen 1/`. De volgorde is die van de bestandsnamen.

**Uit Google Foto's**

- Open [photos.google.com](https://photos.google.com), kies **Verkennen > Personen** en klik op de persoon. Zo zie je alle foto's waarop hij of zij staat.
- Selecteer foto's (vinkje linksboven op een foto, daarna met Shift een reeks) en druk op **Shift+D** om ze te downloaden. Je krijgt een zip-bestand.
- Alles in één keer: [Google Takeout](https://takeout.google.com) met alleen Google Foto's aangevinkt.
- Foto's van dezelfde reis waarop de persoon zelf niet staat: zoek in Google Foto's op de plaats of de maand ("Oostenrijk 1972", "juli 1985").

**Oude fotoalbums**

- Scan met de gratis app **PhotoScan** van Google op een telefoon. De app haalt spiegelingen weg en zet de foto's in Google Foto's.
- Schrijf op wat er achterop de foto staat. Dat is goud voor het onderschrift.

**Andere bronnen**

- Foto's van broers, zussen en kleinkinderen: vraag ze om een gedeeld album.
- Oude foto's van de plaatsen zelf: regionaal archief, Beeldbank, Delpher, Wikimedia Commons.

Let op:

- Haal dubbele foto's weg. Een simpele manier: sorteer de map op grootte of gebruik de duplicatenzoeker van je fotoprogramma.
- Laat paspoorten, bankpapieren en andere documenten weg.
- Foto's die nergens bij horen, mag je in een map `content/fotos/Overig/` zetten. Ze komen dan alleen in de diashow.

## Stap 5. Onderschriften (optioneel)

Vul in het tabblad **Fotos** per foto het pad in (bijvoorbeeld `Wonen 1/foto3.jpg`), een onderschrift, het jaar en wie erop staan. Dit verschijnt onder de foto en in de diashow.

## Stap 6. Vaste vragen (optioneel)

Per hoofdstuk kun je knoppen met vragen toevoegen. De tablet leest het antwoord hardop voor, ook zonder internet. Maak een bestand `content/vragen/vragen.json`:

```json
{
  "wonen:Ouderlijk huis": [
    {
      "vraag": "Hoe oud is Dordrecht?",
      "antwoord": "Dordrecht kreeg in 1220 stadsrechten. Het is de oudste stad van Holland.",
      "bronnen": ["https://nl.wikipedia.org/wiki/Dordrecht"]
    }
  ]
}
```

De sleutel is `<tabblad in kleine letters>:<titel van het hoofdstuk>`. Zoek elk antwoord na en zet de bron erbij. Schrijf het zoals je het zou vertellen: kort, zonder haakjes of afkortingen.

## Stap 7. Bouw het pakket

```
python tools/build_content.py
```

Het resultaat staat in `dist/`: `levensboek-1.zip`, `levensboek-2.zip`, enzovoort. Elk deel is ongeveer 150 MB, zodat een tablet het aankan. Foto's worden verkleind tot 1920 pixels, video's omgezet naar 720p.

Controleer de waarschuwingen in het venster (bijvoorbeeld een fotomap die niet bestaat).

Wil je eerst zien hoe het eruitziet? Zet de zip-bestanden op de tablet (stap 8) of open de app op je computer in Chrome en laad ze daar in.

## Stap 8. Zet de app op de tablet

**De app openen**

Je kunt de app direct gebruiken op **https://herberttenhave.github.io/levensboek/**. Daar staat alleen de lege app; jouw foto's komen er nooit op. Wil je een eigen adres of de microfoonfunctie (stap 9), maak dan een eigen kopie: klik op GitHub op **Fork**, ga in je kopie naar **Settings > Pages**, kies **Source: GitHub Actions**, en je app staat op `https://<jouw-naam>.github.io/levensboek/`.

**Installeren op een Android-tablet**

1. Zorg dat de tablet wifi heeft en dat er een Google-account op staat. Werk Chrome bij in de Play Store.
2. Open het adres in Chrome.
3. Tik op de drie puntjes rechtsboven en kies **App installeren** of **Toevoegen aan startscherm**.

Lukt installeren niet? Een snelkoppeling werkt ook. Na de eerste keer openen werkt de app ook zonder internet.

**Het pakket inladen**

1. Zet alle `levensboek-*.zip` bestanden in de map **Downloads** van de tablet: met een USB-kabel, of via Google Drive (map delen, op de tablet elk bestand **Downloaden**).
2. Open de app en tik op **Levensboek inladen (.zip)**.
3. Kies **alle** delen tegelijk: houd je vinger op het eerste bestand en tik de andere aan.
4. Wacht tot de balk vol is. Daarna mogen de zip-bestanden uit Downloads weg; de app bewaart alles zelf.

Zorg voor ruim twee keer zoveel vrije ruimte als de zip-bestanden samen tijdens het inladen.

**Instellingen op de tablet**

- Verborgen instellingen (nieuwe inhoud laden of alles wissen): **houd de titel bovenaan 3 seconden vast**, of tik er 5 keer snel op.
- Raakt niemand de tablet een paar minuten aan, dan start de diashow. Een tik brengt je terug.
- Mooiste voorleesstem: **Instellingen > Algemeen beheer > Tekst-naar-spraak**, kies de Google-spraakengine en Nederlands.
- Zet het scherm op langer aan blijven (**Instellingen > Scherm > Time-out scherm**) en de tablet in een standaard bij het stopcontact.

## Stap 9. Zelf vragen stellen met de microfoon (optioneel, voor gevorderden)

Met deze functie kan de persoon zelf een vraag inspreken, bijvoorbeeld "Hoe zag de markt er toen uit?". Een taalmodel (Gemini van Google, met Google Zoeken) geeft een kort antwoord dat de tablet voorleest. Dit werkt alleen met wifi.

Wat er naar internet gaat: de uitgesproken vraag, de naam en ondertitel uit het tabblad **Over**, en de tekst van het hoofdstuk (titel, plaats, jaren, verhaal). Geen foto's.

1. Maak een project in [Firebase](https://console.firebase.google.com) met het Blaze-abonnement (betalen per gebruik; een paar vragen per dag kosten centen). Zet in Google Cloud de **Vertex AI API** aan en maak een **Firestore**-database.
2. Installeer [Node.js](https://nodejs.org) en daarna de Firebase-tools: `npm install -g firebase-tools`, en log in met `firebase login`.
3. Zet in `functions/.env`:

   ```
   LEVENSBOEK_ORIGINS=https://<jouw-naam>.github.io
   LEVENSBOEK_FAMILIE=je kinderen
   ```

4. Publiceer de functie: `cd functions`, `npm install`, `cd ..`, en dan `firebase deploy --only functions --project <jouw-project-id>`.
5. Zet het adres dat Firebase toont (eindigt op `/levensboekVraag`) in `app/config.js` bij `vraagUrl`, en zet die wijziging in je eigen GitHub-kopie.

De functie beantwoordt hoogstens 200 vragen per dag. Pas `DAILY_CAP` in `functions/index.js` aan als je dat wilt.

## Stap 10. Bijwerken

Nieuwe foto's of verhalen? Pas het Excel-bestand en de mappen aan, draai `python tools/build_content.py` opnieuw en laad de nieuwe zip-bestanden in via de verborgen instellingen. Het oude pakket wordt dan vervangen.

---

## Privacy

- Foto's en verhalen staan alleen op jouw computer en op de tablet. De app op internet is een lege huls.
- Zet nooit echte zip-bestanden in de map `app/`. Die map gaat online. De map `content/` en `dist/` staan in `.gitignore`, zodat ze niet per ongeluk op GitHub komen.
- Deel de zip-bestanden alleen via een besloten map, niet via een openbare link.

## Problemen

| Probleem | Oplossing |
|---|---|
| "Deze app kan niet worden geïnstalleerd" | Zet een Google-account op de tablet en werk Chrome en Google Play-services bij. Of gebruik **Toevoegen aan startscherm**. |
| "Deze site is niet beschikbaar" | De tablet heeft geen internet of het adres klopt niet. Open het adres opnieuw in Chrome. De eerste keer is internet nodig. |
| "Er ontbreken delen" | Kies alle zip-bestanden tegelijk. |
| Een plaats staat verkeerd op de kaart | Vul Lat en Lon zelf in. |
| Een video ontbreekt | Installeer ffmpeg en bouw opnieuw. |
| Een HEIC-foto van een iPhone geeft een fout | `pip install pillow-heif` |
