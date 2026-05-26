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
  a: {
    text: 'text-cyan-400',
    glow: 'rgba(8,145,178,0.6)',
    stroke: '#0891b2',
    shimmer: 'linear-gradient(90deg, #e0f2fe 0%, #67e8f9 30%, #ffffff 55%, #a5f3fc 80%, #e0f2fe 100%)',
    cardBorder: 'rgba(8,145,178,0.25)',
    cardGlow: '0 0 40px rgba(8,145,178,0.12), 0 8px 32px rgba(0,0,0,0.5)',
    orb: 'rgba(8,145,178,0.08)',
  },
  b: {
    text: 'text-amber-400',
    glow: 'rgba(245,158,11,0.6)',
    stroke: '#f59e0b',
    shimmer: 'linear-gradient(90deg, #fef3c7 0%, #fcd34d 30%, #ffffff 55%, #fde68a 80%, #fef3c7 100%)',
    cardBorder: 'rgba(245,158,11,0.25)',
    cardGlow: '0 0 40px rgba(245,158,11,0.12), 0 8px 32px rgba(0,0,0,0.5)',
    orb: 'rgba(245,158,11,0.08)',
  },
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
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const urgent = timeLeft <= 10;

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
    <div
      className="relative flex flex-col items-center justify-center flex-1 px-5 h-screen-safe overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 z-40 pointer-events-none ${flash === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
          />
        )}
      </AnimatePresence>

      {/* Background orb */}
      <div
        className="pointer-events-none fixed rounded-full"
        style={{
          width: 500, height: 500,
          top: '-20%', left: '50%', transform: 'translateX(-50%)',
          background: `radial-gradient(circle, ${colors.orb}, transparent 70%)`,
          filter: 'blur(70px)',
        }}
      />

      <div className="relative w-full max-w-[340px] flex flex-col items-center gap-7">

        {/* Timer + score row */}
        <div className="w-full flex items-center justify-between">
          {/* SVG stroke-dashoffset timer */}
          <div className="relative">
            <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
              <circle cx="72" cy="72" r={radius} fill="none" stroke="white" strokeOpacity="0.04" strokeWidth="5" />
              {urgent && (
                <circle cx="72" cy="72" r={radius} fill="none"
                  stroke="#ef4444" strokeOpacity="0.12" strokeWidth="16" />
              )}
              <motion.circle
                cx="72" cy="72" r={radius} fill="none"
                stroke={urgent ? '#ef4444' : colors.stroke}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.3, ease: 'linear' }}
                style={{ filter: `drop-shadow(0 0 6px ${urgent ? '#ef4444' : colors.stroke})` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                className={`text-[42px] font-bold tabular-nums ${urgent ? 'text-red-400' : 'text-white'}`}
                animate={urgent ? { scale: [1, 1.12, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.5 }}
                style={urgent ? { textShadow: '0 0 20px rgba(239,68,68,0.7)' } : {}}
              >
                {timeLeft}
              </motion.span>
            </div>
          </div>

          {/* Score + round delta */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p
                className={`text-[40px] font-bold tabular-nums leading-none ${colors.text}`}
                style={{ textShadow: `0 0 20px ${colors.glow}` }}
              >
                {room.scores[team]}
              </p>
              <p className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">poena ukupno</p>
            </div>
            <div
              className="px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
            >
              runda:{' '}
              <span className={`font-bold ${roundScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {roundScore >= 0 ? '+' : ''}{roundScore}
              </span>
            </div>
          </div>
        </div>

        {/* Word card */}
        {isExplainer ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${room.currentWord}-${wordKey}`}
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="w-full min-h-[140px] rounded-3xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))',
                border: `1px solid ${colors.cardBorder}`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: colors.cardGlow,
              }}
            >
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'linear', repeatDelay: 1.5 }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
              />
              <motion.h2
                className="text-[42px] font-bold text-center px-6 leading-tight relative z-10"
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                style={{
                  background: colors.shimmer,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  backgroundSize: '200% auto',
                }}
              >
                {room.currentWord}
              </motion.h2>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div
            className="w-full min-h-[140px] rounded-3xl flex flex-col items-center justify-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <motion.p
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[14px] text-slate-400"
            >
              {explainer?.name} objašnjava...
            </motion.p>
            <p className="text-[11px] text-slate-600">Pogađaj riječ!</p>
          </div>
        )}

        {/* Action buttons */}
        {isExplainer && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-3 w-full"
          >
            <button
              onClick={handleWrong}
              className="flex-1 py-5 rounded-2xl text-[22px] font-bold active:scale-95 transition-all duration-150 cursor-pointer"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
              }}
            >
              ✕
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 py-5 rounded-2xl text-[13px] font-medium active:scale-95 transition-all duration-150 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#475569',
              }}
            >
              Preskoči
            </button>
            <button
              onClick={handleCorrect}
              className="flex-1 py-5 rounded-2xl text-[22px] font-bold active:scale-95 transition-all duration-150 cursor-pointer"
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                color: '#34d399',
              }}
            >
              ✓
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
