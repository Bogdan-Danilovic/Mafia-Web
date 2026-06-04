# Prompt: Implementacija igre „Papreno" u Game-Hub projekat

---

## 🧩 Kontekst

Prompt za dodavanje **Papreno** kartičane igre blefiranja u postojeći game-hub projekat.
Prilagodi tehnologiju prema svom stacku pre slanja.

---

## 📋 Glavni prompt

---

Implementiraj igru **Papreno** kao novi modul u game-hub projektu.

### 🎯 Opis igre

Papreno je kartičana igra blefiranja za **2–6 igrača**. Igrači igraju karte licem nadole i **objavljuju** broj i začin — istinito ili lažno. Ostali igrači mogu **izazvati** objavu. Ko skupi najviše poena (osvajanjem karata iz gomile + trofej karte) — pobeđuje.

---

### ⚙️ Tehničke specifikacije

**Stack:** [UNESI — npr. React + TypeScript, Vue 3, Next.js, SvelteKit...]  
**Stilizacija:** [UNESI — npr. Tailwind CSS, CSS Modules, styled-components...]  
**State management:** [UNESI — npr. Zustand, Redux, Pinia, useState/useReducer...]  
**Mod igre:** [IZABERI — Lokalni multiplayer (hot-seat) / vs AI / Online (WebSocket)]  
**Varijanta:** [IZABERI — Standardna / Začinjena (sa ZAČINJENIM kartama)]

---

### 🃏 Model podataka — karte

```typescript
type Spice = 'chili' | 'wasabi' | 'pepper';
type CardType = 'spicy' | 'joker_spice' | 'joker_number' | 'trophy' | 'enough' | 'spiced';

interface Card {
  id: string;
  type: CardType;
  spice?: Spice;    // undefined za džokere i non-spicy karte
  value?: number;   // 1–10, undefined za džokere
}

interface Claim {
  spice: Spice;
  value: number;    // 1–10
}

interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  hand: Card[];
  wonCards: Card[];   // karte uzete iz gomile — čuvaju se licem nadole, ne gledaju se
  trophies: number;   // 0–2 (treći trofej nije moguć — igra staje pri drugom)
}

interface GameState {
  players: Player[];
  drawPile: Card[];           // vučni špil; kada drawPile[0].type === 'enough' → kraj igre
  pile: Card[];               // paprena gomila, licem nadole; pile[pile.length-1] = vrh
  lastClaim: Claim | null;    // poslednja validna objava
  isFirstOnPile: boolean;     // true dok je gomila prazna (resetuje se posle svakog izazova)
  currentPlayerIndex: number;
  trophiesLeft: number;       // 3 → 2 → 1 → 0; kada 0 → kraj igre
  phase: 'setup' | 'playing' | 'last_card_pending' | 'challenge' | 'end';
  pepperyDriveActive: boolean;      // Paprena vožnja: gomila je "čuvana"
  pepperyDriveCoveredCount: number; // koliko karata je pokriveno
  activeSpicedCards: SpicedCard[];  // aktivne ZAČINJENE karte (varijanta)
  winner: Player | null;
}
```

---

### ⚙️ Logika igre — šta treba implementirati

#### 1. Inicijalizacija

- Ukupno **100 paprenih karata** (crna pozadina), uključujući džokere
- Od tog broja: 3 džoker-začin + 5 džoker-broj = 8 džokera
- Preostalih 92 karte raspoređeno na 3 začina × 10 vrednosti (prilagodi primerke da zbir bude 92)
- Promešaj špil (Fisher–Yates)
- Podeli svakom igraču **6 karata**
- **DOSTA karta:** ubaci je u špil na poziciju koja odgovara broju igrača prema strelici štampanoj na samoj DOSTA karti — nemoj hard-codovati pozicije, već implementiraj mehanizam ubacivanja na zadatu poziciju od vrha
- Postavi 3 trofej karte pored špila

#### 2. Validacija objave

```typescript
function isValidClaim(
  claim: Claim,
  lastClaim: Claim | null,
  isFirstOnPile: boolean
): boolean {
  // Prva karta na gomili: vrednost 1–3, začin slobodan
  if (isFirstOnPile) {
    return claim.value >= 1 && claim.value <= 3;
  }

  // Začin mora biti isti — uvek, uključujući i reset posle 10
  if (claim.spice !== lastClaim!.spice) return false;

  // Normalan slučaj: veći broj od prethodnog
  if (claim.value > lastClaim!.value) return true;

  // Reset posle 10: dozvoljeno je objaviti 1, 2 ili 3 istog začina
  if (lastClaim!.value === 10 && claim.value >= 1 && claim.value <= 3) return true;

  return false;
}
```

> ⚠️ **Ispravka u odnosu na prethodnu verziju:** reset posle 10 mora zadržati isti začin. Prethodna implementacija nije eksplicitno proveravala `claim.spice === lastClaim!.spice` unutar reset grane — to je bug.

#### 3. Rešavanje izazova

```typescript
function resolveChallenge(
  topCard: Card,
  claim: Claim,
  challenged: 'spice' | 'number'
): 'challenger_wins' | 'player_wins' {
  // Džoker nema tu osobinu → izazivač automatski pobeđuje
  if (topCard.type === 'joker_spice' && challenged === 'spice') return 'challenger_wins';
  if (topCard.type === 'joker_number' && challenged === 'number') return 'challenger_wins';

  if (challenged === 'spice') {
    return topCard.spice !== claim.spice ? 'challenger_wins' : 'player_wins';
  } else {
    return topCard.value !== claim.value ? 'challenger_wins' : 'player_wins';
  }
}
```

**Posle izazova — redosled operacija:**
1. Otkrij vrh gomile
2. Odredi pobednika
3. **Pobednik izazova** → uzima sve karte iz gomile i stavlja ih **licem nadole** ispred sebe (ne gleda ih — to su poeni); `player.wonCards.push(...pile)`
4. **Gubitnik izazova** → vuče 2 karte sa vrha špila; proverava da li je DOSTA otkrivena
5. Resetuj gomilu: `pile = []`, `isFirstOnPile = true`, `lastClaim = null`
6. Gubitnik **započinje novu gomilu** (on je `currentPlayer`)

#### 4. Vučenje karte i DOSTA karta

```typescript
function drawCard(state: GameState): { card: Card; gameEnded: boolean } {
  const card = state.drawPile.shift()!;

  // DOSTA karta se otkriva čim se izvuče — igra odmah staje
  if (card.type === 'enough') {
    return { card, gameEnded: true };
  }

  return { card, gameEnded: false };
}
```

> ⚠️ **Ispravka u odnosu na prethodnu verziju:** DOSTA karta se detektuje u trenutku **vučenja**, ne kao pasivna provera `drawPile[0]`. Kada se karta izvuče i ima tip `'enough'`, igra se odmah završava — karta se ne dodaje u ruku igrača.

#### 5. Trofej karta — redosled operacija

```typescript
// Kada igrač odigra poslednju kartu:
// 1. Igrač mora naglas objaviti "Poslednja karta!"
//    Ako ne objavi → vrati kartu u ruku, reci "dalje", vuci 1 kartu
// 2. Promeni phase u 'last_card_pending'
// 3. Sačekaj da se SVI igrači izjasne (timeout ili klik "Ne izazivam")
// 4a. Ako niko nije izazvao → igrač dobija trofej
// 4b. Ako je neko izazvao → reši izazov normalno
//     - Pobeda u izazovu → dobija trofej (gubitnik vuče 2 karte)
//     - Poraz u izazovu → nema trofeja, igra se nastavlja
// 5. Posle trofeja → igrač vuče novih 6 karata

function awardTrophy(state: GameState, playerId: string): GameState {
  const player = state.players.find(p => p.id === playerId)!;
  player.trophies += 1;
  state.trophiesLeft -= 1;

  // Proveri automatsku pobedu
  if (player.trophies >= 2) {
    state.phase = 'end';
    state.winner = player;
    return state;
  }

  // Proveri da li su sve trofej karte podeljene
  if (state.trophiesLeft === 0) {
    state.phase = 'end';
    return state;
  }

  // Igra se nastavlja — igrač vuče 6 novih karata
  for (let i = 0; i < 6; i++) {
    const { card, gameEnded } = drawCard(state);
    if (gameEnded) { state.phase = 'end'; return state; }
    player.hand.push(card);
  }

  return state;
}
```

#### 6. Uslovi završetka igre

```typescript
// Kraj igre se proverava na ČETIRI mesta — ne kao pasivna centralna funkcija:
// 1. Nakon drawCard() → ako je izvučena DOSTA karta
// 2. Nakon awardTrophy() → ako igrač ima 2 trofeja
// 3. Nakon awardTrophy() → ako trophiesLeft === 0
// 4. Tokom vučenja 6 karata posle trofeja → ako se DOSTA pojavi

// Bodovanje — poziva se samo kada phase === 'end' i nema automatskog pobednika
function calculateScore(player: Player): number {
  return (player.trophies * 10) + player.wonCards.length - player.hand.length;
}

function determineWinner(players: Player[]): Player {
  // Automatska pobeda (2 trofeja) je već rešena u awardTrophy
  return players.reduce((best, p) =>
    calculateScore(p) > calculateScore(best) ? p : best
  );
}
```

---

### 🖼️ UI/UX zahtevi

**Sto / Layout:**
- Paprena gomila u centru — prikazuj **visinu gomile** (broj karata), vrh je uvek licem nadole
- Pored gomile: poslednja objava uvek vidljiva (npr. „Igrac2: 7 vasabi")
- Špil za izvlačenje sa brojem preostalih karata
- Zona za 3 trofej karte (prazan slot / popunjen)
- Svaki igrač: karte u ruci + broj `wonCards` + broj trofeja

**Karte igrača:**
- Karte u ruci — **licem nagore samo lokalnom igraču** (hot-seat: okrenuto prema protivniku)
- Vizuelno razlikuj začine: 🌶️ čili → `#E53935`, 🟢 vasabi → `#43A047`, ⚫ biber → `#424242`
- Džokeri imaju poseban izgled (sve boje / svi brojevi)
- `wonCards` — prikazati kao gomilu licem nadole sa brojem karata (ne otkrivati sadržaj!)

**Akcije:**
- **„Odigraj kartu"** → modal: izaberi kartu iz ruke + unesi objavu (začin + broj dropdown)
  - Validacija objave u realnom vremenu pre potvrde
- **„Dalje"** → preskoči potez, automatski vuci 1 kartu
- **„Izazovi!"** → aktivan za SVE igrače tokom tuđeg poteza; modal: izaberi šta izaziva (broj / začin)
- **„Poslednja karta!"** → prikazuje se automatski kada igrač ima 0 karata posle odigravanja
- Animacija flip-a kada se otkriva karta tokom izazova

**Feedback:**
- Toast/modal sa rezultatom izazova: ko je pobedio, zašto, koliko karata dobija/gubi
- Vizuelno istaknuti trenutnog igrača (border, indicator)
- Upozorenje ako igrač pokuša pogledati okrenute karte

---

### 🤖 AI protivnik (opcionalno)

```typescript
class CardTracker {
  // Prati koje karte su izašle iz igre (bačene na gomilu, uzete)
  private seen: Map<string, number> = new Map(); // "chili_5" → broj viđenih primeraka

  recordPlayed(card: Card): void {
    if (!card.spice || !card.value) return;
    const key = `${card.spice}_${card.value}`;
    this.seen.set(key, (this.seen.get(key) ?? 0) + 1);
  }

  // Vraća procenu 0.0–1.0 da li je objava verovatno istinita
  probabilityValid(claim: Claim, totalCopies: number): number {
    const key = `${claim.spice}_${claim.value}`;
    const seen = this.seen.get(key) ?? 0;
    const remaining = Math.max(0, totalCopies - seen);
    return remaining / totalCopies;
  }
}

// Nivoi težine AI igrača:
// Lak:    igra nasumično, izaziva retko (10% šansa)
// Srednji: koristi CardTracker, izaziva kada je probabilityValid < 0.3
// Težak:  prati sve objave u rundi, modeluje verovatnoću blefa po igraču,
//         bira optimalne blefove na osnovu poznatih karata
```

---

### 🌶️ Začinjena varijanta — implementacija

| Karta | Efekat | Kako implementirati |
|-------|--------|---------------------|
| **Mi volimo čili!** | Za objave 1–3: može se promeniti začin u čili | Dodaj uslov u `isValidClaim`: ako `spicedCards` sadrži ovu kartu i `claim.value <= 3`, dozvoli i `claim.spice === 'chili'` bez provere prethodnog začina |
| **Predjelo!** | Posle 8/9/10: može se objaviti 1/2/3 (začin isti) | Proširi reset uslov u `isValidClaim`: `(lastClaim.value >= 8 && claim.value <= 3 && claim.spice === lastClaim.spice)` |
| **Paprena vožnja** | Objava „4" čuva gomilu šapom; bez izazova → osvaja karte pri sledećoj karti | Dodaj `pepperyDriveActive: boolean` u `GameState`; posle odigrane karte sa objavljenom 4, postavi flag; pri sledećoj odigranoj karti (ako nije bilo izazova): igrač uzima pokrivene karte, flag se resetuje, jedina karta u gomili je upravo odigrana |
| **Srećno!** | Posle objave 5: stavi do 2 karte ispod odigrane, vuci zamenu | Posebna akcija u fazi odigravanja; izazov otkriva samo gornju kartu, donje su imune |
| **Obrni okreni!** | 6 i 9 su ekvivalentni | U `resolveChallenge`: ako je `challenged === 'number'` i `spicedCards` sadrži ovu kartu, pobeduju i 6 i 9 → `(topCard.value === 6 \|\| topCard.value === 9) && (claim.value === 6 \|\| claim.value === 9)` |
| **Prepisivač** | Identična karta van reda; specijalni izazov traži tačnost obe osobine | Globalni listener na svaki `pile.push` event; ako drugi igrač ima identičnu kartu (isti začin + isti broj) i klikne brzo — odigrava je; izazov na prepisanu kartu: obe osobine moraju biti tačne za pobedu |

---

### 📁 Predložena struktura fajlova

```
src/
  games/
    papreno/
      index.[jsx|vue|ts]
      PaprenoGame.[jsx|vue]             ← Glavni container, prima props iz huba
      components/
        GameTable.[jsx|vue]             ← Sto sa gomilom, špilom, trofejima
        PlayerHand.[jsx|vue]            ← Karte u ruci igrača
        WonCardsStack.[jsx|vue]         ← Licem nadole gomila poena (ne otkriva sadržaj)
        ClaimModal.[jsx|vue]            ← Objava: izbor karte + začin + broj
        ChallengeButton.[jsx|vue]       ← Izazov dugme + modal (broj / začin)
        LastCardAnnouncement.[jsx|vue]  ← "Poslednja karta!" UI + čekanje izjava
        TrophyZone.[jsx|vue]            ← 3 slota za trofej karte
        ScoreBoard.[jsx|vue]            ← Rezultati na kraju igre
        CardFlipAnimation.[jsx|vue]     ← Flip animacija pri otkrivanju
      logic/
        gameEngine.[ts]                 ← Čista logika igre (bez UI)
        cardFactory.[ts]                ← Kreiranje i mešanje špila (100 karata)
        claimValidator.[ts]             ← isValidClaim (sa ispravnim reset+začin)
        challengeResolver.[ts]          ← resolveChallenge + džoker logika
        drawCard.[ts]                   ← drawCard sa DOSTA detekcijom
        scoring.[ts]                    ← calculateScore, determineWinner
        aiPlayer.[ts]                   ← AI logika (opciono)
        cardTracker.[ts]                ← CardTracker klasa
      spiced/
        spicedRules.[ts]                ← Delta pravila za svaku ZAČINJENU kartu
        SpicedCardDisplay.[jsx|vue]     ← Prikaz aktivnih ZAČINJENIH karata
      types/
        papreno.types.[ts]              ← Svi TypeScript tipovi
      papreno-pravila.md                ← Kompletna pravila igre
```

---

### 🔗 Integracija u game-hub

```tsx
// Pozivanje iz huba
<PaprenoGame
  playerName="Marko"
  playerCount={4}           // 2–6
  variant="standard"        // 'standard' | 'spiced'
  onGameEnd={(result) => {
    // result: { winner: Player, scores: {playerId, name, total}[], duration: number }
    updateLeaderboard(result);
    navigateToHub();
  }}
/>
```

1. Dodaj „Papreno" u listu igara huba sa ikonom (🌶️)
2. Poveži rutu: `/games/papreno`
3. Na kraju igre emituj `game:finished` sa `{ scores, winner, duration }` za globalni leaderboard

---

### 📐 Napomene za implementaciju

- **Logika čista od UI-a** — sve funkcije u `/logic` su pure funkcije, lakše za testiranje
- **wonCards se nikad ne otkrivaju** tokom igre — samo brojač; sadržaj se vidi tek na bodovanju
- **DOSTA karta** — detektuje se u `drawCard()` funkciji, ne kao pasivna provera stanja
- **isFirstOnPile flag** — resetuje se na `true` posle svakog izazova (nova gomila)
- **Seed-able random** za reproducibilno testiranje špila
- **Čista client-side** — igra ne zahteva backend

---

*Uz ovaj prompt priloži fajl `papreno-pravila.md` kao kompletnu referencu svih pravila.*
