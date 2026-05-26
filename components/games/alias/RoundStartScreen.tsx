'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { advanceToExplaining } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

const TEAM_COLORS = {
  a: { bg: 'bg-cyan-500', text: 'text-cyan-400', label: 'Tim A', glow: 'rgba(8,145,178,0.5)' },
  b: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Tim B', glow: 'rgba(245,158,11,0.5)' },
};

export function RoundStartScreen({ room, playerId }: Props) {
  const [countdown, setCountdown] = useState(3);

  const team = room.currentTeam;
  const colors = TEAM_COLORS[team];
  const teamPlayerIds = room.teams[team];
  const explainerIndex = room.currentExplainerIndex[team];
  const explainerId = teamPlayerIds[explainerIndex];
  const explainer = room.players.find((p) => p.id === explainerId);
  const isExplainer = playerId === explainerId;

  useEffect(() => {
    if (countdown <= 0) {
      if (isExplainer) advanceToExplaining(room.code);
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, room.code, isExplainer]);

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      <div className={`breathing-orb w-[300px] h-[300px] ${team === 'a' ? 'bg-cyan-500/10' : 'bg-amber-500/10'} top-[20%] left-[50%] -translate-x-1/2`} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-[320px] flex flex-col items-center gap-8 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <p className="text-[10px] text-slate-500 tracking-[0.25em] uppercase mb-2">Runda {room.round}</p>
          <h2 className={`text-[32px] font-bold ${colors.text}`} style={{ textShadow: `0 0 20px ${colors.glow}` }}>
            {colors.label}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-2"
        >
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Objašnjava</p>
          <p className="text-[20px] font-bold text-white">
            {isExplainer ? 'Ti!' : explainer?.name ?? '...'}
          </p>
          {isExplainer && (
            <p className="text-[11px] text-slate-500 mt-1">Pripremi se za objašnjavanje</p>
          )}
        </motion.div>

        {/* Scoreboard mini */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-6"
        >
          <div className="text-center">
            <p className="text-[24px] font-bold text-cyan-400 tabular-nums">{room.scores.a}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">Tim A</p>
          </div>
          <div className="text-[24px] text-slate-600 font-light">:</div>
          <div className="text-center">
            <p className="text-[24px] font-bold text-amber-400 tabular-nums">{room.scores.b}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">Tim B</p>
          </div>
        </motion.div>

        {/* Countdown */}
        <AnimatePresence mode="wait">
          {countdown > 0 && (
            <motion.span
              key={countdown}
              initial={{ scale: 3, opacity: 0, filter: 'blur(8px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={`text-[80px] font-bold ${colors.text} leading-none tabular-nums mt-4`}
              style={{ textShadow: `0 0 30px ${colors.glow}` }}
            >
              {countdown}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
