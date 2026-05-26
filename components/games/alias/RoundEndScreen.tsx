'use client';

import { motion } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { advanceToScoreboard } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

const TEAM_COLORS = {
  a: { text: 'text-cyan-400', label: 'Tim A', glow: 'rgba(8,145,178,0.5)' },
  b: { text: 'text-amber-400', label: 'Tim B', glow: 'rgba(245,158,11,0.5)' },
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
    <div
      className="relative flex flex-col items-center flex-1 px-5 py-10 h-screen-safe overflow-y-auto"
      style={{ background: 'var(--bg-base)' }}
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-[340px] flex flex-col gap-6"
      >
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-[10px] text-slate-500 tracking-[0.25em] uppercase mb-2">Runda {room.round} završena</p>
          <h2 className={`text-[28px] font-bold ${colors.text}`} style={{ textShadow: `0 0 20px ${colors.glow}` }}>
            {colors.label}
          </h2>
          <p className="text-[14px] text-slate-400 mt-2">
            Rezultat runde:{' '}
            <span className={`font-bold ${roundScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {roundScore >= 0 ? '+' : ''}{roundScore}
            </span>
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={fadeUp} className="flex gap-2 w-full">
          {[
            { v: correct.length, l: 'Tačno', c: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
            { v: wrong.length, l: 'Greška', c: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
            { v: skipped.length, l: 'Preskočeno', c: '#64748b', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
          ].map((s, i) => (
            <div
              key={i}
              className="flex-1 text-center py-3 rounded-xl"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <p className="text-[18px] font-bold tabular-nums" style={{ color: s.c }}>{s.v}</p>
              <p className="text-[8px] uppercase tracking-[0.15em] mt-0.5 text-slate-500">{s.l}</p>
            </div>
          ))}
        </motion.div>

        {/* Word list */}
        <motion.div variants={fadeUp}>
          <p className="text-[9px] text-slate-500 tracking-[0.25em] uppercase mb-3">Riječi</p>
          <div
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {room.roundResults.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: i < room.roundResults.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <span className="text-[13px] text-slate-300">{r.word}</span>
                <span
                  className="text-[11px] font-bold"
                  style={{
                    color: r.result === 'correct' ? '#34d399' : r.result === 'wrong' ? '#f87171' : '#475569',
                  }}
                >
                  {r.result === 'correct' ? '✓' : r.result === 'wrong' ? '✕' : '→'}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-2">
          {isHost ? (
            <button
              onClick={() => advanceToScoreboard(room.code)}
              className="w-full py-3.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                border: '1px solid rgba(8,145,178,0.5)',
                boxShadow: '0 0 20px rgba(8,145,178,0.3)',
              }}
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
