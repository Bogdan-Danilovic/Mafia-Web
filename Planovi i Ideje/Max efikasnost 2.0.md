# MAX EFIKASNOST 2.0 — ULTIMATIVNA PRAVILA ZA AGENTA

> Svaki token koji ne proizvodi kod je otpad.

---

## 0. PRE NEGO ŠTO KRENEŠ (Obavezan redosled)

```
1. TodoWrite — kompletna lista svih fajlova koje ćeš dirati
2. Batch read SVIH relevantnih fajlova odjednom (jedan round-trip)
3. Tek onda piši — ni jedan edit pre nego što si pročitao sve što trebaš
```

Nikad ne edituj fajl koji nisi pročitao u ovoj sesiji.

---

## 1. SHELL > BUILT-IN ALATI (Uvek)

| Umesto ovoga | Radi ovo |
|---|---|
| Read tool | `cat file.ts` |
| Grep tool | `rg pattern .` |
| Glob tool | `ls` ili `find` |
| Čitanje celog fajla za jednu funkciju | `grep -n imeFunkcije file.ts` |

```bash
# Nađi gde je definisana funkcija — ne čitaj ceo fajl
grep -n "function handleClick\|const handleClick\|handleClick =" src/komponenta.tsx

# Nađi sve .tsx van node_modules
find . -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/.next/*"

# Pretraži sa kontekstom (3 linije gore/dole)
rg "useGameState" --type tsx -C 3
```

---

## 2. BATCH ČITANJE — NULTA TOLERANCIJA NA SEKVENCIJALNE READE

**Loše:**
```
čitam A... čitam B... čitam C...
```

**Dobro:**
```
čitam A, B, C istovremeno (jedan paralelni blok) → onda pišem sve izmene redom
```

Sve što je logički povezano čitaš u jednom potezu. Nikad ne čitaš fajl da bi odlučio koji sledeći fajl da čitaš — to znači da nisi dovoljno analizirao pre nego što si krenuo.

---

## 3. ZABRANJENE ZONE — NIKAD NE ČITAJ

```
node_modules/
.next/
dist/
build/
.git/
*.lock fajlovi (package-lock, yarn.lock, pnpm-lock)
```

Ako trebaš info o dependency-u — `cat package.json`, ne ulazi u node_modules.

---

## 4. HIRURŠKO ČITANJE — NE CELI FAJL AKO TREBAŠ SAMO DEO

```bash
# Samo prvih 30 linija (imports, tipovi)
head -30 src/game/GameRoom.tsx

# Samo određeni opseg linija
sed -n '45,90p' src/game/GameRoom.tsx

# Samo interface definicije
grep -n "interface\|type.*=\|export type" src/types/game.ts

# Samo exports iz fajla
grep -n "^export" src/lib/firebase.ts
```

---

## 5. EDIT > WRITE — UVEK

- `Edit` šalje samo diff → manji tool call
- `Write` šalje ceo fajl → uvek skuplje
- Koristi `Write` samo za **novi** fajl ili **kompletno prepisivanje** (>60% izmena)

Za `str_replace` / `Edit`: daj minimalan kontekst koji je **jedinstven** u fajlu.
Ne daj celu funkciju ako je dovoljno 3 linije oko izmene.

---

## 6. JEDNA STVAR PO EDITU

Svaki edit radi tačno **jednu logičku stvar**:
- ✅ Promena CSS varijable
- ✅ Dodavanje jednog prop-a
- ✅ Refaktor jedne funkcije
- ❌ CSS + nova komponenta + import u jednom `str_replace`

Lakši debug. Čist rollback. Manji diff.

---

## 7. NE PITAJ — ODLUČI I NAPOMENI

Ako nešto nije eksplicitno navedeno:
1. Primeni najbliži pattern koji postoji u kodu
2. Napiši kratku napomenu (jednu rečenicu) — samo ako je odluka neočekivana
3. Nastavi

```tsx
{/* surface-2 umesto surface-3 — viši kontrast na tamnoj pozadini */}
```

**Nikad** ne staj da pitaš za vizuelni detalj, naming konvenciju ili redosled koraka koje možeš sam razumno rešiti.

---

## 8. RTK ZA GREŠKE — PRE NEGO ŠTO PASUJEŠ OUTPUT

```bash
# Umesto da pastuješ ceo npm test output:
rtk err npm test

# Umesto celog build output-a:
rtk err npm run build

# Umesto TypeScript grešaka:
rtk err npx tsc --noEmit
```

RTK filtruje i kompaktuje — dobijaš samo ono što je relevantno.

---

## 9. BUILD — SAMO JEDNOM, NA KRAJU LOGIČKOG KORAKA

```
❌ build posle svakog fajla
✅ build kad završiš kompletan korak (ceo layout, cela igra, ceo feature)
```

Sve TypeScript greške fiksuj **pre** nego što pređeš na sledeći korak.
Greške rešavaš na mestu — ne refaktorišeš ceo fajl, samo tačno to.

---

## 10. GREŠKA — PROTOKOL

```
1. Pročitaj celu grešku (ne samo prvi red)
2. rtk err <komanda> ako je output dugačak
3. Identifikuj uzrok (najčešće: import ne postoji, tip se ne poklapa, undefined prop)
4. Fiksuj minimalno — samo to, ništa više
5. Nastavi bez reportovanja korisniku — samo ako je fix trivijalan
   Ako je netrivijalan: "Fiksovao X (razlog), nastavljam"
```

---

## 11. CONTEXT WINDOW — UPRAVLJANJE

```bash
# Na početku nove logičke celine:
/compact

# Nikad ne radi ove operacije u poslednjh 20% context window-a:
# - Veliki refaktor (>5 fajlova)
# - Feature koji span-uje više modula
# - Debug koji zahteva čitanje puno fajlova
```

Ako osećaš da context raste previše — `/compact` pre nego što nastaviš, ne čekaj da agent sam kompaktuje.

---

## 12. PARALELNI TOOL CALLS — UVEK GDE JE MOGUĆE

**Loše (sekvencijalno):**
```
Čitam A → Čitam B → Čitam C
```

**Dobro (paralelno, jedan round-trip):**
```
[Čitam A] [Čitam B] [Čitam C]  ← sve u jednoj poruci
```

Nezavisni tool call-ovi idu uvek u paraleli. Nikad sekvencijalno ako između njih nema zavisnosti.

---

## 13. TODOWRITE — OBAVEZAN NA STARTU

```
Pre prvog edita:
- Nabroji SVE fajlove koje ćeš dirati
- Svaki označi completed odmah kad ga završiš
- Ako sesija pukne — sledeća sesija čita todo, zna tačno gde je stalo
```

Granularnost todo-a = jedan fajl ili jedna logička operacija. Ne "uradi layout" — "edituj Sidebar.tsx", "edituj TopBar.tsx".

---

## 14. SUMMARY — JEDAN RED, NIŠTA VIŠE

Na kraju svakog koraka:
```
✅ Korak 3 završen — GameRoom.tsx, PlayerList.tsx, gameStore.ts editovani
```

Bez opisa šta si uradio. Bez "kao što vidite". Bez "uspešno implementirano".
Korisnik vidi kod — summary je samo checkpoint.

---

## 15. AGENTI — SPAWN SAMO AKO JE ZAISTA POTREBNO

```
❌ Spawn agent za svaki sub-task
✅ Radi inline dok god task ne prelazi 3+ query-a sa različitim domenama
```

Svaki spawn = hladni start + duplicirani context. Skupo.
Spawn samo za: paralelne nezavisne istraživačke zadatke, ili task koji bi zagušio glavni context.

---

## 16. ČITANJE PATTERN — REDOSLED EFIKASNOSTI

```
1. grep -n za lokaciju → 2. sed -n za opseg → 3. cat za ceo fajl (poslednji resort)
```

Nikad ne krećeš od `cat`. Uvek od `grep -n` da nađeš gde je šta.

---

## QUICK REFERENCE

```bash
# Nađi funkciju
grep -n "funkcija\|const ime" fajl.ts

# Čitaj opseg
sed -n '20,50p' fajl.ts

# Nađi sve fajlove feature-a
find . -path "*/igra/*" -name "*.tsx" -not -path "*/node_modules/*"

# Greška u buildu
rtk err npm run build

# Greška u testovima
rtk err npm test

# Novi logički blok
/compact

# Brza TypeScript provjera
rtk err npx tsc --noEmit
```

---

> **Zlatno pravilo**: Ako možeš da odlučiš bez pitanja — odluči.
> Ako možeš da čitaš manje — čitaj manje.
> Ako možeš da paralelizuješ — paralelizuj.
> Svaki token koji ne ide u kod je token bačen u kantu.
