import { BasePlayer, BaseRoom, GameSettings } from './core';

export type { RoomStatus } from './core';

export type Role =
  | 'mafia'
  | 'mafia-boss'
  | 'dama'
  | 'policajac'
  | 'doktor'
  | 'osvetnik'
  | 'civil';

export type Team = 'mafia' | 'civilian' | 'neutral';

export const ROLE_TEAM: Record<Role, Team> = {
  'mafia': 'mafia',
  'mafia-boss': 'mafia',
  'dama': 'mafia',
  'policajac': 'civilian',
  'doktor': 'civilian',
  'osvetnik': 'neutral',
  'civil': 'civilian',
};

export const ROLE_LABEL: Record<Role, string> = {
  'mafia': 'Mafijaš',
  'mafia-boss': 'Mafia Boss',
  'dama': 'Dama',
  'policajac': 'Policajac',
  'doktor': 'Doktor',
  'osvetnik': 'Osvetnik',
  'civil': 'Civil',
};

export const ROLE_ICON: Record<Role, string> = {
  'mafia': '🔫',
  'mafia-boss': '👑',
  'dama': '💋',
  'policajac': '🕵️',
  'doktor': '💉',
  'osvetnik': '⚔️',
  'civil': '👤',
};

export type MafiaStatus =
  | 'lobby'
  | 'role-reveal'
  | 'night'
  | 'night-processing'
  | 'day-results'
  | 'day-vote'
  | 'vote-results'
  | 'revenge'
  | 'finished';

export interface NightAction {
  phase: number;
  actorId: string;
  targetId: string | null;
  actionType: 'kill' | 'protect' | 'silence' | 'investigate' | 'avenge' | 'skip';
}

export interface NightResult {
  killed: string[];
  saved: string[];
  silenced: string[];
  investigation: {
    targetId: string;
    result: 'mafia' | 'innocent';
  } | null;
  avengerDied: boolean;
  mafiaKillerDied: boolean;
  avengerLostPower: boolean;
  message: string;
}

export interface VoteRecord {
  voterId: string;
  targetId: string;
  round: number;
}

export interface MafiaPlayer extends BasePlayer {
  role: Role | null;
  isAlive: boolean;
  isSilenced: boolean;
  isProtected: boolean;
  hasVoted: boolean;
  currentVote: string | null;
  nightActionSubmitted: boolean;
  avengerPowerActive: boolean;
  selfProtectUsed: boolean;
  isRevealed: boolean;
}

export interface MafiaSettings extends GameSettings {
  allowSelfProtect: boolean;
  showEliminatedRole: boolean;
  dayDuration: number;
  nightDuration: number;
}

export interface MafiaRoom extends Omit<BaseRoom, 'players'> {
  gameType: 'mafia';
  status: MafiaStatus;
  players: Record<string, MafiaPlayer>;
  round: number;
  nightPhase: number;
  nightActions: NightAction[];
  nightResult: NightResult | null;
  votes: VoteRecord[];
  eliminatedThisRound: string | null;
  revengeAvailable: boolean;
  revengeTarget: string | null;
  winner: 'mafia' | 'civilians' | 'avenger' | null;
  winnerIds: string[];
  settings: MafiaSettings;
  nightActionsReady: Record<string, boolean>;
}

// Role assignment table
export const ROLE_TABLE: Record<number, Role[]> = {
  6:  ['mafia-boss', 'mafia', 'policajac', 'doktor', 'civil', 'civil'],
  7:  ['mafia-boss', 'mafia', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil'],
  8:  ['mafia-boss', 'mafia', 'dama', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil'],
  9:  ['mafia-boss', 'mafia', 'dama', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil', 'civil'],
  10: ['mafia-boss', 'mafia', 'mafia', 'dama', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil', 'civil'],
  11: ['mafia-boss', 'mafia', 'mafia', 'dama', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil', 'civil', 'civil'],
  12: ['mafia-boss', 'mafia', 'mafia', 'dama', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil', 'civil', 'civil', 'civil'],
  13: ['mafia-boss', 'mafia', 'mafia', 'dama', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil', 'civil', 'civil', 'civil', 'civil'],
  14: ['mafia-boss', 'mafia', 'mafia', 'dama', 'policajac', 'doktor', 'osvetnik', 'civil', 'civil', 'civil', 'civil', 'civil', 'civil', 'civil'],
};

export function getRolesForCount(count: number): Role[] {
  const table = ROLE_TABLE[count];
  if (table) return table;
  // Fallback for counts outside table — add civils
  const base = ROLE_TABLE[12] ?? [];
  const extra = count - 12;
  return [...base, ...Array(Math.max(0, extra)).fill('civil' as Role)];
}

export function checkWinCondition(
  players: Record<string, MafiaPlayer>
): 'mafia' | 'civilians' | 'avenger' | null {
  const all = Object.values(players);
  const alive = all.filter((p) => p.isAlive);

  const mafiaSide = alive.filter((p) => p.role && ROLE_TEAM[p.role] === 'mafia');
  const civilSide = alive.filter((p) => p.role && ROLE_TEAM[p.role] === 'civilian');
  const avengerAlive = alive.find((p) => p.role === 'osvetnik');

  // Mafia wins: mafia >= civilians+neutral, or all civilians dead
  if (mafiaSide.length >= civilSide.length + (avengerAlive ? 1 : 0) && mafiaSide.length > 0) {
    return 'mafia';
  }
  if (civilSide.length === 0 && !avengerAlive && mafiaSide.length > 0) {
    return 'mafia';
  }

  // Civilians win: all mafia dead
  if (mafiaSide.length === 0) {
    // Check if avenger is sole survivor
    if (avengerAlive && civilSide.length === 0) {
      return 'avenger';
    }
    return 'civilians';
  }

  // Avenger wins: sole survivor
  if (alive.length === 1 && avengerAlive) {
    return 'avenger';
  }

  return null;
}
