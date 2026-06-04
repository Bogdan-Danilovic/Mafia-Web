import { SpicyPlayer } from '@/lib/games/spicy/types';

export function calculateScore(p: SpicyPlayer): number {
  return p.trophies * 10 + p.wonCards.length - p.hand.length;
}

export function determineWinner(players: SpicyPlayer[]): SpicyPlayer {
  return players.reduce((best, p) => calculateScore(p) > calculateScore(best) ? p : best);
}

export interface SpicyPlayerScore { player: SpicyPlayer; score: number; rank: number; }

export function buildScoreboard(players: SpicyPlayer[]): SpicyPlayerScore[] {
  const scored = players.map((p) => ({ player: p, score: calculateScore(p), rank: 0 }));
  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => { s.rank = i + 1; });
  return scored;
}
