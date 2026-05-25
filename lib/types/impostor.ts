import { BasePlayer, BaseRoom, GameSettings, RoomStatus } from './core';

export type { RoomStatus };

export type GameMode = 'sentences' | 'concepts';

export type Winner = 'crew' | 'impostor' | null;

export type Category =
  | 'hrana'
  | 'filmovi'
  | 'sport'
  | 'zivotinje'
  | 'svakodnevica'
  | 'muzika'
  | 'tehnologija'
  | 'priroda'
  | 'istorija'
  | 'popkultura';

export interface Prompt {
  crew: string;
  impostor: string;
}

export interface PromptPair {
  crew: string;
  impostor: string;
}

export interface CategoryData {
  label: string;
  sentences: PromptPair[];
  concepts: PromptPair[];
}

export interface ImpostorPlayer extends BasePlayer {
  isAlive: boolean;
}

export interface ImpostorSettings extends GameSettings {
  impostorCount: number;
  revealOnVote: boolean;
}

export interface ImpostorRoom extends BaseRoom {
  gameType: 'impostor';
  gameMode: GameMode;
  category: Category;
  players: ImpostorPlayer[];
  impostorIds: string[];
  currentPrompt: Prompt;
  settings: ImpostorSettings;
  votes: Record<string, string>;
  eliminatedId: string | null;
  winner: Winner;
  round: number;
}
