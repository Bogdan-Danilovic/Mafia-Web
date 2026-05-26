'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { scoreWord, skipWord, endRound } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

const TEAM_COLORS = {
  a: { text: 'text-cyan-400', glow: 'rgba(8,145,178,0.5)', stroke: '#0891b2' },
  b: { text: 'text-amber-400', glow: 'rgba(245,158,11,0.5)', stroke: '#f59e0b' },
};

export function ExplainingScreen({ room, playerId }: Props) {
  const [timeLeft, setTimeLeft] = useState<number>(room.settings.roundDuration);
  const [wordKey, setWordKey] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);

  const team = room.currentTeam;
  const colors = TEAM_COLORS[team];
  const explainerId = room.teams[team][room.currentExplainerIndex[team]];
  const isExplainer = playerId === explainerId;
  const explainer = room.players.find((p) => p.id === explainerId);

  const duration = room.settings.roundDuration;
  const progress = timeLeft / duration;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    if (!room.roundEndTime) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((room.roundEndTime! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (isExplainer) endRound(room.code);
        return;
      }
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [room.roundEndTime, room.code, isExplainer]);

  const handleCorrect = useCallback(() => {
    if (!isExplainer) return;
    setFlash('correct');
    setWordKey((k) => k + 1);
    scoreWord(room.code, 'correct');
    setTimeout(() => setFlash(null), 300);
  }, [isExplainer, room.code]);

  const handleWrong = useCallback(() => {
    if (!isExplainer) return;
    setFlash('wrong');
    setWordKey((k) => k + 1);
    scoreWord(room.code, 'wrong');
    setTimeout(() => setFlash(null), 300);
  }, [isExplainer, room.code]);

  const handleSkip = useCallback(() => {
    if (!isExplainer) return;
    setWordKey((k) => k + 1);
    skipWord(room.code);
  }, [isExplainer, room.code]);

  const roundScore = room.roundResults.reduce((sum, r) => {
    if (r.result === 'correct') return sum + 1;
    if (r.result === 'wrong') return sum - 1;
    return sum;
  }, 0);

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 z-40 ${flash === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
          />
        )}
      </AnimatePresence>

      {/* Score badge */}
      <div className="absolute top-6 right-6 z-10">
        <p className={`text-[28px] font-bold ${colors.text} tabular-nums`} style={{ textShadow: `0 0 15px ${colors.glow}` }}>
          {room.scores[team]}
        </p>
        <p className="text-[8px] text-slate-500 uppercase tracking-wider text-center">poena</p>
      </div>

      <div className="relative w-full max-w-[320px] flex flex-col items-center gap-8">
        {/* Circular timer */}
        <div className="relative">
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="white" strokeOpacity="0.04" strokeWidth="4" />
            <motion.circle
              cx="64" cy="64" r={radius} fill="none"
              stroke={timeLeft <= 10 ? '#ef4444' : colors.stroke}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className={`text-[36px] font-bold tabular-nums ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}
              animate={timeLeft <= 5 ? { scale: [1, 1.15, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              {timeLeft}
            </motion.span>
          </div>
        </div>

        {/* Current word */}
        {isExplainer ? (
          <div className="text-center min-h-[80px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.h2
                key={`${room.currentWord}-${wordKey}`}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-[32px] font-bold text-white leading-tight"
              >
                {room.currentWord}
              </motion.h2>
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center min-h-[80px] flex flex-col items-center justify-center gap-2">
            <p className="text-[14px] text-slate-400">
              {explainer?.name} obja&#353;njava...
            </p>
            <p className="text-[11px] text-slate-600">Poga&#273;aj rije&#269;!</p>
          </div>
        )}

        {/* Round score */}
        <p className="text-[12px] text-slate-500">
          Ova runda: <span className={`font-bold ${roundScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{roundScore >= 0 ? '+' : ''}{roundScore}</span>
        </p>

        {/* Action buttons */}
        {isExplainer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-3 w-full"
          >
            <button
              onClick={handleWrong}
              className="flex-1 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[18px] font-bold hover:bg-red-500/20 active:scale-95 transition-all"
            >
              &#10007;
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-500 text-[14px] font-medium hover:bg-white/[0.06] active:scale-95 transition-all"
            >
              Presko&#269;i
            </button>
            <button
              onClick={handleCorrect}
              className="flex-1 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[18px] font-bold hover:bg-emerald-500/20 active:scale-95 transition-all"
            >
              &#10003;
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
