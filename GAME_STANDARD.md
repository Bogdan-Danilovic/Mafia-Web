# Game Hub — Standard za integraciju igara

## Pregled

Svaka igra živi u svom GitHub repou i sadrži `game.config.json` fajl koji opisuje njenu strukturu. Skripta `scripts/add-game.ts` automatski klonira repo, validira config, kopira fajlove u Game Hub i adaptira importe.

## game.config.json

Svaki game repo MORA sadržati `game.config.json` u root-u. Fajl se validira prema `game.config.schema.json` u Game Hub repou.

### Obavezna polja

| Polje | Tip | Opis |
|-------|-----|------|
| `id` | string | Kebab-case identifikator (npr. `impostor`, `alias`). Koristi se za foldere i rute. |
| `name` | string | Ime igre prikazano u hub-u |
| `version` | string | Semver verzija (npr. `1.0.0`) |
| `description` | string | Pun opis (1-2 rečenice) |
| `shortDescription` | string | Kratak opis za karticu (max 50 karaktera) |
| `icon` | string | Emoji ikona |
| `accentColor` | string | Hex boja (npr. `#8b5cf6`) |
| `minPlayers` | number | Minimalni broj igrača |
| `maxPlayers` | number | Maksimalni broj igrača |
| `avgDuration` | string | Prosečno trajanje (npr. `10-20 min`) |
| `tags` | string[] | Tagovi za pretragu |
| `gameType` | object | `{ id, statuses[] }` — statusi sobe |
| `files` | object | Mapa fajlova za kopiranje |

### Opciona polja

| Polje | Tip | Opis |
|-------|-----|------|
| `sharedDependencies` | object | Fajlovi koji već postoje u Hub-u (ne kopiraju se) |
| `npmDependencies` | object | Dodatni npm paketi (`{ "package": "^1.0.0" }`) |

## Struktura game repoa

```
game-repo/
  game.config.json              ← OBAVEZNO
  lib/
    types.ts                    ← Tipovi igre (extends BaseRoom, BasePlayer)
    firestore.ts                ← Firestore operacije
    utils.ts                    ← Opciono — utility funkcije
    prompts/                    ← Opciono — prompt podaci
      index.ts
      *.ts
  components/
    screens/                    ← Screen komponente igre
      LobbyScreen.tsx
      DiscussionScreen.tsx
      VotingScreen.tsx
      ...
  hooks/                        ← Opciono — game-specific hookovi
  app/
    page.tsx                    ← Home stranica igre
    room/[code]/page.tsx        ← Room stranica
```

## Pravila za tipove (lib/types.ts)

Fajl MORA exportovati:
- Tip igrača koji extends `BasePlayer` iz `@/lib/types/core`
- Tip sobe koji extends `BaseRoom` iz `@/lib/types/core`
- Tip settings-a koji extends `GameSettings` iz `@/lib/types/core`

Skripta automatski dodaje import iz `./core` prilikom kopiranja.

## Pravila za komponente

Sve screen komponente MORAJU primati props:
```typescript
interface ScreenProps {
  room: GameRoom;     // tip sobe specifičan za igru
  playerId: string;
}
```

## Mapa importa (automatska transformacija)

Skripta automatski menja importe prilikom kopiranja:

| Source (game repo) | Target (Game Hub) |
|--------------------|-------------------|
| `@/lib/types` | `@/lib/types/{gameId}` |
| `@/lib/firestore` | `@/lib/firestore/{gameId}` |
| `@/lib/firebase` | `@/lib/firebase` (bez promene) |
| `@/lib/utils` | `@/lib/utils` (bez promene) |
| `@/lib/prompts/index` | `@/lib/prompts/index` (bez promene) |
| `@/components/ui/X` | `@/components/shared/X` |
| `@/components/screens/X` | `@/components/games/{gameId}/X` |
| `@/hooks/usePlayer` | `@/hooks/usePlayer` (bez promene) |
| `@/hooks/useRoom` | `@/hooks/useRoom` (bez promene) |

## Korišćenje skripte

### Dodavanje nove igre
```bash
npx ts-node scripts/add-game.ts https://github.com/Bogdan-Danilovic/Impostor-Web
```

### Ažuriranje postojeće igre
Ista komanda — skripta detektuje da igra postoji i nudi opciju ažuriranja.

### Šta skripta radi
1. Klonira repo u `temp/`
2. Čita i validira `game.config.json`
3. Kopira komponente u `components/games/{gameId}/`
4. Kopira lib fajlove na ispravne putanje
5. Adaptira sve importe
6. Ažurira `lib/games/registry.ts` (dodaje ili ažurira entry)
7. Ažurira `lib/types/core.ts` (dodaje gameId u GameType union)
8. Briše `temp/`
9. Pokreće `npm run build`
10. Ako build prođe → git commit + push
11. Ako build pukne → rollback svih promena

## Verifikacija

Nakon integracije, sledeće mora proći:
- `npx tsc --noEmit` — nula TypeScript grešaka
- `npm run build` — uspešan Next.js build
- Postojeće igre moraju ostati potpuno netaknute
- Nova igra mora biti vidljiva na Hub homepage-u

## Primer: game.config.json za Impostor

```json
{
  "id": "impostor",
  "name": "Impostor",
  "version": "1.0.0",
  "description": "Jedan od vas laže. Ostali moraju da otkriju ko je uhoda.",
  "shortDescription": "Pronađi lažova",
  "icon": "🎭",
  "accentColor": "#8b5cf6",
  "minPlayers": 3,
  "maxPlayers": 12,
  "avgDuration": "10-20 min",
  "tags": ["dedukcija", "blef"],
  "gameType": {
    "id": "impostor",
    "statuses": ["lobby", "roleReveal", "discussion", "voting", "reveal", "finished"]
  },
  "files": {
    "types": "lib/types.ts",
    "firestore": "lib/firestore.ts",
    "utils": "lib/utils.ts",
    "prompts": "lib/prompts/",
    "components": "components/screens/",
    "pages": {
      "home": "app/page.tsx",
      "room": "app/room/[code]/page.tsx"
    }
  },
  "sharedDependencies": {
    "components": ["components/ui/"],
    "hooks": ["hooks/usePlayer.ts"],
    "lib": ["lib/firebase.ts", "lib/utils.ts"]
  },
  "npmDependencies": {}
}
```
