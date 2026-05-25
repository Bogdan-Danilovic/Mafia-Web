'use client';

import { GAMES } from '@/lib/games/registry';
import { GameCard } from './GameCard';

export function GameGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl mx-auto">
      {GAMES.map((game, i) => (
        <GameCard key={game.id} game={game} index={i} />
      ))}
    </div>
  );
}
