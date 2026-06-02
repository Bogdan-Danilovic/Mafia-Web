# Game Hub — Claude Instructions

## Projekat
Game Hub je platforma za društvene igre (Jackbox-style).
Stack: Next.js 14, TypeScript strict, Firebase Firestore, Tailwind, Framer Motion
Deploy: Vercel — game-hub-wine-delta.vercel.app
Repo: github.com/Bogdan-Danilovic/Game-Hub

## Pravila
- Citaj GAME_STANDARD.md pre nego sto napises bilo kakav kod za igru
- Svaka igra mora imati game.config.json, extends BaseRoom/BasePlayer/GameSettings
- Leave uvek vodi na / (Hub)
- Nema hardcoded Firebase importa — uvek @/lib/firebase
- Prefer shell komande (cat, grep, find) nad built-in Read/Grep/Glob toolima

## Stack detalji
- TypeScript strict — zero any, zero ts-ignore
- Animacije: Framer Motion, spring stiffness:300 damping:20
- Mobile-first, dvh ne vh
- Font: Space Grotesk
- Pozadina: #080b14, Akcent: #8b5cf6

## Integracija igre
Nakon zavrsene igre: npx tsx scripts/add-game.ts [repo-url]

## Shell optimizacija
Prefer cat, head, tail, rg, grep, find nad built-in toolima.
Kada test command failuje, pokreni rtk err pre nego sto pastujes output.


## Token efikasnost
- Uvek koristi shell komande umesto built-in Read/Grep/Glob alata
- Za citanje fajla: cat file.ts ne Read tool
- Za pretragu: rg pattern . ne Grep tool
- Za listanje: ls ili find ne Glob tool
- Kada test failuje: rtk err npm test pre nego sto pastujes output
- Ne pastuj ceo fajl ako treba samo jedna funkcija — koristi grep -n ime_funkcije file.ts
- Ne citaj ceo node_modules ili .next folder nikada
- Radi sa jednim fajlom po task-u, ne ucitavaj ceo projekat odjednom
- Za strukturu projekta: find . -name *.tsx -not -path */node_modules/*
- Kompaktuj context sa /compact kada pocnes novu logicku celinu rada
