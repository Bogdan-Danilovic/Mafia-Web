'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvalonRoom, AvalonSettings } from '@/lib/types/avalon';
import { Button } from '@/components/ui/Button';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { updateRoomSettings, kickPlayer, startGame } from '@/lib/firestore/avalon';

interface Props {
  room: AvalonRoom;
  playerId: string;
}

const ROLE_TOGGLES: { key: keyof Pick<AvalonSettings, 'enablePercival' | 'enableMordred' | 'enableMorgana' | 'enableOberon'>; label: string; loyalty: 'good' | 'evil'; desc: string }[] = [
  { key: 'enablePercival', label: 'Percival', loyalty: 'good', desc: 'Vidi Merlina' },
  { key: 'enableMordred', label: 'Mordred', loyalty: 'evil', desc: 'Skriven od Merlina' },
  { key: 'enableMorgana', label: 'Morgana', loyalty: 'evil', desc: 'Izgleda kao Merlin' },
  { key: 'enableOberon', label: 'Oberon', loyalty: 'evil', desc: 'Ne zna ko su Zli' },
];

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
          className={i < revealed ? 'text-amber-400' : 'text-slate-600'}
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
  const canStart = playerCount >= 5;

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

  function toggleRole(key: keyof AvalonSettings) {
    updateRoomSettings(room.code, {
      settings: { [key]: !room.settings[key] },
    });
  }

  return (
    <div className="relative flex flex-col flex-1 px-8 py-10 h-screen-safe overflow-y-auto">
      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-8 flex-1">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-3">
            Pristupni kod
          </p>
          <button onClick={copyCode} className="block">
            <span className="text-[36px] font-bold" style={{ textShadow: '0 0 20px rgba(217,119,6,0.4)' }}>
              <DecryptCode code={room.code} />
            </span>
          </button>
          <p className="text-[10px] mt-2 h-4">
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="c" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-400">
                  Kopirano
                </motion.span>
              ) : (
                <motion.span key="h" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="text-slate-500">
                  tapni da kopiraš
                </motion.span>
              )}
            </AnimatePresence>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">
              Vitezovi · {playerCount}
            </p>
            {playerCount < 5 && (
              <motion.p
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[10px] text-amber-400/70"
              >
                čekamo još {5 - playerCount}
              </motion.p>
            )}
          </div>

          <div className="w-full h-px bg-white/[0.04] mb-5 relative">
            <motion.div
              className={`absolute top-0 left-0 h-px ${canStart ? 'bg-emerald-500/50' : 'bg-amber-500/40'}`}
              animate={{ width: `${Math.min((playerCount / 5) * 100, 100)}%` }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <AnimatePresence mode="popLayout">
              {room.players.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isHost={p.id === room.hostId}
                  isSelf={p.id === playerId}
                  canKick={isHost && room.status === 'lobby'}
                  onKick={() => kickPlayer(room.code, p.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col gap-4"
          >
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">
              Opcione uloge
            </p>
            <div className="flex flex-col gap-2">
              {ROLE_TOGGLES.map(({ key, label, loyalty, desc }) => (
                <button
                  key={key}
                  onClick={() => toggleRole(key)}
                  className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${loyalty === 'good' ? 'bg-blue-400' : 'bg-red-400'}`} />
                    <div className="text-left">
                      <span className="text-[13px] text-slate-300 font-medium">{label}</span>
                      <p className="text-[10px] text-slate-600">{desc}</p>
                    </div>
                  </div>
                  <div className={`w-8 h-[18px] rounded-full transition-colors duration-200 relative ${room.settings[key] ? 'bg-amber-600' : 'bg-white/[0.06]'}`}>
                    <div className={`absolute top-[3px] w-3 h-3 rounded-full bg-white transition-transform duration-200 ${room.settings[key] ? 'translate-x-[14px]' : 'translate-x-[3px]'}`} />
                  </div>
                </button>
              ))}
            </div>

            <div className="w-full h-px bg-white/[0.04]" />

            <button
              onClick={() => toggleRole('enableLady')}
              className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <div className="text-left">
                  <span className="text-[13px] text-slate-300 font-medium">Gospa od Jezera</span>
                  <p className="text-[10px] text-slate-600">Istraži lojalnost između rundi</p>
                </div>
              </div>
              <div className={`w-8 h-[18px] rounded-full transition-colors duration-200 relative ${room.settings.enableLady ? 'bg-cyan-600' : 'bg-white/[0.06]'}`}>
                <div className={`absolute top-[3px] w-3 h-3 rounded-full bg-white transition-transform duration-200 ${room.settings.enableLady ? 'translate-x-[14px]' : 'translate-x-[3px]'}`} />
              </div>
            </button>
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

        <div className="mt-auto pt-6">
          {isHost && (
            <Button
              fullWidth
              disabled={!canStart || starting}
              onClick={handleStart}
              className="!bg-amber-600 hover:!bg-amber-500 active:!bg-amber-700"
            >
              {starting ? 'Pokretanje...' : canStart ? 'Započni igru' : `Još ${5 - playerCount} vitezova`}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-void/95"
          >
            <motion.span
              key={countdown}
              initial={{ scale: 4, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 200, damping: 15 }}
              className="text-[140px] font-bold text-amber-400 leading-none tabular-nums"
              style={{ textShadow: '0 0 40px rgba(217,119,6,0.5)' }}
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
