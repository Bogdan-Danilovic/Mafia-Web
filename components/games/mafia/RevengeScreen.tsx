'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MafiaRoom } from '@/lib/types/mafia';
import { submitRevenge, skipRevenge } from '@/lib/firestore/mafia';
import { Button } from '@/components/ui/Button';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

export function RevengeScreen({ room, playerId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  const eliminatedId = room.eliminatedThisRound;
  const isAvenger = eliminatedId === playerId;
  const alivePlayers = Object.values(room.players).filter((p) => p.isAlive);

  // Timer — auto-skip
  useEffect(() => {
    if (confirmed || !isAvenger) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          skipRevenge(room.code);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [confirmed, isAvenger, room.code]);

  async function handleRevenge() {
    if (!selected || confirmed || !isAvenger) return;
    setConfirmed(true);
    await submitRevenge(room.code, selected);
  }

  async function handleSkip() {
    if (confirmed || !isAvenger) return;
    setConfirmed(true);
    await skipRevenge(room.code);
  }

  // ─── Non-avenger view ─────────────────────────────────────────────────────
  if (!isAvenger) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-8 h-screen-safe"
        style={{ background: '#0f1320' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="text-5xl mb-6"
          >
            ⚔️
          </motion.div>
          <p className="text-[15px] text-slate-400 mb-2">Osvetnik se osvećuje...</p>
          <p className="text-[11px] text-slate-700">
            {eliminatedId ? `${room.players[eliminatedId]?.name ?? 'Osvetnik'} bira posljednju žrtvu` : ''}
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Avenger view ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 px-5 py-10 h-screen-safe overflow-y-auto"
      style={{ background: '#0f1320' }}>
      <div className="w-full max-w-[360px] mx-auto flex flex-col gap-6 flex-1">

        {/* Header */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 22 }}
          className="text-center"
        >
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="text-[26px] font-bold text-white tracking-[-0.03em]">Osveta</h2>
          <p className="text-[12px] text-slate-500 mt-2">Lynchovan si — ali možeš odvesti jednog sa sobom</p>
        </motion.div>

        {/* Timer ring */}
        <div className="flex justify-center">
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(249,115,22,0.1)" strokeWidth="2" />
              <motion.circle
                cx="28" cy="28" r="24" fill="none"
                stroke="rgba(249,115,22,0.7)"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeLinecap="round"
                animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - timeLeft / 15) }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[13px] font-bold text-orange-400 tabular-nums">{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Player list */}
        <AnimatePresence mode="wait">
          {!confirmed ? (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-2">
              {alivePlayers.map((p, i) => {
                const isSelected = selected === p.id;
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(p.id)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left cursor-pointer transition-all duration-200"
                    style={{
                      background: isSelected ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: isSelected ? '#f97316' : '#475569' }} />
                    <span className="text-[13px] font-medium"
                      style={{ color: isSelected ? '#fdba74' : '#94a3b8' }}>
                      {p.name}
                    </span>
                    {isSelected && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="ml-auto text-[10px] text-orange-400">⚔️</motion.span>
                    )}
                  </motion.button>
                );
              })}

              <div className="h-px bg-white/[0.03] my-1" />

              <Button
                fullWidth
                disabled={!selected}
                onClick={handleRevenge}
                className="!rounded-2xl !text-white"
                style={{
                  background: selected ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : undefined,
                  boxShadow: selected ? '0 4px 16px rgba(220,38,38,0.4)' : undefined,
                }}
              >
                Potvrdi osvetu
              </Button>

              <button
                onClick={handleSkip}
                className="py-2.5 text-[11px] text-slate-700 hover:text-slate-500 transition-colors cursor-pointer"
              >
                Oprosti svima — ne ubijam nikoga
              </button>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="text-3xl mb-2">⚔️</div>
              <p className="text-[13px] text-slate-400">Osveta izvršena</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
