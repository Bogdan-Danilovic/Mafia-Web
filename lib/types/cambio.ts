import { BasePlayer, BaseRoom, GameSettings } from './core';

export type { RoomStatus } from './core';

export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';
export type CardSuit = '♠' | '♥' | '♦' | '♣' | '';

export type PowerType = 'peek_own' | 'peek_opponent' | 'blind_swap' | 'peek_and_swap';
export type PowerStep = 'peek' | 'swap';

export interface CambioCard {
  rank: CardRank;
  suit: CardSuit;
  knownBy: string[];
}

export interface CambioPlayer extends BasePlayer {  isAI?: boolean;  cards: CambioCard[];
  penaltyCount: number;
  finalScore: number;
}

export interface ActivePower {
  type: PowerType;
  step: PowerStep | null;
  sourcePlayerIndex: number;
  sourceCardIndex: number;
  targetPlayerIndex: number | null;
  targetCardIndex: number | null;
}

export interface SnapWindow {
  open: boolean;
  discardedRank: string;
  openedAt: number;
  winner: string | null;
}

export type CambioStatus =
  | 'lobby'
  | 'initial_peek'
  | 'playing'
  | 'last_round'
  | 'scoring'
  | 'finished';

export interface CambioRoom extends BaseRoom {
  gameType: 'cambio';  expiresAt: number;
  players: CambioPlayer[];
  settings: Record<string, unknown>;
  drawPile: CambioCard[];
  discardPile: CambioCard[];
  currentPlayerIndex: number;
  drawnCard: CambioCard | null;
  cambioCalledBy: string | null;
  lastRoundRemaining: string[];
  activePower: ActivePower | null;
  snapWindow: SnapWindow | null;
  peekReady: string[];
  roundNumber: number;
}
