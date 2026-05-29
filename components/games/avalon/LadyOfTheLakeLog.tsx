'use client';

import { motion } from 'framer-motion';
import { AvalonRoom } from '@/lib/types/avalon';

interface Props {
  room: AvalonRoom;
}

export function LadyOfTheLakeLog({ room }: Props) {
  const history = room.lady?.history ?? [];
  if (history.length === 0) return null;

  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? '?';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full flex flex-col gap-2"
    >
      <p className="text-[10px] text-cyan-400/60 tracking-[0.2em] uppercase">Gospa — izjave</p>
      {history.map((e, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-cyan-500/[0.05]"
        >
          <span className="text-[12px] text-slate-400">
            {name(e.usedBy)} <span className="text-slate-600">→</span> {name(e.investigatedPlayer)}
          </span>
          <span
            className={`text-[12px] font-bold ${
              e.declaredAlignment === 'good' ? 'text-blue-400' : 'text-red-400'
            }`}
          >
            {e.declaredAlignment === 'good' ? 'Dobar' : 'Loš'}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
