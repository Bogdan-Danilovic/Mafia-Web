import { BasePlayer, BaseRoom, GameSettings } from './core';

export type { RoomStatus } from './core';

export type Flip7NumberValue =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Flip7ModifierValue = 'x2' | '+2' | '+4' | '+6' | '+8' | '+10';
export type Flip7ActionValue = 'stop' | 'druga_sansa' | 'okreni_tri';

export type Flip7CardType =
  | { kind: 'number'; value: Flip7NumberValue }
  | { kind: 'modifier'; value: Flip7ModifierValue }
  | { kind: 'action'; value: Flip7ActionValue };

export interface Flip7Card {
  id: string;
  type: Flip7CardType;
}

export type Flip7PlayerStatus = 'active' | 'exited' | 'busted' | 'flip7';

export interface Flip7Player extends BasePlayer {
  numberCards: Flip7Card[];
  modifierCards: Flip7Card[];
  hasDrugaSansa: boolean;
  status: Flip7PlayerStatus;
  roundScore: number;
  totalScore: number;
  isDealer: boolean;
}

export type Flip7Status = 'lobby' | 'playing' | 'round_end' | 'finished';

export interface Flip7Settings extends GameSettings {
  targetScore: number;
}

export interface Flip7PendingAction {
  type: 'stop' | 'okreni_tri' | null;
  byPlayerId: string | null;
}

export interface Flip7Room extends BaseRoom {
  gameType: 'flip7';
  status: Flip7Status;
  players: Flip7Player[];
  settings: Flip7Settings;
  deck: Flip7Card[];
  discardPile: Flip7Card[];
  currentDealerIndex: number;
  currentTargetIndex: number;
  winnerId: string | null;
  pendingAction: Flip7PendingAction;
  lastEvent: string | null;
  roundNumber: number;
}
