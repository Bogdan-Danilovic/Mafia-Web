export type { GameType, RoomStatus, BasePlayer, BaseRoom, GameSettings } from './types/core';
export type {
  GameMode,
  Winner,
  Category,
  Prompt,
  PromptPair,
  CategoryData,
  ImpostorPlayer,
  ImpostorSettings,
  ImpostorRoom,
} from './types/impostor';

export type Player = import('./types/impostor').ImpostorPlayer;
export type Room = import('./types/impostor').ImpostorRoom;
export type RoomSettings = import('./types/impostor').ImpostorSettings;
