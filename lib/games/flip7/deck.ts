import {
  Flip7Card,
  Flip7NumberValue,
  Flip7ModifierValue,
  Flip7ActionValue,
} from '@/lib/types/flip7';
import { shuffleArray } from '@/lib/utils';

const NUMBER_VALUES: Flip7NumberValue[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];
const MODIFIER_VALUES: Flip7ModifierValue[] = [
  'x2', '+2', '+4', '+6', '+8', '+10',
];
const ACTION_VALUES: Flip7ActionValue[] = ['stop', 'druga_sansa', 'okreni_tri'];

const ACTION_COPIES = 3;

export const FLIP7_DECK_SIZE = 94;
export const FLIP7_TARGET_COUNT = 7;
export const FLIP7_BONUS = 15;

export function createFlip7Deck(): Flip7Card[] {
  const cards: Flip7Card[] = [];

  for (const value of NUMBER_VALUES) {
    const copies = value === 0 ? 1 : value;
    for (let i = 0; i < copies; i++) {
      cards.push({ id: `n${value}-${i}`, type: { kind: 'number', value } });
    }
  }

  for (const value of MODIFIER_VALUES) {
    cards.push({ id: `m-${value}`, type: { kind: 'modifier', value } });
  }

  for (const value of ACTION_VALUES) {
    for (let i = 0; i < ACTION_COPIES; i++) {
      cards.push({ id: `a-${value}-${i}`, type: { kind: 'action', value } });
    }
  }

  return cards;
}

export function createShuffledFlip7Deck(): Flip7Card[] {
  return shuffleArray(createFlip7Deck());
}
