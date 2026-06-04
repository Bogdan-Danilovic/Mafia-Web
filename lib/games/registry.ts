import { GameType } from '@/lib/types/core';

export interface GameDefinition {
  id: GameType;
  name: string;
  description: string;
  shortDescription: string;
  icon: string;
  accentColor: string;
  minPlayers: number;
  maxPlayers: number;
  avgDuration: string;
  path: string;
  available: boolean;
  tags: string[];
}

export const GAMES: GameDefinition[] = [
  {
    id: 'impostor',
    name: 'Impostor',
    description: 'Jedan od vas laže. Ostali moraju da otkriju ko je uhoda.',
    shortDescription: 'Pronađi lažova',
    icon: '🎭',
    accentColor: '#8b5cf6',
    minPlayers: 2,
    maxPlayers: 12,
    avgDuration: '10-20 min',
    path: '/games/impostor',
    available: true,
    tags: ['dedukcija', 'blef'],
  },
  {
    id: 'alias',
    name: 'Alias',
    description: 'Objasni što više riječi za 60 sekundi. Tvoj tim mora da pogodi.',
    shortDescription: 'Reci drugim riječima',
    icon: '💬',
    accentColor: '#0891b2',
    minPlayers: 2,
    maxPlayers: 16,
    avgDuration: '15-30 min',
    path: '/games/alias',
    available: true,
    tags: ['riječi', 'tim', 'brzina'],
  },
  {
    id: 'avalon',
    name: 'Avalon',
    description: 'Tajni ratnici dobra i zla. Merlin zna istinu — ali ne sme da govori.',
    shortDescription: 'Dedukcija i blef',
    icon: '⚔️',
    accentColor: '#ef4444',
    minPlayers: 5,
    maxPlayers: 10,
    avgDuration: '30-60 min',
    path: '/games/avalon',
    available: true,
    tags: ['uloge', 'dedukcija', 'blef'],
  },
  {
    id: 'flip7',
    name: 'Flip 7',
    description: 'Sakupljaj karte i znaj kada da staneš — pre nego što dobiješ duplikat!',
    shortDescription: 'Kartaška igra sreće za 2+ igrača',
    icon: '🃏',
    accentColor: '#f59e0b',
    minPlayers: 2,
    maxPlayers: 18,
    avgDuration: '15-30 min',
    path: '/games/flip7',
    available: true,
    tags: ['karte', 'sreća', 'blef'],
  },
  {
    id: 'drawing',
    name: 'Šta bi nacrtao?',
    description: 'Jedan crta, ostali pogađaju — brzina donosi bodove.',
    shortDescription: 'Crtaj i pogađaj u realnom vremenu',
    icon: '✏️',
    accentColor: '#f59e0b',
    minPlayers: 2,
    maxPlayers: 8,
    avgDuration: '15-25 min',
    path: '/games/drawing',
    available: true,
    tags: ['kreativnost', 'crtanje', 'pogađanje'],
  },
  {
    id: 'gartic',
    name: 'Gartic',
    description: 'Pišeš, neko crta, neko opisuje — vidi gdje završi tvoja poruka.',
    shortDescription: 'Telefon koji se crta',
    icon: '📞',
    accentColor: '#ec4899',
    minPlayers: 2,
    maxPlayers: 8,
    avgDuration: '20-30 min',
    path: '/games/gartic',
    available: true,
    tags: ['crtanje', 'pisanje', 'haos', 'kreativnost'],
  },
  {
    id: 'uno',
    name: 'UNO',
    description: 'Klasična kartaška igra — baci kartu, vikni UNO i ostavi sve bez karata!',
    shortDescription: 'Klasična kartaška igra za 2–10 igrača',
    icon: '🃏',
    accentColor: '#f97316',
    minPlayers: 2,
    maxPlayers: 10,
    avgDuration: '30-60 min',
    path: '/games/uno',
    available: true,
    tags: ['karte', 'klasično', 'porodično'],
  },
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Opšte znanje. Ko zna više — pobeđuje.',
    shortDescription: 'Opšte znanje',
    icon: '🧠',
    accentColor: '#059669',
    minPlayers: 2,
    maxPlayers: 20,
    avgDuration: '20-40 min',
    path: '/games/trivia',
    available: false,
    tags: ['znanje', 'kviz'],
  },
];

export function getGameById(id: GameType): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
