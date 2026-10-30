/* Levensboek: offline photo and life-story app for a 10-inch tablet.
   All content lives in IndexedDB on the tablet, imported once from a .zip
   built by tools/build_content.py. Nothing is sent anywhere. */
(() => {
'use strict';

const SECS = {
  kinderen:  { label: 'Mijn kinderen',  icon: '\u{1F46A}', color: 'var(--c-kinderen)',  hex: '#b5473a' },
  partner:   { label: 'Mijn partner',   icon: '❤',     color: 'var(--c-partner)',   hex: '#5b6e8c' },
  gezin:     { label: 'Kinderen en kleinkinderen', icon: '\u{1F46A}', color: 'var(--c-gezin)', hex: '#7a6a3a' },
  wonen:     { label: 'Waar ik woonde', icon: '\u{1F3E0}', color: 'var(--c-wonen)',     hex: '#3f6e8c' },
  school:    { label: 'Mijn scholen',   icon: '\u{1F3EB}', color: 'var(--c-school)',    hex: '#6a8a3a' },
  werk:      { label: 'Mijn werk',      icon: '\u{1F4BC}', color: 'var(--c-werk)',      hex: '#8a5a9a' },
  vakanties: { label: 'Vakanties',      icon: '\u{1F3D6}', color: 'var(--c-vakanties)', hex: '#c98a1e' },
  feesten:   { label: 'Feesten en familie', icon: '\u{1F389}', color: 'var(--c-feesten)', hex: '#2f7f74' },
};
const NL_BOX = [[3.2, 50.7], [7.3, 53.6]];

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? vals[i] : ''), '');

let DATA = null;
const CONFIG = window.LEVENSBOEK_CONFIG || {};
/* Tile names can be changed per book (tab "Over" in the Excel file, rows "Naam tegel ..."). */
function applyLabels() {
  for (const [k, l] of Object.entries((DATA && DATA.labels) || {})) if (SECS[k] && l) SECS[k].label = l;
}
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
  if (!data) throw new Error('Geen levensboek gevonden: kies alle delen tegelijk (levensboek-1.zip, levensboek-2.zip, ...).');
  if (data.delen && done < data.delen) throw new Error(`Er ontbreken delen: ${done} van ${data.delen} gekozen. Kies ze allemaal tegelijk.`);
  await dbPut('meta', 'data', data);
  urlCache.forEach(u => u && URL.revokeObjectURL(u));
  urlCache.clear();
  DATA = data;
  applyLabels();
}

/* ---------- Helpers ---------- */
function period(it) {
  if (it.van && it.tot && it.van !== it.tot) return `${esc(it.van)} tot ${esc(it.tot)}`;
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
  setBar(DATA.titel || 'Mijn levensboek', false);
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
      <button class="playall" data-go="#diashow">▶&nbsp; Alle foto's bekijken</button>
    </div>
    <div class="tiles" style="grid-template-columns:repeat(${Object.keys(SECS).filter(k => sectionItems(k).length).length > 5 ? 4 : 3}, 1fr)">
      ${tiles}
      <button class="tile plain" data-go="#kaart" style="background:#3f6e8c"><span class="icon">\u{1F5FA}</span><span class="lbl">Kaart</span></button>
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
      <span class="s">${key === 'kinderen' ? esc(it.geboren ? 'Geboren ' + it.geboren : '') : period(it)}</span>
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
    if (it.geboren) meta.push(`Geboren ${esc(it.geboren)}${it.plaats ? ' in ' + esc(it.plaats) : ''}`);
  } else {
    if (period(it)) meta.push(period(it));
    if (placeLine(it)) meta.push(placeLine(it));
  }
  view.innerHTML = h`<div class="detail">
    <div class="gallery">
      ${photos.length ? '' : `<div style="font-size:120px">${SECS[key].icon}</div>`}
      ${photos.length > 1 ? '<button class="nav prev" aria-label="Vorige">&#8249;</button><button class="nav next" aria-label="Volgende">&#8250;</button><div class="count"></div>' : ''}
      <div class="cap"></div>
    </div>
    <div class="story">
      <h2>${esc(it.titel || it.naam)}</h2>
      <div class="meta">${meta.map(m => `<div>${m}</div>`).join('')}</div>
      ${(it.verhaal || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}
      ${it.lat != null && key !== 'kinderen' ? `<button class="tomap" data-go="#kaart/${key}/${idx}">\u{1F5FA} Laat zien op de kaart</button>` : ''}
      <div class="ask">
        <h3>Vraag het maar</h3>
        <div class="qlist">${(it.vragen || []).map((q, i) => `<button class="q" data-q="${i}">${esc(q.vraag)}</button>`).join('')}</div>
        <button class="mic" hidden>\u{1F3A4} Stel zelf een vraag</button>
        <div class="answer" hidden><p class="atext"></p><div class="asrc"></div><button class="stop">⏹ Stop met voorlezen</button></div>
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
   sets vraagUrl). Answers are read aloud by the tablet's own Dutch voice. */
const VRAAG_URL = CONFIG.vraagUrl || '';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let nlVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => /^nl/i.test(v.lang));
  nlVoice = vs.find(v => v.lang === 'nl-NL' && /google/i.test(v.name)) || vs.find(v => v.lang === 'nl-NL') || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  // One utterance per sentence: Chrome on Android stops long utterances halfway.
  for (const part of text.match(/[^.!?]+[.!?]*/g) || [text]) {
    const u = new SpeechSynthesisUtterance(part.trim());
    u.lang = 'nl-NL'; if (nlVoice) u.voice = nlVoice; u.rate = 0.9;
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
    asrc.textContent = src && src.length ? 'Bron: ' + [...new Set(src)].join(', ') : '';
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
    show(`Jij vroeg: “${vraag}”. Even denken...`, false);
    try {
      const r = await fetch(VRAAG_URL, { method: 'POST', signal: AbortSignal.timeout(80000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        vraag, context: { persoon: DATA.naam, over: DATA.ondertitel, sectie: SECS[key].label, titel: it.titel || it.naam, plaats: it.plaats, land: it.land, van: it.van || it.geboren, tot: it.tot, verhaal: it.verhaal } }) });
      const d = await r.json();
      if (!d.antwoord) throw new Error('leeg');
      show(d.antwoord, true, d.bronnen);
    } catch (e) {
      show('Het lukt nu even niet om dat op te zoeken. Staat de wifi aan?', true);
    }
  }
  mic.onclick = () => {
    stopSpeaking();
    const rec = new SR();
    rec.lang = 'nl-NL'; rec.interimResults = false; rec.maxAlternatives = 1;
    mic.classList.add('on'); show('Ik luister... Stel je vraag maar.', false);
    rec.onresult = e => ask(e.results[0][0].transcript);
    rec.onerror = () => show('Ik heb je niet goed verstaan. Tik nog eens op de microfoon.', true);
    rec.onend = () => mic.classList.remove('on');
    rec.start();
  };
}

function renderMap(focusKey, focusIdx) {
  setBar('Kaart');
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
      <button class="zoom" data-zoom="nl">Nederland</button>
      <button class="zoom" data-zoom="all">Alles</button>
      <div id="here"></div>
    </div></div>`;
  const hidden = new Set();
  const el = $('#map');
  const world = topojson.feature(MAP_TOPO, MAP_TOPO.objects.countries);
  let mode = 'all', zoomBox = null;

  function draw() {
    const W = el.clientWidth, H = el.clientHeight;
    const vis = pins.filter(p => !hidden.has(p.k));
    let box;
    if (mode === 'nl') box = NL_BOX;
    else if (mode === 'box') box = zoomBox;
    else if (mode === 'focus') { const p = pins.find(p => p.k === focusKey && p.i === focusIdx); box = [[p.it.lon - 1.2, p.it.lat - .7], [p.it.lon + 1.2, p.it.lat + .7]]; }
    else if (vis.length) {
      const lons = vis.map(p => p.it.lon), lats = vis.map(p => p.it.lat);
      box = [[Math.min(...lons) - .8, Math.min(...lats) - .5], [Math.max(...lons) + .8, Math.max(...lats) + .5]];
    } else box = NL_BOX;
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
      ${world.features.map(f => `<path class="land${f.properties.name === 'Netherlands' ? ' nl' : ''}" d="${path(f) || ''}"/>`).join('')}
      ${groups.map((g, gi) => {
        const p = g.items[0], col = SECS[p.k].hex;
        const r = g.items.length > 1 ? 20 : 15;
        const places = new Set(g.items.map(q => q.it.plaats));
        const label = g.items.length === 1 ? esc(p.it.plaats || p.it.titel)
          : places.size === 1 ? `${esc(p.it.plaats)} (${g.items.length})` : `${places.size} plaatsen`;
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
      $('#here').innerHTML = `<p style="margin:8px 4px;font-weight:700">Op deze plek:</p>` + g.items.map(q =>
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
  setBar('Levensboek instellen', !!DATA);
  view.innerHTML = h`<div class="setup">
    <h2>${DATA ? 'Inhoud vervangen' : 'Welkom'}</h2>
    ${msg ? `<p style="color:#b5473a">${esc(msg)}</p>` : ''}
    <p>Kies <b>alle</b> bestanden <b>levensboek-1.zip</b>, <b>levensboek-2.zip</b>, ... die op deze tablet staan (bijvoorbeeld in de map Downloads). Houd je vinger op het eerste bestand en tik daarna de andere aan. De foto's worden alleen op deze tablet bewaard.</p>
    <button class="big" id="pick">Levensboek inladen (.zip)</button>
    <button class="big alt" id="demo">Voorbeeld bekijken</button>
    ${DATA ? '<button class="big alt" id="wipe">Alles van deze tablet wissen</button>' : ''}
    <div class="progress" hidden><div></div></div>
    <small>Tip: in Chrome kies je daarna in het menu (drie puntjes) voor <i>Toevoegen aan startscherm</i>. Dan staat het levensboek als app op de tablet.</small>
  </div>`;
  const bar = $('.progress'), fill = $('.progress div');
  const prog = p => { bar.hidden = false; fill.style.width = Math.round(p * 100) + '%'; };
  const done = () => { go('#home'); };
  const fail = e => renderSetup(e.message || String(e));
  $('#pick').onclick = () => $('#zipInput').click();
  $('#zipInput').onchange = e => {
    const fs = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name, 'nl', { numeric: true }));
    if (fs.length) importZip(fs, prog).then(done, fail);
    e.target.value = '';
  };
  $('#demo').onclick = () => fetch('voorbeeld-1.zip').then(r => { if (!r.ok) throw new Error('Voorbeeld niet gevonden'); return r.blob(); })
    .then(b => importZip(b, prog)).then(done, fail);
  const w = $('#wipe');
  if (w) w.onclick = async () => {
    if (!confirm('Weet je zeker dat je alle foto’s en verhalen van deze tablet wilt wissen?')) return;
    await dbClear('files'); await dbClear('meta'); DATA = null; renderSetup();
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
  if (!DATA || ss) return;
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
let MAP_TOPO;
(async () => {
  MAP_TOPO = await fetch('vendor/countries-50m.json').then(r => r.json());
  try { DATA = await dbGet('meta', 'data') || null; } catch (e) { DATA = null; }
  if (!DATA && new URLSearchParams(location.search).has('voorbeeld')) {
    try { await importZip(await fetch('voorbeeld-1.zip').then(r => r.blob())); } catch (e) { /* show setup */ }
  }
  applyLabels();
  if (DATA && DATA.titel) document.title = DATA.titel;
  route(); resetIdle();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await navigator.storage?.persist?.(); } catch (e) { /* ignore */ }
})();
})();
