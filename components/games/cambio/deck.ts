import { CambioCard, CardRank, CardSuit } from '@/lib/types/cambio';
import { shuffleArray } from '@/lib/utils';

const SUITS: CardSuit[] = ['♠', '♥', '♦', '♣'];
const RANKS: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): CambioCard[] {
  const deck: CambioCard[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, knownBy: [] });
    }
  }

  deck.push({ rank: 'JOKER', suit: '', knownBy: [] });
  deck.push({ rank: 'JOKER', suit: '', knownBy: [] });

  return shuffleArray(deck);
}

export function dealCards(deck: CambioCard[], playerCount: number): { hands: CambioCard[][]; remaining: CambioCard[] } {
  const hands: CambioCard[][] = Array.from({ length: playerCount }, () => []);
  let idx = 0;

  for (let i = 0; i < 4; i++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p].push({ ...deck[idx++], knownBy: [] });
    }
  }

  return { hands, remaining: deck.slice(idx) };
}

export function reshuffleDiscardIntoDraw(discardPile: CambioCard[]): { newDrawPile: CambioCard[]; newDiscardPile: CambioCard[] } {
  if (discardPile.length <= 1) return { newDrawPile: [], newDiscardPile: discardPile };
  const top = discardPile[discardPile.length - 1];
  const toShuffle = discardPile.slice(0, discardPile.length - 1).map(c => ({ ...c, knownBy: [] }));
  return { newDrawPile: shuffleArray(toShuffle), newDiscardPile: [top] };
}
