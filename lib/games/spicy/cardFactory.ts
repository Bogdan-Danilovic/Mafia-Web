import { SpicyCard, Spice } from '@/lib/games/spicy/types';
import { shuffleArray, generatePlayerId } from '@/lib/utils';

const DOSTA_POSITION: Record<number, number> = { 2: 20, 3: 24, 4: 28, 5: 32, 6: 36 };

function createSpicyCards(): SpicyCard[] {
  const spices: Spice[] = ['chili', 'wasabi', 'pepper'];
  const cards: SpicyCard[] = [];
  for (const spice of spices) {
    for (let value = 1; value <= 10; value++) {
      for (let copy = 0; copy < 3; copy++) {
        cards.push({ id: generatePlayerId(), type: 'spicy', spice, value });
      }
    }
  }
  cards.push({ id: generatePlayerId(), type: 'spicy', spice: 'chili', value: 5 });
  cards.push({ id: generatePlayerId(), type: 'spicy', spice: 'wasabi', value: 5 });
  return cards;
}

function createJokers(): SpicyCard[] {
  return [
    ...Array.from({ length: 3 }, () => ({ id: generatePlayerId(), type: 'joker_spice' as const })),
    ...Array.from({ length: 5 }, () => ({ id: generatePlayerId(), type: 'joker_number' as const })),
  ];
}

export function createAndDeal(playerCount: number): { hands: SpicyCard[][]; drawPile: SpicyCard[] } {
  const allCards = shuffleArray([...createSpicyCards(), ...createJokers()]);
  const hands: SpicyCard[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < 6 * playerCount; i++) hands[i % playerCount].push(allCards[i]);
  const remaining = allCards.slice(6 * playerCount);
  const enoughCard: SpicyCard = { id: generatePlayerId(), type: 'enough' };
  const pos = Math.min(DOSTA_POSITION[playerCount] ?? 25, remaining.length);
  return { hands, drawPile: [...remaining.slice(0, pos), enoughCard, ...remaining.slice(pos)] };
}
