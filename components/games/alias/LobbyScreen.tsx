'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { updateSettings, kickPlayer, startGame } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

const DURATION_OPTIONS: Array<30 | 60 | 90> = [30, 60, 90];

function DecryptCode({ code }: { code: string }) {
  const [revealed, setRevealed] = useState(0);
  const chars = 'ABCDEFGHKLMNPQRSTUVWXYZ23456789';

  useEffect(() => {
    if (revealed >= code.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 120);
    return () => clearTimeout(t);
  }, [revealed, code.length]);

  return (
    <span className="inline-flex tracking-[0.4em]">
      {code.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={i < revealed ? 'text-cyan-400' : 'text-slate-600'}
        >
          {i < revealed ? char : chars[Math.floor(Math.random() * chars.length)]}
        </motion.span>
      ))}
    </span>
  );
}

export function LobbyScreen({ room, playerId }: Props) {
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isHost = room.hostId === playerId;
  const playerCount = room.players.length;
  const canStart = playerCount >= 4;

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { startGame(room.code); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, room.code]);

  const handleStart = useCallback(() => {
    setStarting(true);
    setCountdown(3);
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative flex flex-col flex-1 px-8 py-10 h-screen-safe overflow-y-auto">
      <div className="breathing-orb w-[250px] h-[250px] bg-cyan-500/10 top-[-60px] right-[-40px]" />

      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-8 flex-1">
        {/* Room code */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-3">Pristupni kod</p>
          <button onClick={copyCode} className="block">
            <span className="text-[36px] font-bold" style={{ textShadow: '0 0 20px rgba(8,145,178,0.5)' }}>
              <DecryptCode code={room.code} />
            </span>
          </button>
          <p className="text-[10px] mt-2 h-4">
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="c" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-400">Kopirano</motion.span>
              ) : (
                <motion.span key="h" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="text-slate-500">tapni da kopiraš</motion.span>
              )}
            </AnimatePresence>
          </p>
        </motion.div>

        {/* Players */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Igrači · {playerCount}</p>
            {playerCount < 4 && (
              <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[10px] text-amber-400/70">
                čekamo još {4 - playerCount}
              </motion.p>
            )}
          </div>

          <div className="w-full h-px bg-white/[0.04] mb-5 relative">
            <motion.div
              className={`absolute top-0 left-0 h-px ${canStart ? 'bg-emerald-500/50' : 'bg-amber-500/40'}`}
              animate={{ width: `${Math.min((playerCount / 4) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <AnimatePresence mode="popLayout">
              {room.players.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between py-2.5 px-1"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${p.isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span className="text-[13px] text-slate-300 font-medium">
                      {p.name}
                      {p.id === room.hostId && <span className="text-[8px] text-cyan-500 ml-2 uppercase tracking-wider">host</span>}
                      {p.id === playerId && <span className="text-[8px] text-slate-600 ml-2 uppercase tracking-wider">ti</span>}
                    </span>
                  </div>
                  {isHost && p.id !== playerId && room.status === 'lobby' && (
                    <button onClick={() => kickPlayer(room.code, p.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">✕</button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Settings */}
        {isHost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col gap-6">
            <div>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-3">Trajanje runde</p>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => updateSettings(room.code, { roundDuration: d })}
                    className={`flex-1 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                      room.settings.roundDuration === d
                        ? 'bg-cyan-600/80 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]'
                        : 'bg-white/[0.02] text-slate-500 hover:text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {!isHost && (
          <motion.p
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-[12px] text-slate-600 text-center py-6"
          >
            Čekamo da host započne igru...
          </motion.p>
        )}

        {/* Start */}
        <div className="mt-auto pt-6">
          {isHost && (
            <button
              disabled={!canStart || starting}
              onClick={handleStart}
              className="w-full py-3.5 rounded-lg text-[13px] font-semibold bg-cyan-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-500 transition-colors shadow-[0_0_20px_rgba(8,145,178,0.3)]"
            >
              {starting ? 'Pokretanje...' : canStart ? 'Započni igru' : `Još ${4 - playerCount} igrača`}
            </button>
          )}
        </div>
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080b14]/95"
          >
            <motion.span
              key={countdown}
              initial={{ scale: 4, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-[140px] font-bold text-cyan-400 leading-none tabular-nums"
              style={{ textShadow: '0 0 40px rgba(8,145,178,0.6)' }}
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
