import { CambioRoom, CambioCard } from '@/lib/types/cambio';
import { getCardValue, getCardPower } from './constants';

interface AiAction {
  type: 'cambio' | 'draw' | 'swap' | 'discard' | 'power_peek' | 'power_swap' | 'snap';
  cardIndex?: number;
  targetPlayerIndex?: number;
  targetCardIndex?: number;
}

function knownScore(player: { id: string; cards: CambioCard[] }): number {
  return player.cards
    .filter(c => c.knownBy.includes(player.id))
    .reduce((sum, c) => sum + getCardValue(c.rank, c.suit), 0);
}

function unknownCount(player: { id: string; cards: CambioCard[] }): number {
  return player.cards.filter(c => !c.knownBy.includes(player.id)).length;
}

function worstKnownCardIndex(playerId: string, cards: CambioCard[]): number {
  let worstIdx = -1;
  let worstVal = -Infinity;
  cards.forEach((c, i) => {
    if (c.knownBy.includes(playerId)) {
      const v = getCardValue(c.rank, c.suit);
      if (v > worstVal) { worstVal = v; worstIdx = i; }
    }
  });
  if (worstIdx === -1) {
    // fallback: pick first unknown
    return cards.findIndex(c => !c.knownBy.includes(playerId));
  }
  return worstIdx;
}

export function getAiAction(room: CambioRoom, playerId: string): AiAction | null {
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  const player = room.players[playerIndex];

  // Has drawn card → decide what to do with it
  if (room.drawnCard) {
    const drawn = room.drawnCard;
    const drawnValue = getCardValue(drawn.rank, drawn.suit);
    const worstIdx = worstKnownCardIndex(playerId, player.cards);
    const worstKnown = worstIdx >= 0 ? getCardValue(player.cards[worstIdx].rank, player.cards[worstIdx].suit) : 10;

    if (drawnValue < worstKnown || drawnValue <= 3) {
      return { type: 'swap', cardIndex: worstIdx >= 0 ? worstIdx : 0 };
    }

    const power = getCardPower(drawn.rank, drawn.suit);
    if (power) {
      return { type: 'discard' };
    }

    if (drawnValue > 7) {
      return { type: 'discard' };
    }

    return { type: 'swap', cardIndex: worstIdx >= 0 ? worstIdx : 0 };
  }

  // Active power step
  if (room.activePower?.sourcePlayerIndex === playerIndex) {
    const power = room.activePower;

    if (power.type === 'peek_own') {
      const unknownIdx = player.cards.findIndex(c => !c.knownBy.includes(playerId));
      return { type: 'power_peek', cardIndex: unknownIdx >= 0 ? unknownIdx : 0 };
    }

    if (power.type === 'peek_opponent') {
      const oppIdx = room.players.findIndex((p, i) => i !== playerIndex && p.id !== playerId);
      if (oppIdx >= 0) {
        const unknownCardIdx = room.players[oppIdx].cards.findIndex(c => !c.knownBy.includes(playerId));
        return { type: 'power_peek', targetPlayerIndex: oppIdx, targetCardIndex: unknownCardIdx >= 0 ? unknownCardIdx : 0 };
      }
    }

    if (power.type === 'blind_swap') {
      const myWorst = worstKnownCardIndex(playerId, player.cards);
      const oppIdx = room.players.findIndex((_, i) => i !== playerIndex);
      const oppCardIdx = oppIdx >= 0 ? 0 : 0;
      return { type: 'power_swap', cardIndex: myWorst >= 0 ? myWorst : 0, targetPlayerIndex: oppIdx, targetCardIndex: oppCardIdx };
    }

    if (power.type === 'peek_and_swap') {
      if (power.step === 'peek') {
        const oppIdx = room.players.findIndex((_, i) => i !== playerIndex);
        const oppCardIdx = 0;
        return { type: 'power_peek', targetPlayerIndex: oppIdx, targetCardIndex: oppCardIdx };
      }
      if (power.step === 'swap') {
        const myWorst = worstKnownCardIndex(playerId, player.cards);
        return { type: 'power_swap', cardIndex: myWorst >= 0 ? myWorst : 0, targetPlayerIndex: power.targetPlayerIndex ?? 0, targetCardIndex: power.targetCardIndex ?? 0 };
      }
    }
  }

  // Decide whether to call Cambio
  const known = knownScore(player);
  const unknowns = unknownCount(player);

  if (unknowns === 0 && known <= 6) {
    return { type: 'cambio' };
  }

  if (unknowns <= 1 && known + 3 <= 6 && room.roundNumber > 4) {
    return { type: 'cambio' };
  }

  return { type: 'draw' };
}
