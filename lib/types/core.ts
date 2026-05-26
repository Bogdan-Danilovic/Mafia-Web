export type GameType = 'impostor' | 'alias' | 'trivia';

export type RoomStatus =
  | 'lobby'
  | 'roleReveal'
  | 'discussion'
  | 'voting'
  | 'reveal'
  | 'roundStart'
  | 'explaining'
  | 'roundEnd'
  | 'scoreboard'
  | 'finished';

export interface BasePlayer {
  id: string;
  name: string;
  isConnected: boolean;
  isHost?: boolean;
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
  gameType: GameType;
  settings: GameSettings;
}
