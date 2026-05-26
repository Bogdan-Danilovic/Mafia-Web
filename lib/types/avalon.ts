import { BasePlayer, BaseRoom, GameSettings } from './core';

export type { RoomStatus } from './core';

export type AvalonRole =
  | 'merlin'
  | 'assassin'
  | 'percival'
  | 'mordred'
  | 'morgana'
  | 'oberon'
  | 'good'
  | 'evil';

export type Loyalty = 'good' | 'evil';

export interface AvalonPlayer extends BasePlayer {
  role: AvalonRole | null;
  loyalty: Loyalty | null;
  isOnMission: boolean;
  hasVoted: boolean;
  isLeader: boolean;
}

export interface AvalonSettings extends GameSettings {
  enablePercival: boolean;
  enableMordred: boolean;
  enableMorgana: boolean;
  enableOberon: boolean;
}

export type AvalonStatus =
  | 'lobby'
  | 'nightPhase'
  | 'roleReveal'
  | 'missionPropose'
  | 'missionVote'
  | 'voteResult'
  | 'questPhase'
  | 'questResult'
  | 'scoreboard'
  | 'assassinate'
  | 'finished';

export interface MissionResult {
  missionNumber: number;
  team: string[];
  successes: number;
  sabotages: number;
  result: 'success' | 'fail';
}

export type TeamVote = 'approve' | 'reject';
export type QuestVote = 'success' | 'sabotage';
export type Winner = 'good' | 'evil' | null;
export type WinReason = 'missions' | 'assassin' | 'rejects' | null;

export interface AvalonRoom extends BaseRoom {
  gameType: 'avalon';
  players: AvalonPlayer[];
  settings: AvalonSettings;
  currentMission: number;
  missionResults: MissionResult[];
  goodScore: number;
  evilScore: number;
  leaderIndex: number;
  consecutiveRejects: number;
  proposedTeam: string[];
  teamVotes: Record<string, TeamVote>;
  questVotes: Record<string, QuestVote>;
  assassinTarget: string | null;
  winner: Winner;
  winReason: WinReason;
}

export const PLAYER_DISTRIBUTION: Record<number, { good: number; evil: number }> = {
  5:  { good: 3, evil: 2 },
  6:  { good: 4, evil: 2 },
  7:  { good: 4, evil: 3 },
  8:  { good: 5, evil: 3 },
  9:  { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

export const MISSION_TEAM_SIZE: Record<number, number[]> = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

export function getMissionTeamSize(playerCount: number, missionNumber: number): number {
  const sizes = MISSION_TEAM_SIZE[playerCount];
  return sizes[missionNumber - 1];
}

export function getSabotagesRequired(playerCount: number, missionNumber: number): number {
  if (missionNumber === 4 && playerCount >= 7) return 2;
  return 1;
}
