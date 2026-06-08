import { BasePlayer, BaseRoom, GameSettings } from './core';

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
  'mafia':      'mafia',
  'mafia-boss': 'mafia',
  'dama':       'mafia',
  'policajac':  'civilian',
  'doktor':     'civilian',
  'osvetnik':   'neutral',
  'civil':      'civilian',
};

export const ROLE_LABEL: Record<Role, string> = {
  'mafia':      'Mafijaš',
  'mafia-boss': 'Mafia Boss',
  'dama':       'Dama',
  'policajac':  'Policajac',
  'doktor':     'Doktor',
  'osvetnik':   'Osvetnik',
  'civil':      'Civil',
};

export const ROLE_ICON: Record<Role, string> = {
  'mafia':      '🔫',
  'mafia-boss': '👑',
  'dama':       '💋',
  'policajac':  '🕵️',
  'doktor':     '💉',
  'osvetnik':   '⚔️',
  'civil':      '👤',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  'mafia':      'Budi se noću sa timom. Narator bira žrtvu.',
  'mafia-boss': 'Vođa mafije. Narator ti daje nalog. Boss uvijek izgleda nevin.',
  'dama':       'Noću ućutkuješ jednog igrača — ne može glasati.',
  'policajac':  'Noću ispituješ jednog igrača. Narator ti šapće rezultat.',
  'doktor':     'Noću štiti jednog igrača. Možeš se zaštiti i sebe (jednom).',
  'osvetnik':   'Pasivna moć — ako te mafija napadne, i napadač gine. Napadom na mafiju gubiš moć.',
  'civil':      'Glasaj pametno. Ti si kičma civilnog tima.',
};

export type MafiaStatus = 'lobby' | 'role-reveal' | 'playing' | 'finished';

export interface MafiaPlayer extends BasePlayer {
  role: Role | null;
  isAlive: boolean;
  hasSeenRole: boolean;
}

export interface MafiaSettings extends GameSettings {
  showRoleOnEliminate: boolean;
}

export interface MafiaRoom extends Omit<BaseRoom, 'players'> {
  gameType: 'mafia';
  status: MafiaStatus;
  players: Record<string, MafiaPlayer>;
  winner: 'mafia' | 'civilians' | null;
  settings: MafiaSettings;
}

// ─── Role assignment table ─────────────────────────────────────────────────────

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
  const table = ROLE_TABLE[Math.min(Math.max(count, 6), 14)];
  if (table) return [...table];
  const base = [...(ROLE_TABLE[14] ?? [])];
  const extra = count - 14;
  return [...base, ...Array(Math.max(0, extra)).fill('civil' as Role)];
}
