export type Spice = 'chili' | 'wasabi' | 'pepper';
export type SpicyCardType = 'spicy' | 'joker_spice' | 'joker_number' | 'enough';

export interface SpicyCard {
  id: string;
  type: SpicyCardType;
  spice?: Spice;
  value?: number;
}

export interface SpicyClaim {
  spice: Spice;
  value: number;
}

export interface SpicyPlayer {
  id: string;
  name: string;
  hand: SpicyCard[];
  wonCards: SpicyCard[];
  trophies: number;
}

export type SpicyPhase =
  | 'handoff'
  | 'playing'
  | 'challenge_window'
  | 'challenge_result'
  | 'last_card_window'
  | 'trophy'
  | 'end';

export type ChallengeOutcome = 'challenger_wins' | 'player_wins';

export interface SpicyChallengeResult {
  topCard: SpicyCard;
  challengeType: 'spice' | 'number';
  outcome: ChallengeOutcome;
  challengerIndex: number;
  playerIndex: number;
  winnerIndex: number;
  loserIndex: number;
  pileCardsCount: number;
}

export interface SpicyGameState {
  players: SpicyPlayer[];
  drawPile: SpicyCard[];
  pile: SpicyCard[];
  lastClaim: SpicyClaim | null;
  isFirstOnPile: boolean;
  currentPlayerIndex: number;
  trophiesLeft: number;
  phase: SpicyPhase;
  challengeResult: SpicyChallengeResult | null;
  lastCardPlayerIndex: number | null;
  lastCardChallengeWon: boolean | null;
  winner: SpicyPlayer | null;
}

export interface SpicyPlayerSetup {
  id: string;
  name: string;
}
