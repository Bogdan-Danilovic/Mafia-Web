import { CambioPlayer } from '@/lib/types/cambio';
import { getCardValue } from './constants';

export interface ScoreEntry {
  playerId: string;
  name: string;
  cardScore: number;
  penalties: number;
  total: number;
  isWinner: boolean;
  calledCambio: boolean;
}

export function computeScores(players: CambioPlayer[], cambioCalledBy: string | null): ScoreEntry[] {
  const entries: ScoreEntry[] = players.map(p => {
    const cardScore = p.cards.reduce((sum, c) => sum + getCardValue(c.rank, c.suit), 0);
    const total = cardScore + p.penaltyCount;
    return { playerId: p.id, name: p.name, cardScore, penalties: p.penaltyCount, total, isWinner: false, calledCambio: p.id === cambioCalledBy };
  });

  const minTotal = Math.min(...entries.map(e => e.total));
  const winners = entries.filter(e => e.total === minTotal);

  if (winners.length === 1) {
    winners[0].isWinner = true;
  } else {
    const nonCambio = winners.filter(e => !e.calledCambio);
    if (nonCambio.length === 1) {
      nonCambio[0].isWinner = true;
    } else {
      const candidates = nonCambio.length > 0 ? nonCambio : winners;
      const minCard = Math.min(...candidates.map(e => {
        const player = players.find(p => p.id === e.playerId)!;
        return Math.min(...player.cards.map(c => getCardValue(c.rank, c.suit)));
      }));
      const byMinCard = candidates.filter(e => {
        const player = players.find(p => p.id === e.playerId)!;
        return Math.min(...player.cards.map(c => getCardValue(c.rank, c.suit))) === minCard;
      });
      if (byMinCard.length > 0) byMinCard[0].isWinner = true;
    }
  }

  return entries.sort((a, b) => a.total - b.total);
}
