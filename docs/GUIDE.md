# Guide: build your own Life Tiles book

With this guide you build a life book for a family member: photos, stories, a map and a slideshow on a tablet. It works without internet and the photos stay on the tablet.

The app speaks English, Dutch, German, French or Spanish; you choose per book. (This guide and the Excel template are in English and Dutch.) Your own titles and stories can be in any language.

You need:

- a computer with Windows, Mac or Linux;
- an Android tablet (10 inch is comfortable) with Chrome; an iPad with Safari also works;
- a few evenings, mostly for choosing photos and writing the stories.

No programming is needed. You fill in an Excel file, put photos in folders and run one command.

## Quick route: make it on the tablet

No computer at hand? You can make the whole book on the tablet itself.

1. Open [lifetiles.web.app](https://lifetiles.web.app) in Chrome and install it (menu with three dots, **Install app** or **Add to home screen**).
2. Hold the title at the top for 3 seconds (or tap it 5 times) and choose **Make a new book on this tablet**. If a book is already loaded, **Change this book** edits it.
3. Under **About the book**, choose the language and fill in the title, the name, a line under the name and a portrait photo.
4. Tap a chapter group (children, partner, homes, schools, work, holidays, celebrations), then **+ Add a chapter**. Fill in title, years, place, country and the story, and add photos from the tablet's gallery. Photos are made smaller (at most 1920 pixels) and stored only on the tablet.
5. **Find on the map** looks up the place so it shows on the map. This is the only thing that uses the internet: just the place and country go to OpenStreetMap. You can also type the latitude and longitude yourself.
6. Everything is saved straight away. Tap **View the book** to see the result.
7. Tap **Save a copy (.zip)** now and then. The copy goes to Downloads; keep it safe (for example on a USB stick or in your own cloud). To move the book to another tablet, load that zip there with **Load a life book**.

The Excel route below is handier for big books with hundreds of photos, videos or fixed questions. A copy saved on the tablet can still be loaded on any tablet.

---

## Step 1. Decide what goes in

First fill in the [worksheet](WORKSHEET.md): who it is for, which chapters, the timeline, the stories and where the photos are. This is the most important step.

## Step 2. Get this project on your computer

1. Go to [github.com/HerberttenHave/life-tiles](https://github.com/HerberttenHave/life-tiles) and click **Code > Download ZIP**. Unpack it, for example in `Documents\life-tiles`.
2. Install **Python** (free) from [python.org](https://www.python.org/downloads/). On Windows, tick **Add Python to PATH**.
3. Open a command window in the `life-tiles` folder (Windows: type `cmd` in the Explorer address bar and press Enter) and install the tools:

   ```
   pip install -r requirements.txt
   ```

4. Optional, only for videos: install [ffmpeg](https://ffmpeg.org/download.html). Without ffmpeg, videos are skipped.

## Step 3. Create the empty Excel file

```
python tools/build_content.py --template
```

This creates `content/lifetiles.xlsx` with these tabs:

| Tab | What you fill in |
|---|---|
| **About** | Language (`en`, `nl`, `de`, `fr` or `es`), title, name, subtitle (e.g. "born 12 March 1937 in Dordrecht"), portrait photo, slideshow settings, a short introduction per chapter, and optionally your own tile names ("Tile name Partner" = "John") |
| **Children** | Name, born, town, story, photo folder |
| **Partner, Family, Homes, School, Work, Holidays, Celebrations** | One chapter per row: title, address, town, country, from, to, story, photo folder. Lat and Lon may stay empty. Put "no" in the **Slideshow** column to keep those photos out of the automatic slideshow |
| **Photos** (optional) | Per photo: file, caption, year and who is in it |

Tips:

- Leave a tab empty if you do not want that chapter; its tile will not appear.
- Chapters are sorted by year automatically.
- An empty line between two paragraphs in **Story** becomes a new paragraph in the app. In Excel, Alt+Enter makes a new line inside a cell.
- Places appear on the map automatically. The tool looks up coordinates via OpenStreetMap. If a pin is wrong, fill in Lat and Lon yourself (right-click the spot in Google Maps).

## Step 4. Collect the photos

Create one folder per chapter in `content/fotos/` and put the folder name in the **Photo folder** column. Example: the row "Parents' house" gets photo folder `Homes 1`, and its photos go into `content/fotos/Homes 1/`. Photos are shown in file name order.

**From Google Photos**

- Open [photos.google.com](https://photos.google.com), choose **Explore > People** and click the person. You now see every photo they are in.
- Select photos (tick at the top left of a photo, then Shift-click for a range) and press **Shift+D** to download them. You get a zip file.
- Everything at once: [Google Takeout](https://takeout.google.com) with only Google Photos ticked.
- Photos of the same trip without the person in them: search Google Photos for the place or the month ("Austria 1972", "July 1985").

**Old photo albums**

- Scan them with Google's free **PhotoScan** app on a phone. It removes glare and saves the photos to Google Photos.
- Write down what is written on the back. It makes the best captions.

**Other sources**

- Photos from siblings and grandchildren: ask them for a shared album.
- Old photos of the places themselves: local archives, Wikimedia Commons.

Mind:

- Remove duplicates, for example with your photo program's duplicate finder.
- Leave out passports, bank papers and other documents.
- Photos that belong nowhere can go into `content/fotos/Other/`. They then appear only in the slideshow.

## Step 5. Captions (optional)

In the **Photos** tab, fill in per photo the file (for example `Homes 1/photo3.jpg`), a caption, the year and who is in it. This appears under the photo and in the slideshow.

## Step 6. Fixed questions (optional)

You can add question buttons per chapter. The tablet reads the answer aloud, also without internet. Create a file `content/vragen/questions.json`:

```json
{
  "homes:Parents' house": [
    {
      "vraag": "How old is Dordrecht?",
      "antwoord": "Dordrecht received city rights in 1220. It is the oldest city in Holland.",
      "bronnen": ["https://en.wikipedia.org/wiki/Dordrecht"]
    }
  ]
}
```

The key is `<tab name in lower case>:<chapter title>`. `vraag` is the question, `antwoord` the answer, `bronnen` the sources. Check every answer and add the source. Write it the way you would tell it: short, without brackets or abbreviations.

## Step 7. Build the package

```
python tools/build_content.py
```

The result is in `dist/`: `lifetiles-1.zip`, `lifetiles-2.zip`, and so on. Each part is about 150 MB so a tablet can handle it. Photos are resized to 1920 pixels, videos converted to 720p.

Check the warnings in the window (for example a photo folder that does not exist).

## Step 8. Put the app on the tablet

**Opening the app**

Open **https://lifetiles.web.app** in Chrome on the tablet, or install **Life Tiles** from Google Play once it is there. Only the empty app is online; your photos never go there.

Prefer your own copy? Click **Fork** on GitHub, go to **Settings > Pages** in your copy, choose **Source: GitHub Actions**, and your app will be at `https://<your-name>.github.io/life-tiles/`.

**Installing on an Android tablet**

1. Make sure the tablet has wifi and a Google account. Update Chrome in the Play Store.
2. Open the address in Chrome.
3. Tap the three dots at the top right and choose **Install app** or **Add to home screen**.

If installing fails, a shortcut works too. After the first visit the app also works offline.

**Loading the package**

1. Put all `lifetiles-*.zip` files in the tablet's **Downloads** folder: with a USB cable, or via Google Drive (share a folder, then **Download** each file on the tablet).
2. Open the app and tap **Load a life book (.zip)**.
3. Select **all** parts at once: long-press the first file, then tap the others.
4. Wait until the bar is full. The zip files can then be deleted from Downloads; the app keeps its own copy.

While loading, keep about twice the size of the zip files free.

**Tablet settings**

- Hidden settings (load new content or erase everything): **hold the title at the top for 3 seconds**, or tap it 5 times quickly.
- When nobody touches the tablet for a few minutes, the slideshow starts. One tap brings you back.
- Best reading voice: **Settings > General management > Text-to-speech**, choose the Google speech engine and the book's language.
- Set a longer screen timeout and keep the tablet on a stand near a socket.

## Step 9. Asking questions with the microphone (optional, advanced)

With this feature the person can ask a question aloud, for example "What did the market look like back then?". A language model (Google's Gemini, with Google Search) gives a short answer that the tablet reads aloud, in the book's language. This only works with wifi, and only in your own copy of the app.

What goes over the internet: the spoken question, the name and subtitle from the **About** tab, and the chapter text (title, place, years, story). No photos.

1. Create a project in [Firebase](https://console.firebase.google.com) on the Blaze plan (pay as you go; a few questions a day cost cents). In Google Cloud, enable the **Vertex AI API** and create a **Firestore** database.
2. Install [Node.js](https://nodejs.org), then the Firebase tools: `npm install -g firebase-tools`, and sign in with `firebase login`.
3. Put this in `functions/.env`:

   ```
   LEVENSBOEK_ORIGINS=https://<your-name>.github.io
   LIFETILES_FAMILY=your children
   ```

4. Deploy the function: `cd functions`, `npm install`, `cd ..`, then `firebase deploy --only functions --project <your-project-id>`.
5. Put the address Firebase shows (ending in `/levensboekVraag`) into `app/config.js` as `vraagUrl`, and commit that change to your own GitHub copy.

The function answers at most 200 questions a day. Change `DAILY_CAP` in `functions/index.js` if you like.

## Step 10. Updating

New photos or stories? Update the Excel file and folders, run `python tools/build_content.py` again and load the new zip files through the hidden settings. The old package is replaced.

---

## Privacy

- Photos and stories live only on your computer and on the tablet. The app on the internet is an empty shell. See the [privacy policy](https://lifetiles.web.app/privacy.html).
- Never put real zip files in the `app/` folder. That folder goes online. `content/` and `dist/` are in `.gitignore`, so they cannot end up on GitHub by accident.
- Share the zip files only through a private folder, never through a public link.

## Troubleshooting

| Problem | Solution |
|---|---|
| "This app can't be installed" | Add a Google account to the tablet and update Chrome and Google Play services. Or use **Add to home screen**. |
| "This site can't be reached" | The tablet has no internet or the address is wrong. The first visit needs internet. |
| "Some parts are missing" | Select all zip files at once. |
| A place is wrong on the map | Fill in Lat and Lon yourself. |
| A video is missing | Install ffmpeg and build again. |
| A HEIC photo from an iPhone fails | `pip install pillow-heif` |
