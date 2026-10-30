/**
 * Levensboek: answers a question the owner of the book asks aloud about one chapter of their life.
 * The tablet sends the question and the chapter (place, years, story); Gemini answers as a
 * calm narrator, grounded with Google Search, in a few short sentences that the tablet speaks.
 * No photos, addresses or family names are sent. A daily cap keeps the cost small.
 */
import { onRequest } from 'firebase-functions/v2/https'

// Heavy modules load on the first question, so the deploy can read the function list quickly.
let deps = null
async function load() {
  if (deps) return deps
  const [{ GoogleGenAI, ThinkingLevel }, { initializeApp }, { FieldValue, getFirestore }] = await Promise.all([
    import('@google/genai'), import('firebase-admin/app'), import('firebase-admin/firestore')])
  initializeApp()
  deps = { ai: new GoogleGenAI({ vertexai: true, project: process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT, location: 'global' }),
    ThinkingLevel, FieldValue, db: getFirestore() }
  return deps
}
const MODEL = process.env.LEVENSBOEK_MODEL ?? 'gemini-3.8-flash'
const DAILY_CAP = 200
// Web addresses allowed to ask, comma separated, e.g. "https://jouwnaam.github.io".
const ORIGINS = (process.env.LEVENSBOEK_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
const ALLOWED = [/^http:\/\/(localhost|127\.0\.0\.1):\d+$/, { test: (o) => ORIGINS.includes(o) }]
// Who may be named when the narrator does not know, e.g. "je kinderen".
const FAMILIE = process.env.LEVENSBOEK_FAMILIE ?? 'je familie'

const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

export function buildPrompt(vraag, ctx) {
  const periode = [ctx.van, ctx.tot].filter(Boolean).join(' tot ') || 'onbekende jaren'
  const plek = [ctx.plaats, ctx.land].filter(Boolean).join(', ') || 'onbekende plaats'
  const wie = clean(ctx.persoon, 60) || 'de eigenaar van dit boek'
  return `Je bent de vriendelijke verteller in het levensboek van ${wie}.${ctx.over ? ` Over ${wie}: ${clean(ctx.over, 120)}.` : ''}
${wie} bekijkt het hoofdstuk "${clean(ctx.titel, 80)}" (${clean(ctx.sectie, 30)}), in ${clean(plek, 80)}, periode ${clean(periode, 40)}.
${ctx.verhaal ? `Wat er in het levensboek over dit hoofdstuk staat: ${clean(ctx.verhaal, 600)}\n` : ''}
De vraag, uitgesproken en door de tablet opgeschreven (er kunnen herkenningsfouten in zitten): "${clean(vraag, 300)}"

Regels voor je antwoord:
- Nederlands, rustig en warm. Spreek de vrager aan met je en jij.
- Richt je op de tijd van dit hoofdstuk ("Toen jij daar woonde, rond 1950, ..."), met hooguit een korte vergelijking met nu.
- Twee tot vier korte zinnen. Het antwoord wordt hardop voorgelezen: geen lijstjes, geen haakjes, geen afkortingen, geen internetadressen, geen gedachtestreepjes.
- Gebruik alleen feiten die je met Google Search kunt bevestigen. Getallen alleen als je ze vindt, met "ongeveer" als ze afgerond zijn.
- Weet je iets niet zeker, zeg dat dan eerlijk en vriendelijk, bijvoorbeeld: "Dat weet ik niet precies. Misschien weet ${FAMILIE} het."
- Verzin nooit iets over de familie of over het eigen leven van de vrager.
- Is de vraag niet te verstaan, vraag dan vriendelijk of de vrager het nog eens wil zeggen.`
}

export const levensboekVraag = onRequest({ region: 'europe-west4', maxInstances: 2, timeoutSeconds: 90, memory: '256MiB' }, async (req, res) => {
  const origin = req.get('origin') ?? ''
  if (ALLOWED.some((r) => r.test(origin))) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.status(204).send('')
    return
  }
  if (req.method !== 'POST' || !ALLOWED.some((r) => r.test(origin))) { res.status(403).json({ error: 'forbidden' }); return }
  const vraag = clean(req.body?.vraag, 300)
  if (vraag.length < 3) { res.status(400).json({ error: 'empty' }); return }

  const { ai, ThinkingLevel, FieldValue, db } = await load()
  const day = new Date().toISOString().slice(0, 10)
  const ref = db.collection('levensboek_usage').doc(day)
  const used = await db.runTransaction(async (t) => {
    const n = (await t.get(ref)).data()?.count ?? 0
    if (n < DAILY_CAP) t.set(ref, { count: FieldValue.increment(1) }, { merge: true })
    return n
  })
  if (used >= DAILY_CAP) { res.json({ antwoord: 'Voor vandaag heb ik genoeg vragen beantwoord. Morgen vertel ik graag weer verder.' }); return }

  try {
    // A grounded search now and then hangs; after 45 seconds the narrator asks her to try again.
    const slow = new Promise((resolve) => setTimeout(() => resolve(null), 45000))
    const r = await Promise.race([slow, ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(vraag, req.body?.context ?? {}),
      config: { tools: [{ googleSearch: {} }], maxOutputTokens: 600, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    })])
    if (!r) { res.json({ antwoord: 'Dat zoeken duurt nu wat lang. Wil je het nog een keer vragen?' }); return }
    const antwoord = clean(r.text, 1200).replace(/\s[–—]\s/g, ', ')
    const bronnen = (r.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => c.web?.title).filter(Boolean).slice(0, 3)
    res.json({ antwoord: antwoord || 'Dat weet ik niet precies.', bronnen })
  } catch (e) {
    console.error('levensboekVraag', e)
    res.status(502).json({ error: 'model' })
  }
})
