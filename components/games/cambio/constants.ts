import { CardRank, PowerType } from '@/lib/types/cambio';

export const CARD_VALUES: Record<string, number> = {
  A: 1,
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8,
  '9': 9, '10': 10,
  J: 10, Q: 10,
  K_black: 10,
  K_red: -1,
  JOKER: 0,
};

export const SPECIAL_POWERS: Partial<Record<CardRank | 'K_black', PowerType>> = {
  '7': 'peek_own',
  '8': 'peek_own',
  '9': 'peek_opponent',
  '10': 'peek_opponent',
  J: 'blind_swap',
  Q: 'blind_swap',
  K_black: 'peek_and_swap',
} as unknown as Partial<Record<CardRank | 'K_black', PowerType>>;

export function getCardValue(rank: CardRank, suit: string): number {
  if (rank === 'JOKER') return 0;
  if (rank === 'K') {
    return suit === '♥' || suit === '♦' ? -1 : 10;
  }
  return CARD_VALUES[rank] ?? 0;
}

export function getCardPower(rank: CardRank, suit: string): PowerType | null {
  if (rank === 'K' && (suit === '♠' || suit === '♣')) return 'peek_and_swap';
  return (SPECIAL_POWERS as Record<string, PowerType | undefined>)[rank] ?? null;
}

export const SNAP_WINDOW_MS = 2000;
export const AI_THINK_DELAY_MS = 1200;
export const INITIAL_PEEK_DURATION_MS = 8000;
