export type GameType = 'impostor' | 'alias' | 'trivia' | 'avalon' | 'flip7' | 'drawing' | 'gartic' | 'uno' | 'spicy' | 'cambio' | 'mafia';

export type RoomStatus =
  | 'lobby'
  | 'playing'
  | 'round_end'
  | 'roleReveal'
  | 'discussion'
  | 'voting'
  | 'reveal'
  | 'roundStart'
  | 'explaining'
  | 'roundEnd'
  | 'scoreboard'
  | 'finished'
  | 'nightPhase'
  | 'missionPropose'
  | 'missionVote'
  | 'voteResult'
  | 'questPhase'
  | 'questResult'
  | 'assassinate'
  | 'word-selection'
  | 'drawing'
  | 'round-results'
  | 'writing'
  | 'reveal'
  | 'challenge_window'
  | 'challenge_result'
  | 'last_card_window'
  | 'spicy_trophy'
  | 'initial_peek'
  | 'last_round'
  | 'scoring'
  | 'role-reveal'
  | 'night'
  | 'night-processing'
  | 'day-results'
  | 'day-vote'
  | 'vote-results'
  | 'revenge';

export interface BasePlayer {
  id: string;
  name: string;
  isConnected: boolean;
  isHost?: boolean;
  isAI?: boolean;
  joinedAt?: number;
}

export interface GameSettings {
  [key: string]: unknown;
}

export interface BaseRoom {
  code: string;
  status: RoomStatus;
  hostId: string;
  players: BasePlayer[];
  createdAt: number;
  expiresAt: number;
  gameType: GameType;
  settings: GameSettings;
}
