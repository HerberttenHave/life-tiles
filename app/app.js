/* Life Tiles: offline photo and life-story app for a 10-inch tablet.
   All content lives in IndexedDB on the tablet: imported from a .zip built by
   tools/build_content.py, or made on the tablet itself with the book maker.
   Nothing is sent anywhere, except optional place lookups in the book maker. */
(() => {
'use strict';

const SECS = {
  kinderen:  { icon: '\u{1F46A}', color: 'var(--c-kinderen)',  hex: '#b5473a' },
  partner:   { icon: '❤',     color: 'var(--c-partner)',   hex: '#5b6e8c' },
  gezin:     { icon: '\u{1F46A}', color: 'var(--c-gezin)',     hex: '#7a6a3a' },
  wonen:     { icon: '\u{1F3E0}', color: 'var(--c-wonen)',     hex: '#3f6e8c' },
  school:    { icon: '\u{1F3EB}', color: 'var(--c-school)',    hex: '#6a8a3a' },
  werk:      { icon: '\u{1F4BC}', color: 'var(--c-werk)',      hex: '#8a5a9a' },
  vakanties: { icon: '\u{1F3D6}', color: 'var(--c-vakanties)', hex: '#c98a1e' },
  feesten:   { icon: '\u{1F389}', color: 'var(--c-feesten)',   hex: '#2f7f74' },
};

/* Interface texts. The book's language comes from its content (tab About, row Language);
   before any content is loaded the tablet's own language decides. */
const TEXTS = {
  en: {
    speech: 'en-GB', sort: 'en',
    labels: { kinderen: 'My children', partner: 'My partner', gezin: 'Children and grandchildren', wonen: 'Where I lived',
      school: 'My schools', werk: 'My work', vakanties: 'Holidays', feesten: 'Family and celebrations' },
    defaultTitle: 'My life', to: 'to', born: 'Born', bornIn: 'in', allPhotos: "See all photos", map: 'Map',
    prev: 'Previous', next: 'Next', back: '← Back', home: '⌂ Home', close: '✕ Close', tapToReturn: 'Tap the screen to go back',
    showOnMap: 'Show on the map', askTitle: 'Just ask', askOwn: 'Ask your own question', stop: '⏹ Stop reading',
    source: 'Source: ', youAsked: q => `You asked: “${q}”. Let me think...`, noAnswer: 'I cannot look that up right now. Is the wifi on?',
    listening: "I'm listening... Go ahead and ask.", notHeard: "I didn't quite hear that. Tap the microphone again.",
    homeRegion: 'Around home', all: 'Everything', atThisSpot: 'At this spot:', places: n => `${n} places`,
    setupTitle: 'Set up Life Tiles', replace: 'Replace the content', welcome: 'Welcome',
    pickHelp: 'Choose <b>all</b> files <b>…-1.zip</b>, <b>…-2.zip</b>, ... that are on this tablet (for example in the Downloads folder). Press and hold the first file, then tap the others. The photos are stored only on this tablet.',
    load: 'Load a life book (.zip)', demo: 'See an example', wipe: 'Erase everything from this tablet',
    tip: 'Tip: in Chrome, open the menu (three dots) and choose <i>Add to home screen</i> or <i>Install app</i>.',
    demoMissing: 'Example not found', wipeConfirm: 'Are you sure you want to erase all photos and stories from this tablet?',
    noBook: 'No life book found: choose all parts at once (…-1.zip, …-2.zip, ...).',
    missingParts: (a, b) => `Some parts are missing: ${a} of ${b} chosen. Choose them all at once.`,
    make: 'Make a new book on this tablet', edit: 'Change this book', makerTitle: 'Book maker',
    newConfirm: 'Start a new, empty book? The book now on this tablet will be erased. Save a copy first if you want to keep it.',
    aboutBook: 'About the book', autoSaved: 'Everything is saved on this tablet straight away.',
    fTitle: 'Title at the top of the screen', fName: 'Name under the portrait', fSub: 'Line under the name, for example: born 12 March 1937 in Dordrecht',
    fLang: 'Language of the buttons and the reading voice', portrait: 'Portrait photo', pickPortrait: 'Choose a portrait photo',
    chapters: 'Chapters', nChapters: n => n === 1 ? '1 chapter' : `${n} chapters`, addChapter: '+ Add a chapter',
    noChapters: 'No chapters yet. Tap the button above to add the first one.',
    fChTitle: 'Title', fChName: 'Name', fBorn: 'Born (year or date)', fPlace: 'Town or place', fCountry: 'Country',
    fFrom: 'From (year)', fTo: 'To (year)', fStory: 'Story', storyHelp: 'Leave an empty line to start a new paragraph.',
    photos: 'Photos', addPhotos: '+ Add photos from this tablet', caption: 'Caption (may be empty)', removePhoto: '✕ Remove',
    firstPhoto: 'First photo, shown on the tile', makeFirst: 'Show first',
    preparing: (a, b) => `Preparing photos: ${a} of ${b}`, skipped: n => `${n} file(s) could not be read and were skipped.`,
    location: 'Place on the map', findPlace: '🔍 Find on the map', finding: 'Looking it up...',
    found: n => `Found: ${n}`, notFound: 'Not found. Check the spelling, or fill in the numbers by hand.',
    geoFail: 'Looking up needs internet. You can also fill in the numbers by hand.', lat: 'Latitude', lon: 'Longitude',
    geoNote: 'Find on the map sends only the place and country to OpenStreetMap. Nothing else leaves this tablet.',
    deleteChapter: 'Delete this chapter', deleteConfirm: 'Delete this chapter and its photos?', untitled: '(no title yet)',
    viewBook: 'View the book', exportZip: 'Save a copy (.zip)', exporting: 'Making the copy...',
    exportHelp: 'The copy goes to the Downloads folder. Keep it safe, or load it on another tablet with "Load a life book".',
  },
  nl: {
    speech: 'nl-NL', sort: 'nl',
    labels: { kinderen: 'Mijn kinderen', partner: 'Mijn partner', gezin: 'Kinderen en kleinkinderen', wonen: 'Waar ik woonde',
      school: 'Mijn scholen', werk: 'Mijn werk', vakanties: 'Vakanties', feesten: 'Feesten en familie' },
    defaultTitle: 'Mijn levensboek', to: 'tot', born: 'Geboren', bornIn: 'in', allPhotos: "Alle foto's bekijken", map: 'Kaart',
    prev: 'Vorige', next: 'Volgende', back: '← Terug', home: '⌂ Begin', close: '✕ Sluiten', tapToReturn: 'Tik op het scherm om terug te gaan',
    showOnMap: 'Laat zien op de kaart', askTitle: 'Vraag het maar', askOwn: 'Stel zelf een vraag', stop: '⏹ Stop met voorlezen',
    source: 'Bron: ', youAsked: q => `Jij vroeg: “${q}”. Even denken...`, noAnswer: 'Het lukt nu even niet om dat op te zoeken. Staat de wifi aan?',
    listening: 'Ik luister... Stel je vraag maar.', notHeard: 'Ik heb je niet goed verstaan. Tik nog eens op de microfoon.',
    homeRegion: 'Rond huis', all: 'Alles', atThisSpot: 'Op deze plek:', places: n => `${n} plaatsen`,
    setupTitle: 'Life Tiles instellen', replace: 'Inhoud vervangen', welcome: 'Welkom',
    pickHelp: 'Kies <b>alle</b> bestanden <b>…-1.zip</b>, <b>…-2.zip</b>, ... die op deze tablet staan (bijvoorbeeld in de map Downloads). Houd je vinger op het eerste bestand en tik daarna de andere aan. De foto\'s worden alleen op deze tablet bewaard.',
    load: 'Levensboek inladen (.zip)', demo: 'Voorbeeld bekijken', wipe: 'Alles van deze tablet wissen',
    tip: 'Tip: kies in Chrome in het menu (drie puntjes) voor <i>Toevoegen aan startscherm</i> of <i>App installeren</i>.',
    demoMissing: 'Voorbeeld niet gevonden', wipeConfirm: 'Weet je zeker dat je alle foto’s en verhalen van deze tablet wilt wissen?',
    noBook: 'Geen levensboek gevonden: kies alle delen tegelijk (…-1.zip, …-2.zip, ...).',
    missingParts: (a, b) => `Er ontbreken delen: ${a} van ${b} gekozen. Kies ze allemaal tegelijk.`,
    make: 'Nieuw boek maken op deze tablet', edit: 'Dit boek aanpassen', makerTitle: 'Boek maken',
    newConfirm: 'Een nieuw, leeg boek beginnen? Het boek dat nu op deze tablet staat wordt gewist. Bewaar eerst een kopie als je het wilt houden.',
    aboutBook: 'Over het boek', autoSaved: 'Alles wordt meteen op deze tablet bewaard.',
    fTitle: 'Titel bovenaan het scherm', fName: 'Naam onder het portret', fSub: 'Regel onder de naam, bijvoorbeeld: geboren 12 maart 1937 in Dordrecht',
    fLang: 'Taal van de knoppen en de voorleesstem', portrait: 'Portretfoto', pickPortrait: 'Kies een portretfoto',
    chapters: 'Hoofdstukken', nChapters: n => n === 1 ? '1 hoofdstuk' : `${n} hoofdstukken`, addChapter: '+ Hoofdstuk toevoegen',
    noChapters: 'Nog geen hoofdstukken. Tik op de knop hierboven om het eerste toe te voegen.',
    fChTitle: 'Titel', fChName: 'Naam', fBorn: 'Geboren (jaar of datum)', fPlace: 'Plaats', fCountry: 'Land',
    fFrom: 'Van (jaar)', fTo: 'Tot (jaar)', fStory: 'Verhaal', storyHelp: 'Laat een regel leeg om een nieuwe alinea te beginnen.',
    photos: "Foto's", addPhotos: "+ Foto's van deze tablet toevoegen", caption: 'Onderschrift (mag leeg)', removePhoto: '✕ Weghalen',
    firstPhoto: 'Eerste foto, staat op de tegel', makeFirst: 'Als eerste',
    preparing: (a, b) => `Foto's klaarmaken: ${a} van ${b}`, skipped: n => `${n} bestand(en) konden niet gelezen worden en zijn overgeslagen.`,
    location: 'Plek op de kaart', findPlace: '🔍 Zoek op de kaart', finding: 'Even zoeken...',
    found: n => `Gevonden: ${n}`, notFound: 'Niet gevonden. Kijk de spelling na, of vul de getallen zelf in.',
    geoFail: 'Zoeken lukt alleen met internet. Je kunt de getallen ook zelf invullen.', lat: 'Breedtegraad', lon: 'Lengtegraad',
    geoNote: 'Zoek op de kaart stuurt alleen de plaats en het land naar OpenStreetMap. Verder gaat er niets van deze tablet af.',
    deleteChapter: 'Dit hoofdstuk verwijderen', deleteConfirm: "Dit hoofdstuk en de foto's erin verwijderen?", untitled: '(nog geen titel)',
    viewBook: 'Boek bekijken', exportZip: 'Kopie bewaren (.zip)', exporting: 'Kopie maken...',
    exportHelp: 'De kopie komt in de map Downloads. Bewaar hem goed, of laad hem op een andere tablet in met "Levensboek inladen".',
  },
};
let T = TEXTS.en;
function pickLanguage() {
  const want = String((DATA && DATA.taal) || navigator.language || 'en').slice(0, 2).toLowerCase();
  T = TEXTS[want] || TEXTS.en;
  document.documentElement.lang = want in TEXTS ? want : 'en';
  for (const k of Object.keys(SECS)) SECS[k].label = ((DATA && DATA.labels) || {})[k] || T.labels[k];
  $('#btnBack').textContent = T.back; $('#btnHome').textContent = T.home;
  $('.lbclose').textContent = T.close; $('#ssHint').textContent = T.tapToReturn;
  $('.lbnav.prev').setAttribute('aria-label', T.prev); $('.lbnav.next').setAttribute('aria-label', T.next);
  pickVoice();
}

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? vals[i] : ''), '');

let DATA = null;
const CONFIG = window.LEVENSBOEK_CONFIG || {};
const urlCache = new Map();

/* ---------- IndexedDB ---------- */
function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('levensboek', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('files'); r.result.createObjectStore('meta'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function dbDo(store, mode, fn) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    const out = fn(tx.objectStore(store));
    tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    tx.onerror = () => rej(tx.error);
  });
}
const dbGet = (store, key) => dbDo(store, 'readonly', s => s.get(key));
const dbPut = (store, key, val) => dbDo(store, 'readwrite', s => s.put(val, key));
const dbClear = store => dbDo(store, 'readwrite', s => s.clear());
const dbDel = (store, key) => dbDo(store, 'readwrite', s => s.delete(key));

async function photoUrl(id) {
  if (!id) return '';
  if (urlCache.has(id)) return urlCache.get(id);
  const f = DATA.fotos[id];
  if (!f) return '';
  const blob = await dbGet('files', f.src);
  const u = blob ? URL.createObjectURL(blob) : '';
  urlCache.set(id, u);
  return u;
}
async function fillImages(root = view) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    img.src = await photoUrl(img.dataset.photo);
  }
}

/* ---------- Import ---------- */
/* Accepts one or more zip parts (levensboek-1.zip, -2.zip, ...). One part holds data.json. */
async function importZip(blobs, onProgress) {
  blobs = [].concat(blobs);
  let data = null, done = 0;
  await dbClear('files');
  for (let p = 0; p < blobs.length; p++) {
    let zip = await JSZip.loadAsync(blobs[p]);
    const dataFile = zip.file('data.json');
    if (dataFile) data = JSON.parse(await dataFile.async('string'));
    const media = Object.values(zip.files).filter(f => !f.dir && (f.name.startsWith('img/') || f.name.startsWith('vid/')));
    for (let i = 0; i < media.length; i++) {
      const f = media[i];
      const b = await f.async('blob');
      await dbPut('files', f.name, new Blob([b], { type: f.name.endsWith('.mp4') ? 'video/mp4' : f.name.endsWith('.png') ? 'image/png' : 'image/jpeg' }));
      onProgress && onProgress((p + (i + 1) / media.length) / blobs.length);
    }
    zip = null; done++;
  }
  if (!data) throw new Error(T.noBook);
  if (data.delen && done < data.delen) throw new Error(T.missingParts(done, data.delen));
  await dbPut('meta', 'data', data);
  urlCache.forEach(u => u && URL.revokeObjectURL(u));
  urlCache.clear();
  DATA = data;
  pickLanguage();
}

/* ---------- Helpers ---------- */
function period(it) {
  if (it.van && it.tot && it.van !== it.tot) return `${esc(it.van)} ${T.to} ${esc(it.tot)}`;
  return esc(it.van || it.tot || it.jaar || '');
}
function placeLine(it) { return [it.adres, it.plaats, it.land].filter(Boolean).map(esc).join(', '); }
function sectionItems(key) { return (DATA.secties && DATA.secties[key]) || []; }
function coverOf(items) { for (const it of items) if (it.fotos && it.fotos.length) return it.fotos[0]; return ''; }
function allPhotoIds() { return Object.keys(DATA.fotos || {}).filter(id => !DATA.fotos[id].video && DATA.fotos[id].diashow !== false); }
async function videoUrl(id) {
  const key = 'v:' + id;
  if (urlCache.has(key)) return urlCache.get(key);
  const blob = await dbGet('files', DATA.fotos[id].video);
  const u = blob ? URL.createObjectURL(blob) : '';
  urlCache.set(key, u);
  return u;
}
/* Shows photo or video `id` inside container `box`, replacing what was there. */
async function showMedia(box, id, onPhotoTap) {
  const f = DATA.fotos[id] || {};
  box.querySelectorAll('video').forEach(v => v.pause());
  let el = box.querySelector('.media');
  const want = f.video ? 'VIDEO' : 'IMG';
  if (!el || el.tagName !== want) {
    if (el) el.remove();
    el = document.createElement(want.toLowerCase());
    el.className = 'media';
    if (f.video) { el.controls = true; el.playsInline = true; el.setAttribute('controlslist', 'nodownload noremoteplayback'); }
    box.prepend(el);
  }
  if (f.video) { el.poster = await photoUrl(id); el.src = await videoUrl(id); }
  else { el.src = await photoUrl(id); el.onclick = onPhotoTap || null; }
  return f;
}
function setBar(title, showBack = true) {
  $('#title').textContent = title;
  $('#btnBack').classList.toggle('hide', !showBack);
  $('#btnHome').classList.toggle('hide', !showBack);
}

/* ---------- Screens ---------- */
function renderHome() {
  if (edited) { tidyAll(); edited = false; }
  setBar(DATA.titel || T.defaultTitle, false);
  const tiles = Object.entries(SECS).filter(([k]) => sectionItems(k).length).map(([k, s]) => {
    const cov = coverOf(sectionItems(k));
    return h`<button class="tile" data-go="#sec/${k}">
      ${cov ? `<img data-photo="${cov}" alt="">` : ''}
      <span class="band" style="background:${s.color}"></span>
      <span class="lbl">${s.label}</span></button>`;
  }).join('');
  view.innerHTML = h`<div class="home">
    <div class="portrait">
      <img data-photo="${esc(DATA.portret || '')}" alt="">
      <div class="who"><b>${esc(DATA.naam || '')}</b><span>${esc(DATA.ondertitel || '')}</span></div>
      <button class="playall" data-go="#diashow">▶&nbsp; ${T.allPhotos}</button>
    </div>
    <div class="tiles" style="grid-template-columns:repeat(${Object.keys(SECS).filter(k => sectionItems(k).length).length > 5 ? 4 : 3}, 1fr)">
      ${tiles}
      <button class="tile plain" data-go="#kaart" style="background:#3f6e8c"><span class="icon">\u{1F5FA}</span><span class="lbl">${T.map}</span></button>
    </div></div>`;
  fillImages();
}

function renderSection(key) {
  const s = SECS[key];
  const items = sectionItems(key);
  setBar(s.label);
  view.innerHTML = h`${DATA.inleiding && DATA.inleiding[key] ? `<p class="intro">${esc(DATA.inleiding[key])}</p>` : ''}
    <div class="cards" style="--sec:${s.color}">
    ${items.map((it, i) => h`<button class="card" data-go="#item/${key}/${i}">
      ${it.fotos && it.fotos.length ? `<img data-photo="${it.fotos[0]}" alt="">` : `<div class="noimg">${s.icon}</div>`}
      <span class="txt"><span class="t">${esc(it.titel || it.naam)}</span>
      <span class="s">${key === 'kinderen' ? esc(it.geboren ? T.born + ' ' + it.geboren : '') : period(it)}</span>
      <span class="s">${placeLine(it)}</span></span></button>`).join('')}
    </div>`;
  fillImages();
}

function renderItem(key, idx) {
  const it = sectionItems(key)[idx];
  if (!it) return go('#home');
  setBar(SECS[key].label);
  const photos = it.fotos || [];
  let cur = 0;
  const meta = [];
  if (key === 'kinderen') {
    if (it.geboren) meta.push(`${T.born} ${esc(it.geboren)}${it.plaats ? ` ${T.bornIn} ` + esc(it.plaats) : ''}`);
  } else {
    if (period(it)) meta.push(period(it));
    if (placeLine(it)) meta.push(placeLine(it));
  }
  view.innerHTML = h`<div class="detail">
    <div class="gallery">
      ${photos.length ? '' : `<div style="font-size:120px">${SECS[key].icon}</div>`}
      ${photos.length > 1 ? `<button class="nav prev" aria-label="${T.prev}">&#8249;</button><button class="nav next" aria-label="${T.next}">&#8250;</button><div class="count"></div>` : ''}
      <div class="cap"></div>
    </div>
    <div class="story">
      <h2>${esc(it.titel || it.naam)}</h2>
      <div class="meta">${meta.map(m => `<div>${m}</div>`).join('')}</div>
      ${(it.verhaal || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}
      ${it.lat != null && key !== 'kinderen' ? `<button class="tomap" data-go="#kaart/${key}/${idx}">\u{1F5FA} ${T.showOnMap}</button>` : ''}
      <div class="ask">
        <h3>${T.askTitle}</h3>
        <div class="qlist">${(it.vragen || []).map((q, i) => `<button class="q" data-q="${i}">${esc(q.vraag)}</button>`).join('')}</div>
        <button class="mic" hidden>\u{1F3A4} ${T.askOwn}</button>
        <div class="answer" hidden><p class="atext"></p><div class="asrc"></div><button class="stop">${T.stop}</button></div>
      </div>
    </div></div>`;
  setupAsk(key, it);
  const gal = $('.gallery'), cap = $('.gallery .cap'), cnt = $('.gallery .count');
  async function show(i) {
    if (!photos.length) return;
    cur = (i + photos.length) % photos.length;
    const f = await showMedia(gal, photos[cur], () => openLightbox(photos, cur));
    cap.textContent = [f.onderschrift, f.wie, f.jaar].filter(Boolean).join('  ·  ');
    if (cnt) cnt.textContent = `${cur + 1} / ${photos.length}`;
  }
  show(0);
  const prev = $('.nav.prev'), next = $('.nav.next');
  if (prev) { prev.onclick = e => { e.stopPropagation(); show(cur - 1); }; next.onclick = e => { e.stopPropagation(); show(cur + 1); }; }
  swipe($('.gallery'), d => show(cur + d));
}

/* ---------- Asking and speaking (21 Oct 2026) ----------
   Fixed questions have checked answers in the content and work offline. The microphone sends a
   spoken question to your own levensboekVraag function (only with wifi, and only when config.js
   sets vraagUrl). Answers are read aloud by the tablet's own voice in the book's language. */
const VRAAG_URL = CONFIG.vraagUrl || '';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const lang = T.speech, vs = speechSynthesis.getVoices().filter(v => v.lang.slice(0, 2) === lang.slice(0, 2));
  voice = vs.find(v => v.lang === lang && /google/i.test(v.name)) || vs.find(v => v.lang === lang) || vs[0] || null;
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = pickVoice;
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  // One utterance per sentence: Chrome on Android stops long utterances halfway.
  for (const part of text.match(/[^.!?]+[.!?]*/g) || [text]) {
    const u = new SpeechSynthesisUtterance(part.trim());
    u.lang = T.speech; if (voice) u.voice = voice; u.rate = 0.9;
    speechSynthesis.speak(u);
  }
}
function stopSpeaking() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

function setupAsk(key, it) {
  const box = $('.ask'), ans = $('.answer'), atext = $('.atext'), asrc = $('.asrc'), mic = $('.mic');
  const canMic = !!SR && !!VRAAG_URL && navigator.onLine;
  mic.hidden = !canMic;
  if (!(it.vragen || []).length && !canMic) { box.hidden = true; return; }
  function show(text, say, src) {
    ans.hidden = false; atext.textContent = text;
    asrc.textContent = src && src.length ? T.source + [...new Set(src)].join(', ') : '';
    if (say) speak(text);
    ans.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  box.querySelectorAll('.q').forEach(b => b.onclick = () => {
    const q = it.vragen[+b.dataset.q];
    box.querySelectorAll('.q').forEach(x => x.classList.toggle('on', x === b));
    show(q.antwoord, true, (q.bronnen || []).map(host).filter(Boolean));
  });
  $('.stop').onclick = () => stopSpeaking();
  async function ask(vraag) {
    show(T.youAsked(vraag), false);
    try {
      const r = await fetch(VRAAG_URL, { method: 'POST', signal: AbortSignal.timeout(80000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        vraag, context: { taal: T.speech.slice(0, 2), persoon: DATA.naam, over: DATA.ondertitel, sectie: SECS[key].label, titel: it.titel || it.naam, plaats: it.plaats, land: it.land, van: it.van || it.geboren, tot: it.tot, verhaal: it.verhaal } }) });
      const d = await r.json();
      if (!d.antwoord) throw new Error('leeg');
      show(d.antwoord, true, d.bronnen);
    } catch (e) {
      show(T.noAnswer, true);
    }
  }
  mic.onclick = () => {
    stopSpeaking();
    const rec = new SR();
    rec.lang = T.speech; rec.interimResults = false; rec.maxAlternatives = 1;
    mic.classList.add('on'); show(T.listening, false);
    rec.onresult = e => ask(e.results[0][0].transcript);
    rec.onerror = () => show(T.notHeard, true);
    rec.onend = () => mic.classList.remove('on');
    rec.start();
  };
}

function renderMap(focusKey, focusIdx) {
  setBar(T.map);
  const pins = [];
  for (const k of Object.keys(SECS)) {
    if (k === 'kinderen') continue;
    sectionItems(k).forEach((it, i) => { if (it.lat != null && it.lon != null) pins.push({ k, i, it }); });
  }
  view.innerHTML = h`<div class="mapwrap">
    <div class="map" id="map"></div>
    <div class="legend">
      ${Object.entries(SECS).filter(([k]) => k !== 'kinderen' && pins.some(p => p.k === k)).map(([k, s]) =>
        `<button data-layer="${k}"><span class="dot" style="background:${s.hex}"></span>${s.label}</button>`).join('')}
      ${pins.some(p => p.k === 'wonen') ? `<button class="zoom" data-zoom="home">${T.homeRegion}</button>` : ''}
      <button class="zoom" data-zoom="all">${T.all}</button>
      <div id="here"></div>
    </div></div>`;
  const hidden = new Set();
  const el = $('#map');
  const world = topojson.feature(MAP_TOPO, MAP_TOPO.objects.countries);
  let mode = 'all', zoomBox = null;
  const fit = list => {
    const lons = list.map(p => p.it.lon), lats = list.map(p => p.it.lat);
    return [[Math.min(...lons) - .8, Math.min(...lats) - .5], [Math.max(...lons) + .8, Math.max(...lats) + .5]];
  };
  const homes = pins.filter(p => p.k === 'wonen');
  // The country they lived in longest-ish (first home) is drawn a little darker.
  const homeCountry = homes.length ? world.features.find(f => d3.geoContains(f, [homes[0].it.lon, homes[0].it.lat])) : null;

  function draw() {
    const W = el.clientWidth, H = el.clientHeight;
    const vis = pins.filter(p => !hidden.has(p.k));
    let box;
    if (mode === 'home') box = fit(homes);
    else if (mode === 'box') box = zoomBox;
    else if (mode === 'focus') { const p = pins.find(p => p.k === focusKey && p.i === focusIdx); box = [[p.it.lon - 1.2, p.it.lat - .7], [p.it.lon + 1.2, p.it.lat + .7]]; }
    else if (vis.length) box = fit(vis);
    else box = [[-25, 34], [45, 71]];
    const proj = d3.geoMercator().fitExtent([[40, 40], [W - 40, H - 40]],
      { type: 'MultiPoint', coordinates: [box[0], box[1]] });
    const path = d3.geoPath(proj);
    // group pins that share (almost) the same spot
    const groups = [];
    for (const p of vis) {
      const [x, y] = proj([p.it.lon, p.it.lat]);
      const g = groups.find(g => Math.hypot(g.x - x, g.y - y) < 40);
      if (g) g.items.push(p); else groups.push({ x, y, items: [p] });
    }
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}">
      ${world.features.map(f => `<path class="land${f === homeCountry ? ' nl' : ''}" d="${path(f) || ''}"/>`).join('')}
      ${groups.map((g, gi) => {
        const p = g.items[0], col = SECS[p.k].hex;
        const r = g.items.length > 1 ? 20 : 15;
        const places = new Set(g.items.map(q => q.it.plaats));
        const label = g.items.length === 1 ? esc(p.it.plaats || p.it.titel)
          : places.size === 1 ? `${esc(p.it.plaats)} (${g.items.length})` : T.places(places.size);
        const focus = mode === 'focus' && g.items.some(q => q.k === focusKey && q.i === focusIdx);
        return `<g class="pin" data-g="${gi}" style="cursor:pointer">
          <circle cx="${g.x}" cy="${g.y}" r="${focus ? r + 8 : r}" fill="${col}"/>
          <circle class="hit" cx="${g.x}" cy="${g.y}" r="34" fill="transparent"/>
          <text x="${g.x + r + 6}" y="${g.y + 5}">${label}</text></g>`;
      }).join('')}</svg>`;
    el.querySelectorAll('.pin').forEach(n => n.onclick = () => {
      const g = groups[+n.dataset.g];
      if (g.items.length === 1) return go(`#item/${g.items[0].k}/${g.items[0].i}`);
      const lons = g.items.map(q => q.it.lon), lats = g.items.map(q => q.it.lat);
      if (Math.max(...lons) - Math.min(...lons) > .02 || Math.max(...lats) - Math.min(...lats) > .02) {
        zoomBox = [[Math.min(...lons) - .15, Math.min(...lats) - .1], [Math.max(...lons) + .15, Math.max(...lats) + .1]];
        mode = 'box'; return draw();
      }
      $('#here').innerHTML = `<p style="margin:8px 4px;font-weight:700">${T.atThisSpot}</p>` + g.items.map(q =>
        `<button data-go="#item/${q.k}/${q.i}"><span class="dot" style="background:${SECS[q.k].hex}"></span>${esc(q.it.titel)}</button>`).join('');
    });
  }
  view.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => {
    const k = b.dataset.layer;
    hidden.has(k) ? hidden.delete(k) : hidden.add(k);
    b.classList.toggle('off', hidden.has(k));
    if (mode === 'focus') mode = 'all';
    draw();
  });
  view.querySelectorAll('[data-zoom]').forEach(b => b.onclick = () => { mode = b.dataset.zoom; draw(); });
  if (focusKey) mode = 'focus';
  draw();
  window.onresize = () => location.hash.startsWith('#kaart') && draw();
}

function renderSetup(msg) {
  setBar(T.setupTitle, !!DATA);
  view.innerHTML = h`<div class="setup">
    <h2>${DATA ? T.replace : T.welcome}</h2>
    ${msg ? `<p style="color:#b5473a">${esc(msg)}</p>` : ''}
    ${DATA ? `<button class="big" data-go="#maken">${T.edit}</button>` : ''}
    <p>${T.pickHelp}</p>
    <button class="big${DATA ? ' alt' : ''}" id="pick">${T.load}</button>
    <button class="big alt" id="make">${T.make}</button>
    <button class="big alt" id="demo">${T.demo}</button>
    ${DATA ? `<button class="big alt" id="wipe">${T.wipe}</button>` : ''}
    <div class="progress" hidden><div></div></div>
    <small>${T.tip}</small>
  </div>`;
  const bar = $('.progress'), fill = $('.progress div');
  const prog = p => { bar.hidden = false; fill.style.width = Math.round(p * 100) + '%'; };
  const done = () => { go('#home'); };
  const fail = e => renderSetup(e.message || String(e));
  $('#pick').onclick = () => $('#zipInput').click();
  $('#zipInput').onchange = e => {
    const fs = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name, T.sort, { numeric: true }));
    if (fs.length) importZip(fs, prog).then(done, fail);
    e.target.value = '';
  };
  $('#demo').onclick = () => fetch(demoFile()).then(r => { if (!r.ok) throw new Error(T.demoMissing); return r.blob(); })
    .then(b => importZip(b, prog)).then(done, fail);
  $('#make').onclick = () => { if (!DATA || confirm(T.newConfirm)) newBook().catch(fail); };
  const w = $('#wipe');
  if (w) w.onclick = async () => {
    if (!confirm(T.wipeConfirm)) return;
    await dbClear('files'); await dbClear('meta'); DATA = null; pickLanguage(); renderSetup();
  };
}

/* ---------- Book maker (31 Oct 2026) ----------
   Makes or changes a book on the tablet itself, in the same data.json + img/ form as an imported
   zip. Photos are shrunk to at most 1920 px here and stored in IndexedDB; "Save a copy" packs it
   all back into a zip the importer reads. Only "Find on the map" goes online (OpenStreetMap). */
const MAX_SIDE = 1920;
let saveT = null;
let edited = false;
function saveSoon() { edited = true; clearTimeout(saveT); saveT = setTimeout(saveNow, 400); }
function saveNow() { clearTimeout(saveT); saveT = null; return dbPut('meta', 'data', DATA); }
function flushSave() { if (saveT) saveNow(); }
const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isKids = key => key === 'kinderen';
const yearOf = v => { const m = String(v || '').match(/\d{4}/); return m ? +m[0] : null; };

async function newBook() {
  await dbClear('files');
  urlCache.forEach(u => u && URL.revokeObjectURL(u));
  urlCache.clear();
  DATA = { taal: T === TEXTS.nl ? 'nl' : 'en', titel: '', naam: '', ondertitel: '', diashowSeconden: 8, diashowNaMinuten: 3,
    inleiding: {}, labels: {}, fotos: {}, secties: {}, delen: 1 };
  await saveNow();
  pickLanguage();
  go('#maken');
}

/* Chronological like build_content.py; an entry without a year stays after the one above it.
   Empty entries (no name, story or photos) are dropped. */
function tidySection(key) {
  const list = (DATA.secties[key] || []).filter(it => it.titel || it.naam || it.verhaal || (it.fotos || []).length);
  let last = 0;
  const keyed = list.map((it, n) => {
    const y = yearOf(isKids(key) ? it.geboren : it.van || it.tot);
    last = y == null ? last : y;
    return { it, k: last, n };
  }).sort((a, b) => a.k - b.k || a.n - b.n);
  DATA.secties[key] = keyed.map(x => x.it);
}
function tidyAll() { DATA.secties = DATA.secties || {}; for (const k of Object.keys(SECS)) tidySection(k); saveSoon(); }

async function toJpeg(file) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) {
    const u = URL.createObjectURL(file);
    src = new Image(); src.src = u;
    try { await src.decode(); } finally { URL.revokeObjectURL(u); }
  }
  const w = src.width || src.naturalWidth, hgt = src.height || src.naturalHeight;
  const s = Math.min(1, MAX_SIDE / Math.max(w, hgt));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(hgt * s);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  if (src.close) src.close();
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('jpeg')), 'image/jpeg', 0.85));
}
/* Opens the device gallery; resolves with the ids of the photos that were stored. */
function pickPhotos(multiple, status) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = multiple;
    inp.onchange = async () => {
      const files = [...inp.files], ids = [];
      let bad = 0;
      for (let i = 0; i < files.length; i++) {
        status && (status.textContent = T.preparing(i + 1, files.length));
        try {
          const blob = await toJpeg(files[i]), id = newId();
          await dbPut('files', `img/${id}.jpg`, blob);
          DATA.fotos[id] = { src: `img/${id}.jpg`, onderschrift: '', jaar: '', wie: '' };
          ids.push(id);
        } catch (e) { bad++; }
      }
      if (status) status.textContent = bad ? T.skipped(bad) : '';
      resolve(ids);
    };
    inp.click();
  });
}
/* Removes a photo from the book once nothing refers to it any more. */
async function dropPhoto(id) {
  const used = DATA.portret === id || Object.values(DATA.secties || {}).some(l => l.some(it => (it.fotos || []).includes(id)));
  const f = DATA.fotos[id];
  if (used || !f) return;
  delete DATA.fotos[id];
  await dbDel('files', f.src);
  if (f.video) await dbDel('files', f.video);
  [id, 'v:' + id].forEach(k => { if (urlCache.get(k)) URL.revokeObjectURL(urlCache.get(k)); urlCache.delete(k); });
}

/* OpenStreetMap Nominatim: one lookup at a time, at most one per second, only on a tap. */
let lastGeo = 0;
async function geocode(q) {
  const wait = lastGeo + 1100 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastGeo = Date.now();
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '1', 'accept-language': T.sort }));
  if (!r.ok) throw new Error(r.status);
  return (await r.json())[0] || null;
}

async function exportBook(status) {
  await saveNow();
  status.textContent = T.exporting;
  const zip = new JSZip();
  zip.file('data.json', JSON.stringify({ ...DATA, delen: 1 }, null, 1));
  for (const f of Object.values(DATA.fotos || {})) {
    for (const k of [f.src, f.video].filter(Boolean)) {
      const b = await dbGet('files', k);
      if (b) zip.file(k, b);
    }
  }
  const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' },
    m => { status.textContent = `${T.exporting} ${Math.round(m.percent)}%`; });
  const slug = String(DATA.titel || DATA.naam || 'lifetiles').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'lifetiles';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(out); a.download = `${slug}-1.zip`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
  status.textContent = `${a.download} (${(out.size / 1e6).toFixed(1)} MB)`;
}

/* Text fields carry data-f="<field>"; they write straight into `obj` and save. */
function bindFields(root, obj, onChange) {
  root.querySelectorAll('[data-f]').forEach(el => el.oninput = () => {
    const v = el.value;
    if (v.trim() === '' && !(el.dataset.f in obj)) return;
    obj[el.dataset.f] = v;
    onChange && onChange(el.dataset.f, v);
    saveSoon();
  });
}
const field = (f, label, val, opts = '') => h`<label class="fld"><span>${label}</span>
  <input data-f="${f}" value="${esc(val || '')}" ${opts}></label>`;

function renderMaker() {
  tidyAll();
  setBar(T.makerTitle);
  const lang = DATA.taal === 'nl' ? 'nl' : 'en';
  view.innerHTML = h`<div class="maker">
    <section class="mk">
      <h2>${T.aboutBook}</h2>
      <p class="mk-note">${T.autoSaved}</p>
      <div class="fld"><span>${T.fLang}</span><div class="seg">
        <button data-lang="en" class="${lang === 'en' ? 'on' : ''}">English</button>
        <button data-lang="nl" class="${lang === 'nl' ? 'on' : ''}">Nederlands</button></div></div>
      ${field('titel', T.fTitle, DATA.titel)}
      ${field('naam', T.fName, DATA.naam)}
      ${field('ondertitel', T.fSub, DATA.ondertitel)}
      <div class="fld"><span>${T.portrait}</span>
        <div class="mk-portrait">${DATA.portret ? `<img data-photo="${esc(DATA.portret)}" alt="">` : '<div class="noimg">\u{1F464}</div>'}
        <button class="mkbtn" id="mkPortrait">${T.pickPortrait}</button></div>
        <p class="mk-status" id="mkPStatus"></p></div>
    </section>
    <section class="mk">
      <h2>${T.chapters}</h2>
      <div class="mk-secs">${Object.entries(SECS).map(([k, s]) => h`<button class="mk-row" data-go="#maken/${k}" style="--sec:${s.color}">
        <span class="ic">${s.icon}</span><span class="t">${esc(s.label)}</span>
        <span class="n">${T.nChapters(sectionItems(k).length)}</span><span class="go">›</span></button>`).join('')}</div>
    </section>
    <section class="mk">
      <button class="big" data-go="#home">${T.viewBook}</button>
      <button class="big alt" id="mkExport">${T.exportZip}</button>
      <p class="mk-note">${T.exportHelp}</p>
      <p class="mk-status" id="mkStatus"></p>
    </section></div>`;
  fillImages();
  bindFields(view, DATA, f => { if (f === 'titel') document.title = DATA.titel || 'Life Tiles'; });
  view.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => {
    DATA.taal = b.dataset.lang; saveNow(); pickLanguage(); renderMaker();
  });
  $('#mkPortrait').onclick = async () => {
    const old = DATA.portret, [id] = await pickPhotos(false, $('#mkPStatus'));
    if (!id) return;
    DATA.portret = id;
    if (old) await dropPhoto(old);
    await saveNow(); renderMaker();
  };
  $('#mkExport').onclick = () => exportBook($('#mkStatus')).catch(e => { $('#mkStatus').textContent = e.message || String(e); });
}

function renderMakerSection(key) {
  tidySection(key); saveSoon();
  const s = SECS[key], items = sectionItems(key);
  setBar(s.label);
  view.innerHTML = h`<div class="maker">
    <section class="mk">
      <button class="big" id="mkAdd">${T.addChapter}</button>
      <div class="mk-secs" style="--sec:${s.color}">${items.length ? items.map((it, i) => h`<button class="mk-row" data-go="#maken/${key}/${i}">
        ${(it.fotos || []).length ? `<img data-photo="${it.fotos[0]}" alt="">` : `<span class="ic">${s.icon}</span>`}
        <span class="t">${esc(it.titel || it.naam || T.untitled)}</span>
        <span class="n">${isKids(key) ? esc(it.geboren || '') : period(it)}</span><span class="go">›</span></button>`).join('')
        : `<p class="mk-note">${T.noChapters}</p>`}</div>
    </section></div>`;
  fillImages();
  $('#mkAdd').onclick = () => {
    DATA.secties[key] = DATA.secties[key] || [];
    DATA.secties[key].push(isKids(key) ? { naam: '', geboren: '', plaats: '', verhaal: '', fotos: [] }
      : { titel: '', plaats: '', land: '', van: '', tot: '', verhaal: '', fotos: [] });
    go(`#maken/${key}/${DATA.secties[key].length - 1}`);
  };
}

function renderMakerItem(key, idx) {
  const it = sectionItems(key)[idx];
  if (!SECS[key] || !it) return location.replace(SECS[key] ? `#maken/${key}` : '#maken');
  it.fotos = it.fotos || [];
  setBar(SECS[key].label);
  const kids = isKids(key);
  view.innerHTML = h`<div class="maker">
    <section class="mk">
      ${kids ? field('naam', T.fChName, it.naam) + field('geboren', T.fBorn, it.geboren) + field('plaats', T.fPlace, it.plaats)
        : field('titel', T.fChTitle, it.titel) + `<div class="fld2">${field('van', T.fFrom, it.van, 'inputmode="numeric"')}${field('tot', T.fTo, it.tot, 'inputmode="numeric"')}</div>`
          + `<div class="fld2">${field('plaats', T.fPlace, it.plaats)}${field('land', T.fCountry, it.land)}</div>`}
      <label class="fld"><span>${T.fStory}</span><textarea data-f="verhaal" rows="8">${esc(it.verhaal || '')}</textarea>
        <small>${T.storyHelp}</small></label>
    </section>
    <section class="mk">
      <h2>${T.photos}</h2>
      <div class="mk-photos">${it.fotos.map((id, i) => h`<div class="mk-ph">
        <img data-photo="${esc(id)}" alt="">
        <input data-cap="${esc(id)}" value="${esc((DATA.fotos[id] || {}).onderschrift || '')}" placeholder="${T.caption}">
        <div class="mk-phb">${i ? `<button data-first="${i}">${T.makeFirst}</button>` : `<span>${T.firstPhoto}</span>`}
        <button data-del="${i}">${T.removePhoto}</button></div></div>`).join('')}</div>
      <button class="big alt" id="mkPhotos">${T.addPhotos}</button>
      <p class="mk-status" id="mkStatus"></p>
    </section>
    ${kids ? '' : h`<section class="mk">
      <h2>${T.location}</h2>
      <button class="big alt" id="mkFind">${T.findPlace}</button>
      <p class="mk-status" id="mkGeo"></p>
      <div class="fld2">
        <label class="fld"><span>${T.lat}</span><input id="mkLat" inputmode="decimal" value="${it.lat ?? ''}"></label>
        <label class="fld"><span>${T.lon}</span><input id="mkLon" inputmode="decimal" value="${it.lon ?? ''}"></label></div>
      <p class="mk-note">${T.geoNote}</p>
    </section>`}
    <section class="mk"><button class="big danger" id="mkDelete">${T.deleteChapter}</button></section>
  </div>`;
  fillImages();
  bindFields(view, it);
  view.querySelectorAll('[data-cap]').forEach(el => el.oninput = () => { DATA.fotos[el.dataset.cap].onderschrift = el.value; saveSoon(); });
  const redraw = () => { const y = view.scrollTop; renderMakerItem(key, idx); view.scrollTop = y; };
  view.querySelectorAll('[data-first]').forEach(b => b.onclick = () => {
    const [id] = it.fotos.splice(+b.dataset.first, 1); it.fotos.unshift(id); saveNow(); redraw();
  });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const [id] = it.fotos.splice(+b.dataset.del, 1); await dropPhoto(id); await saveNow(); redraw();
  });
  $('#mkPhotos').onclick = async () => {
    const ids = await pickPhotos(true, $('#mkStatus'));
    if (!ids.length) return;
    it.fotos.push(...ids); await saveNow();
    const msg = $('#mkStatus').textContent; redraw(); $('#mkStatus').textContent = msg;
  };
  if (!kids) {
    const lat = $('#mkLat'), lon = $('#mkLon'), geo = $('#mkGeo');
    const setLL = () => {
      const a = parseFloat(lat.value.replace(',', '.')), b = parseFloat(lon.value.replace(',', '.'));
      if (isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180) { it.lat = a; it.lon = b; }
      else if (!lat.value.trim() && !lon.value.trim()) { delete it.lat; delete it.lon; }
      saveSoon();
    };
    lat.oninput = lon.oninput = setLL;
    $('#mkFind').onclick = async e => {
      const q = [it.adres, it.plaats, it.land].filter(Boolean).join(', ');
      if (!q) return;
      e.target.disabled = true; geo.textContent = T.finding;
      try {
        const hit = await geocode(q);
        if (hit) {
          it.lat = +(+hit.lat).toFixed(4); it.lon = +(+hit.lon).toFixed(4);
          lat.value = it.lat; lon.value = it.lon; saveNow();
          geo.textContent = T.found(hit.display_name);
        } else geo.textContent = T.notFound;
      } catch (err) { geo.textContent = T.geoFail; }
      e.target.disabled = false;
    };
  }
  $('#mkDelete').onclick = async () => {
    if (!confirm(T.deleteConfirm)) return;
    const [gone] = DATA.secties[key].splice(idx, 1);
    for (const id of gone.fotos || []) await dropPhoto(id);
    await saveNow();
    location.replace(`#maken/${key}`);
  };
}

/* ---------- Lightbox ---------- */
let lb = { ids: [], i: 0 };
async function lbShow(i) {
  lb.i = (i + lb.ids.length) % lb.ids.length;
  const f = await showMedia($('#lightbox'), lb.ids[lb.i]);
  $('#lbCaption').textContent = [f.onderschrift, f.wie, f.jaar].filter(Boolean).join('  ·  ');
}
function openLightbox(ids, i) {
  lb.ids = ids; $('#lightbox').hidden = false; lbShow(i);
  const multi = ids.length > 1;
  $('.lbnav.prev').hidden = !multi; $('.lbnav.next').hidden = !multi;
}
$('.lbnav.prev').onclick = () => lbShow(lb.i - 1);
$('.lbnav.next').onclick = () => lbShow(lb.i + 1);
function closeLightbox() { $('#lightbox').hidden = true; $('#lightbox').querySelectorAll('video').forEach(v => v.pause()); }
$('.lbclose').onclick = closeLightbox;
swipe($('#lightbox'), d => lbShow(lb.i + d));

/* ---------- Slideshow ---------- */
let ss = null;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
async function startSlideshow() {
  const ids = shuffle(allPhotoIds());
  if (!ids.length) return;
  const box = $('#slideshow'); box.hidden = false;
  const imgs = [$('#ssA'), $('#ssB')];
  let i = 0, flip = 0;
  let wake = null;
  try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { /* not supported */ }
  async function step() {
    const id = ids[i % ids.length]; i++;
    const next = imgs[flip ^= 1], prev = imgs[flip ^ 1];
    next.src = await photoUrl(id);
    await next.decode().catch(() => {});
    next.classList.add('on'); prev.classList.remove('on');
    const f = DATA.fotos[id] || {};
    $('#ssCaption').textContent = [f.onderschrift, f.wie, f.jaar].filter(Boolean).join('  ·  ');
  }
  step();
  ss = { timer: setInterval(step, (DATA.diashowSeconden || 8) * 1000), wake };
}
function stopSlideshow() {
  if (!ss) return;
  clearInterval(ss.timer); ss.wake && ss.wake.release().catch(() => {});
  ss = null; $('#slideshow').hidden = true;
  document.querySelectorAll('#slideshow img').forEach(i => i.classList.remove('on'));
}
$('#slideshow').onclick = () => { stopSlideshow(); if (location.hash === '#diashow') history.back(); };

/* ---------- Idle: start slideshow when nobody touches the tablet ---------- */
let idleTimer;
function resetIdle() {
  clearTimeout(idleTimer);
  if (!DATA || ss || /^#(maken|instellen)/.test(location.hash)) return;
  idleTimer = setTimeout(() => {
    if ([...document.querySelectorAll('video')].some(v => !v.paused) || window.speechSynthesis?.speaking) return resetIdle();
    closeLightbox(); startSlideshow();
  }, (DATA.diashowNaMinuten || 3) * 60000);
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, resetIdle, true));

/* ---------- Swipe ---------- */
function swipe(el, cb) {
  let x0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 60) cb(dx < 0 ? 1 : -1);
  });
}

/* ---------- Routing ---------- */
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function route() {
  const parts = (location.hash || '#home').slice(1).split('/');
  flushSave();
  stopSpeaking();
  stopSlideshow();
  closeLightbox();
  view.scrollTop = 0;
  if (!DATA) return renderSetup();
  switch (parts[0]) {
    case 'sec': return SECS[parts[1]] ? renderSection(parts[1]) : go('#home');
    case 'item': return renderItem(parts[1], +parts[2]);
    case 'kaart': return renderMap(parts[1], parts[2] != null ? +parts[2] : undefined);
    case 'diashow': renderHome(); return startSlideshow();
    case 'instellen': return renderSetup();
    case 'maken': return parts[2] != null ? renderMakerItem(parts[1], +parts[2]) : SECS[parts[1]] ? renderMakerSection(parts[1]) : renderMaker();
    default: return renderHome();
  }
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go]');
  if (t) { e.preventDefault(); go(t.dataset.go); }
});
$('#btnBack').onclick = () => history.length > 1 ? history.back() : go('#home');
$('#btnHome').onclick = () => go('#home');
window.addEventListener('hashchange', () => { route(); resetIdle(); });

/* Hidden settings: hold the title for 3 seconds */
/* Android Chrome turns a long press into a context-menu gesture and fires pointercancel after
   ~0.5 s, so the timer only stops on a real release; tapping the title 5 times also works. */
let holdT, taps = [];
const titleEl = $('#title');
titleEl.addEventListener('contextmenu', e => e.preventDefault());
titleEl.addEventListener('pointerdown', () => {
  clearTimeout(holdT);
  holdT = setTimeout(() => go('#instellen'), 3000);
  const now = Date.now();
  taps = taps.filter(t => now - t < 2500).concat(now);
  if (taps.length >= 5) { taps = []; clearTimeout(holdT); go('#instellen'); }
});
['pointerup', 'touchend'].forEach(ev => titleEl.addEventListener(ev, () => clearTimeout(holdT)));

/* ---------- Boot ---------- */
/* Example books with placeholder photos: demo-en-1.zip and demo-nl-1.zip. */
function demoFile() { return `demo-${T === TEXTS.nl ? 'nl' : 'en'}-1.zip`; }
let MAP_TOPO;
(async () => {
  MAP_TOPO = await fetch('vendor/countries-50m.json').then(r => r.json());
  try { DATA = await dbGet('meta', 'data') || null; } catch (e) { DATA = null; }
  pickLanguage();
  const q = new URLSearchParams(location.search);
  if (!DATA && (q.has('demo') || q.has('voorbeeld'))) {
    try { await importZip(await fetch(demoFile()).then(r => r.blob())); } catch (e) { /* show setup */ }
  }
  pickLanguage();
  if (DATA && DATA.titel) document.title = DATA.titel;
  route(); resetIdle();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await navigator.storage?.persist?.(); } catch (e) { /* ignore */ }
})();
})();
