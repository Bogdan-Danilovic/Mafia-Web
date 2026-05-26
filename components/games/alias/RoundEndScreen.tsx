'use client';

import { motion } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { advanceToScoreboard } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

const TEAM_COLORS = {
  a: { text: 'text-cyan-400', label: 'Tim A' },
  b: { text: 'text-amber-400', label: 'Tim B' },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

export function RoundEndScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const team = room.currentTeam;
  const colors = TEAM_COLORS[team];

  const correct = room.roundResults.filter((r) => r.result === 'correct');
  const wrong = room.roundResults.filter((r) => r.result === 'wrong');
  const skipped = room.roundResults.filter((r) => r.result === 'skipped');
  const roundScore = correct.length - wrong.length;

  return (
    <div className="relative flex flex-col items-center flex-1 px-8 py-10 h-screen-safe overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-[340px] flex flex-col gap-6"
      >
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-[10px] text-slate-500 tracking-[0.25em] uppercase mb-2">Runda {room.round} završena</p>
          <h2 className={`text-[28px] font-bold ${colors.text}`}>{colors.label}</h2>
          <p className="text-[14px] text-slate-400 mt-2">
            Rezultat runde: <span className={`font-bold ${roundScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{roundScore >= 0 ? '+' : ''}{roundScore}</span>
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="flex gap-px w-full overflow-hidden rounded-lg">
          {[
            { v: correct.length, l: 'tačno', c: 'text-emerald-400' },
            { v: wrong.length, l: 'greška', c: 'text-red-400' },
            { v: skipped.length, l: 'preskočeno', c: 'text-slate-400' },
          ].map((s, i) => (
            <div key={i} className="flex-1 text-center py-3 bg-white/[0.02]">
              <p className={`text-[16px] font-bold tabular-nums ${s.c}`}>{s.v}</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-[0.15em] mt-0.5">{s.l}</p>
            </div>
          ))}
        </motion.div>

        {/* Word list */}
        <motion.div variants={fadeUp}>
          <p className="text-[9px] text-slate-500 tracking-[0.25em] uppercase mb-3">Riječi</p>
          <div className="flex flex-col gap-0.5">
            {room.roundResults.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className="flex items-center justify-between py-2 px-1"
              >
                <span className="text-[13px] text-slate-300">{r.word}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  r.result === 'correct' ? 'text-emerald-400' :
                  r.result === 'wrong' ? 'text-red-400' : 'text-slate-600'
                }`}>
                  {r.result === 'correct' ? '✓' : r.result === 'wrong' ? '✗' : '→'}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Continue */}
        <motion.div variants={fadeUp} className="mt-4">
          {isHost ? (
            <button
              onClick={() => advanceToScoreboard(room.code)}
              className="w-full py-3.5 rounded-lg text-[13px] font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-[0_0_20px_rgba(8,145,178,0.3)]"
            >
              Rezultati
            </button>
          ) : (
            <p className="text-[11px] text-slate-500 text-center py-2">Čekamo host-a...</p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
