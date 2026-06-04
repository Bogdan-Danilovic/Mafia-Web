'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { RotateCcw, Home } from 'lucide-react';
import { SpicyPlayer } from '@/lib/games/spicy/types';
import { buildScoreboard } from '@/lib/games/spicy/scoring';
import { SpicyAction } from '@/lib/games/spicy/gameEngine';
import { Button } from '@/components/ui/Button';

interface Props { players: SpicyPlayer[]; winner: SpicyPlayer | null; dispatch: (a: SpicyAction) => void; }

export function SpicyScoreBoard({ players, winner, dispatch }: Props) {
  const router = useRouter();
  const scores = buildScoreboard(players);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6 text-center">
          <div className="mb-3 text-5xl">🌶️</div>
          <div className="text-2xl font-black text-white">Kraj igre!</div>
          {winner && <div className="mt-2 text-sm font-semibold text-yellow-400">🏆 Pobednik: {winner.name}</div>}
        </motion.div>
        <div className="mb-6 space-y-2">
          {scores.map((s, i) => (
            <motion.div key={s.player.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ background: i === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
              <span className="w-6 text-center text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{s.player.name}</div>
                <div className="flex gap-3 text-xs text-white/50 mt-0.5">
                  <span>🏆×{s.player.trophies}</span>
                  <span>🃏×{s.player.wonCards.length}</span>
                  <span className="text-red-400">✋−{s.player.hand.length}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-white">{s.score}</div>
                <div className="text-[10px] text-white/40">bodova</div>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="mb-6 text-center text-xs text-white/30">Bodovi = (trofej×10) + osvajane − karte u ruci</p>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3">
          <Button variant="secondary" className="flex-1 gap-2" onClick={() => router.push('/')}>
            <Home size={16} /> Početak
          </Button>
          <Button className="flex-1 gap-2" onClick={() => dispatch({ type: 'RESTART' })}
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}>
            <RotateCcw size={16} /> Ponovo
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
