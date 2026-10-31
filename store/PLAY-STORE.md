# Life Tiles in de Google Play Store

De Play-app is een verpakking (Trusted Web Activity) om de web-app op **https://lifetiles.web.app**. Updates van de web-app komen dus vanzelf in de Play-app; alleen bij een nieuwe verpakking upload je opnieuw.

## 0. Account

- Google Play Console: [play.google.com/console](https://play.google.com/console), eenmalig 25 dollar, met identiteitscontrole.
- Let op: dit is iets anders dan de Chrome Web Store (voor extensies) en de Microsoft Store.
- Een **persoonlijk** account dat na november 2023 is gemaakt, moet elke nieuwe app eerst **14 dagen** in een **besloten test** hebben met minstens **12 testers** voordat hij openbaar mag. Je internationale vrienden zijn de ideale testers: verzamel hun Gmail-adressen.

## 1. Het Android-pakket maken (PWABuilder, gratis, geen programmeerkennis)

1. Ga naar [pwabuilder.com](https://www.pwabuilder.com) en vul in: `https://lifetiles.web.app`.
2. Kies **Package for stores > Android > Generate package**, en vul in:
   - Package ID: `nl.herberttenhave.lifetiles` (kan later nooit meer veranderen)
   - App name: `Life Tiles`, Launcher name: `Life Tiles`
   - Display mode: `fullscreen`
   - Signing key: **Create new**. Vul je naam en een sterk wachtwoord in.
3. Je krijgt een zip met onder meer `app-release-bundle.aab`, `signing.keystore`, `signing-key-info.txt` en `assetlinks.json`.
4. **Bewaar `signing.keystore` en `signing-key-info.txt` veilig** (bijvoorbeeld in je wachtwoordmanager en een tweede kopie). Zonder deze sleutel kun je de app nooit meer bijwerken.

## 2. De koppeling tussen app en website (assetlinks)

Zonder deze koppeling toont de app een adresbalk van Chrome.

1. Geef `assetlinks.json` uit de PWABuilder-zip aan Claude; die zet hem op `https://lifetiles.web.app/.well-known/assetlinks.json`.
2. Na de eerste upload in Play Console: ga naar **Test en release > App-integriteit > App-ondertekening** en kopieer de **SHA-256-vingerafdruk van het app-ondertekeningscertificaat**. Die moet er ook bij in `assetlinks.json` (Google ondertekent de app opnieuw).

## 3. App aanmaken in Play Console

Alle antwoorden per scherm staan klaar in [PLAY-CONSOLE-ANSWERS.md](PLAY-CONSOLE-ANSWERS.md). Uitnodigingen voor testers: [TESTERS.md](TESTERS.md).

1. **App maken**: naam Life Tiles, taal Engels (Verenigd Koninkrijk), App, Gratis.
2. **Winkelvermelding**: teksten uit [LISTING.md](LISTING.md); afbeeldingen uit deze map. Voeg een Nederlandse vertaling toe.
3. **Privacybeleid**: `https://lifetiles.web.app/privacy.html`
4. **App-toegang**: alle functies zijn zonder inloggen beschikbaar (de knop "See an example" laat alles zien).
5. **Advertenties**: nee.
6. **Contentclassificatie**: vragenlijst invullen; categorie "Alle andere app-typen"; overal nee. Resultaat wordt PEGI 3 of vergelijkbaar.
7. **Doelgroep**: 18 jaar en ouder (niet voor kinderen, dat voorkomt extra eisen).
8. **Gegevensveiligheid**: "Verzamelt of deelt de app gegevens?" **Nee**. De foto's blijven op het apparaat; de standaardapp heeft geen vraagdienst.
9. **Overheids-app / financiële functies / gezondheid**: nee.

## 4. Besloten test (14 dagen, 12 testers)

1. **Test en release > Testen > Besloten test**: maak een track, upload `app-release-bundle.aab`.
2. Voeg een e-maillijst toe met minstens 12 testers (Gmail-adressen) en stuur ze de opt-in-link.
3. De testers moeten de app installeren en een paar keer openen in die 14 dagen. Vraag ze om feedback via de Play-link.
4. Na 14 dagen: **Productietoegang aanvragen** en de vragen over de test beantwoorden.

## 5. Openbaar

Na goedkeuring: **Productie > Nieuwe release**, dezelfde `.aab` (of een nieuwere versie), landen kiezen (alle landen), en publiceren. Google beoordeelt dit in een paar dagen.

## Later bijwerken

- Wijzigingen in de app (teksten, functies): alleen de web-app opnieuw publiceren. De Play-app laadt ze vanzelf.
- Nieuwe verpakking alleen nodig bij een nieuw icoon, een nieuwe naam of nieuwe Android-eisen. Gebruik dan in PWABuilder **dezelfde** `signing.keystore` en verhoog het versienummer.
