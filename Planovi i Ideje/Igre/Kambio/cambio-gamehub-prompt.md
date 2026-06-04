# Prompt: Cambio — Implementacija u Game-Hub projekat

> Priloži `cambio-pravila.md` uz ovaj prompt kao kompletnu referencu pravila.

---

## 🧩 Kontekst

Implementiraj kartašku igru **Cambio (Kambio)** kao potpuno funkcionalan modul unutar postojećeg game-hub projekta. Igra mora raditi **isključivo na klijentskoj strani** (bez backenda).

---

## ⚙️ Pre početka — popuni svoj stack

Pre nego što nastaviš, zameni placeholdere u ovom promptu:

```
Stack:            [React / Vue 3 / Next.js / vanilla JS / ...]
Stilizacija:      [Tailwind CSS / CSS Modules / styled-components / ...]
State management: [useState+useReducer / Zustand / Pinia / Redux / ...]
Mod igre:         [vs AI / lokalni multiplayer (hot-seat) / oboje]
```

---

## 🎯 Opis igre (kratko za AI)

Cambio je kartaška igra za 2–4 igrača. Svaki igrač dobija 4 karte licem nadole (formacija 2×2). Cilj je završiti sa što manje bodova. Igra se završava kada jedan igrač pozove „Cambio" — ostali odigraju još jedan krug, zatim se bodovi sabiraju. Detaljana pravila su u `cambio-pravila.md`.

---

## 🃏 Vrednosti karata za implementaciju

```js
// utils/constants.js
export const CARD_VALUES = {
  'A':  1,
  '2':  2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7':  7, '8': 8, '9': 9, '10': 10,
  'J':  10, 'Q': 10,
  'K_black': 10,   // ♠♣ Crni Kralj
  'K_red':  -1,    // ♥♦ Crveni Kralj
  'JOKER':   0,
};

export const SPECIAL_POWERS = {
  '7':  'peek_own',        // poglej svoju kartu
  '8':  'peek_own',
  '9':  'peek_opponent',   // poglej tuđu kartu
  '10': 'peek_opponent',
  'J':  'blind_swap',      // naslepo zameni svoju sa tuđom
  'Q':  'blind_swap',
  'K_black': 'peek_and_swap', // poglej + zameni bilo koje
};
// Napomena: moć se aktivira SAMO kada se karta baci direktno (ne pri zameni)
```

---

## 📐 State management — kompletna shema

```js
// Kompletan game state
{
  phase: 'setup' | 'initial_peek' | 'playing' | 'last_round' | 'scoring',

  players: [
    {
      id: number,
      name: string,
      isHuman: boolean,
      cards: [
        {
          rank: string,       // 'A', '2'...'10', 'J', 'Q', 'K', 'JOKER'
          suit: string,       // '♠' | '♥' | '♦' | '♣' | null (za Džoker)
          faceUp: boolean,    // da li je karta okrenuta nagore (vidljiva svima)
          knownBy: number[],  // niz id-eva igrača koji su videli ovu kartu
        }
      ],
      penaltyCount: number,   // broj kaznenih karata
    }
  ],

  drawPile: Card[],           // vučni špil
  discardPile: Card[],        // hrpa za bacanje (vrh = discardPile[last])

  currentPlayerIndex: number,
  drawnCard: Card | null,     // karta koju je igrač upravo vukao (u ruci)

  cambioCalledBy: number | null,       // id igrača koji je pozvao Cambio
  lastRoundRemaining: number[],        // id-evi igrača koji još nisu odigrali poslednji krug

  activePower: {
    type: 'peek_own' | 'peek_opponent' | 'blind_swap' | 'peek_and_swap' | null,
    step: 'peek' | 'swap' | null,      // za peek_and_swap, dva koraka
    sourceCard: Card | null,
  },

  snapWindow: {
    open: boolean,
    timeoutMs: 2000,                   // koliko ms igrači imaju da reaguju
    discardedCard: Card | null,
  },

  scores: { playerId: number, total: number }[],  // popunjava se na kraju
}
```

---

## 📁 Struktura fajlova

```
src/games/cambio/
├── index.jsx|vue               ← Ulazna tačka modula (export default)
├── CambioGame.jsx|vue          ← Glavni container, prima props iz huba
│
├── components/
│   ├── GameBoard.jsx|vue       ← Stol, raspored igrača oko njega
│   ├── PlayerHand.jsx|vue      ← 4 karte u 2×2 formaciji
│   ├── CardComponent.jsx|vue  ← Pojedinačna karta, flip animacija
│   ├── DrawPile.jsx|vue        ← Vučni špil + prikaz broja karata
│   ├── DiscardPile.jsx|vue     ← Hrpa za bacanje, vrh vidljiv
│   ├── ActionPanel.jsx|vue     ← Dugmad: Zadrži / Baci / Cambio!
│   ├── SpecialPowerModal.jsx|vue ← Overlay za specijalnu moć
│   ├── SnapOverlay.jsx|vue     ← Snap UI: tajmer + dugme za lepljenje
│   └── ScoreBoard.jsx|vue      ← Prikaz bodova na kraju runde
│
├── hooks/ (ili composables/ za Vue)
│   ├── useGameState.js         ← Centralni state + reducer/store
│   ├── useDeck.js              ← Kreiranje, mešanje, deljenje karata
│   ├── useSpecialPower.js      ← Logika specijalnih moći (korak po korak)
│   ├── useSnap.js              ← Snap tajmer, validacija, penali
│   └── useAI.js                ← CPU logika (opciono)
│
├── utils/
│   ├── constants.js            ← CARD_VALUES, SPECIAL_POWERS (vidi gore)
│   ├── deck.js                 ← Generisanje špila, Fisher-Yates shuffle
│   └── scoring.js             ← Sabiranje bodova, tie-breaking
│
├── cambio-pravila.md           ← Pravila igre (ova dokumentacija)
└── cambio.css                  ← Stilovi (ili Tailwind klase inline)
```

---

## 🔗 Integracija u game-hub

```jsx
// Primer pozivanja iz huba
<CambioGame
  playerName="Ana"          // ime ljudskog igrača
  playerCount={3}           // ukupan broj igrača (2-4)
  onGameEnd={(result) => {  // callback kada igra završi
    // result: { winner: Player, scores: [{playerId, total}] }
    updateLeaderboard(result);
    navigateToHub();
  }}
/>
```

Koraci integracije:
1. Dodaj Cambio u **game listu/meniju** huba sa rutom `/games/cambio`
2. Koristiti postojeći **design system / theme** huba za stilizaciju
3. `onGameEnd` emituje pobednika i sve bodove — hub ih koristi za leaderboard
4. Komponenta je **self-contained** — sav state je interno, ne zavisi od hub-ovog global state-a

---

## 🖼️ UI/UX zahtevi

### Raspored stola
- Karte igrača raspoređene **oko stola** (bottom = čovek, ostali okolo)
- Svaka ruka prikazuje **4 karte u 2×2 gridu**, licem nadole
- Karte koje je igrač **već video** imaju suptilni vizuelni indikator (npr. svetlija ivica)
- **Vučni špil** i **hrpa za bacanje** u centru

### Animacije (CSS-first)
```css
/* Flip karte */
.card { transition: transform 0.4s; transform-style: preserve-3d; }
.card.face-up { transform: rotateY(180deg); }

/* Snap flash */
.snap-success { animation: snapFlash 0.3s ease-out; }
@keyframes snapFlash { 0%,100%{opacity:1} 50%{opacity:0.2; transform:scale(1.1)} }

/* Deljenje karata */
.card.dealing { animation: dealCard 0.3s ease-out; }
@keyframes dealCard { from{opacity:0; transform:translateY(-40px)} to{opacity:1; transform:translateY(0)} }
```

### Tok interakcija (human turn)
1. Igrač klikne vučni špil → karta se prikazuje u "ruci" (izolovano, ne u formaciji)
2. Prikazuju se dugmad: **[Zadrži i zameni]** / **[Baci direktno]**
3. Ako baci direktno i karta je specijalna → otvara se `SpecialPowerModal`
4. Posle poteza → proveri da li je moguć Snap (otvori `SnapOverlay` na 2 sec)
5. **[Cambio!]** dugme je uvek vidljivo tokom igračevog poteza (pre nego vuče)

### Snap UI
- Snap prozor se otvara na **2000ms** nakon što karta padne na hrpu
- Progress bar prikazuje preostalo vreme
- Igrač klikne na svoju kartu iste vrednosti da je zalepi
- Ako pogreši → prikazati error animaciju + kaznena karta

---

## 🤖 AI logika

### Memory sistem (za sve nivoe)
Svaki CPU igrač vodi evidenciju:
```js
cpuMemory[playerId] = {
  ownCards: { 0: 'K_red', 1: null, 2: 'JOKER', 3: null }, // null = ne zna
  opponentCards: {
    [opponentId]: { 0: '10', 1: null, 2: null, 3: null }
  }
}
```

### Nivoi težine

**Lak (Easy):**
- Vuče kartu uvek, nikad ne poziva Cambio pre 8+ krugova
- Zamene su nasumične, specijalne moći koristi nasumično

**Srednji (Medium):**
- Pamti karte koje je video (vlastite i tuđe)
- Procenjuje zbir poznatih karata; ako su sve poznate i zbir ≤ 8 → razmatra Cambio
- Specijalne moći: 7/8 → gleda kartu za koju ne zna vrednost; 9/10 → gleda tuđu; J/Q → menja svoju najgoru poznatu za tuđu najbolju poznatu

**Težak (Hard):**
- Prati probabilistički koje karte nisu videne (zna koje karte su već izašle)
- Snap: reaguje na Snap ako je siguran u kartu (iz memorije)
- Cambio poziva samo kada su sve 4 karte poznate i zbir ≤ 5
- Crni Kralj: uvek gleda svoju nepoznatu kartu, zamenjuje najgoru svoju za tuđu Džoker/As ako zna

---

## ⚠️ Edge-case lista — implementiraj sve

| Edge-case | Ponašanje |
|-----------|-----------|
| Vučni špil se isprazni | Preokreni hrpu za bacanje (osim vrha) u novi špil |
| Kaznena karta — igrač je ne vidi | `knownBy: []` čak ni vlasnik je ne zna |
| Snap u isto vreme (multiplayer) | Timestamp-based: ko je prvi kliknuo |
| Snap na kaznenu kartu | Kaznena karta ne može biti snap-ovana |
| Poslednji krug + Cambio igrač | Igrač koji je pozvao Cambio ne igra poslednji krug |
| Tie-breaking | 1. Nije zvao Cambio; 2. Vrednost najniže karte; 3. Random |
| Igrač zameni nepoznatu kartu | Stara karta odlazi na hrpu — vrednost je sada poznata svima |
| Specijalna moć pri zameni | Moć se NE aktivira ako je karta bila zamenjena (ne bačena direktno) |

---

## 📋 Checklist za implementaciju

### Faza 1 — Core logika
- [ ] Generisanje i mešanje špila (`deck.js`)
- [ ] Deljenje karata (4 po igraču, 2×2)
- [ ] Početni pregled 2 karte (samo jednom)
- [ ] Vučenje karte iz špila
- [ ] Zamena karte / direktno bacanje
- [ ] Sabiranje bodova i tie-breaking (`scoring.js`)

### Faza 2 — Specijalne moći
- [ ] Detektovanje specijalne karte pri bacanju
- [ ] peek_own: selektuj svoju kartu i prikaži je samo tebi
- [ ] peek_opponent: selektuj tuđu kartu i prikaži je samo tebi
- [ ] blind_swap: selektuj svoju i tuđu, zameni bez gledanja
- [ ] peek_and_swap: najpre peek, zatim opcioni swap

### Faza 3 — Snap mehanika
- [ ] Otvaranje snap prozora (2 sec tajmer)
- [ ] Validacija snap-a (isti rang karte)
- [ ] Davanje karte drugom igraču nakon uspešnog snap-a
- [ ] Kaznena karta za pogrešan snap

### Faza 4 — Cambio finish
- [ ] Cambio dugme aktivno samo na početku poteza
- [ ] Poslednji krug za sve osim Cambio igrača
- [ ] Okretanje svih karata i prikaz ScoreBoard-a

### Faza 5 — AI & polish
- [ ] CPU logika (bar Medium nivo)
- [ ] Animacije (flip, deal, snap flash)
- [ ] Responsivan layout za 2/3/4 igrača
- [ ] `onGameEnd` callback prema hubu

---

*Priloži `cambio-pravila.md` uz ovaj prompt za kompletnu referencu svih pravila.*
