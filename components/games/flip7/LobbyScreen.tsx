'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Flip7Room } from '@/lib/types/flip7';
import { Button } from '@/components/ui/Button';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { updateSettings, kickPlayer, startGame, leaveRoom } from '@/lib/firestore/flip7';

interface Props {
  room: Flip7Room;
  playerId: string;
}

const MIN_PLAYERS = 3;
const TARGET_OPTIONS = [100, 150, 200, 250];

export function LobbyScreen({ room, playerId }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isHost = room.hostId === playerId;
  const playerCount = room.players.length;
  const canStart = playerCount >= MIN_PLAYERS;
  const targetScore = room.settings.targetScore;

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      startGame(room.code);
      return;
    }
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

  async function handleLeave() {
    await leaveRoom(room.code, playerId);
    router.push('/');
  }

  return (
    <div className="relative flex flex-col flex-1 px-6 pt-20 pb-10 h-screen-safe overflow-y-auto">
      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-7 flex-1">
        {/* Access code */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-[10px] text-amber-200/40 tracking-[0.2em] uppercase mb-3">Pristupni kod</p>
          <button onClick={copyCode} className="block">
            <span
              className="text-[40px] font-bold tracking-[0.3em] text-amber-400"
              style={{ textShadow: '0 0 22px rgba(245,158,11,0.4)' }}
            >
              {room.code}
            </span>
          </button>
          <p className="text-[10px] mt-2 h-4">
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="c" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-400">
                  Kopirano
                </motion.span>
              ) : (
                <motion.span key="h" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="text-amber-100/50">
                  tapni da kopiraš
                </motion.span>
              )}
            </AnimatePresence>
          </p>
        </motion.div>

        {/* Players */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[10px] text-amber-200/40 tracking-[0.2em] uppercase">Igrači · {playerCount}</p>
            {playerCount < MIN_PLAYERS && (
              <motion.p
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[10px] text-amber-400/70"
              >
                čekamo još {MIN_PLAYERS - playerCount}
              </motion.p>
            )}
          </div>

          <div className="w-full h-px bg-white/[0.05] mb-5 relative">
            <motion.div
              className={`absolute top-0 left-0 h-px ${canStart ? 'bg-emerald-500/50' : 'bg-amber-500/50'}`}
              animate={{ width: `${Math.min((playerCount / MIN_PLAYERS) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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

        {/* Target score */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex flex-col gap-3">
          <p className="text-[10px] text-amber-200/40 tracking-[0.2em] uppercase">Ciljni rezultat</p>
          <div className="grid grid-cols-4 gap-2">
            {TARGET_OPTIONS.map((opt) => {
              const active = opt === targetScore;
              return (
                <button
                  key={opt}
                  disabled={!isHost}
                  onClick={() => updateSettings(room.code, { targetScore: opt })}
                  className={`min-h-[48px] rounded-xl text-[15px] font-bold tabular-nums transition-colors ${
                    active ? 'bg-amber-500 text-[#0a1626]' : 'bg-white/[0.04] text-amber-100/60'
                  } ${isHost ? 'active:bg-white/[0.12] hover:bg-white/[0.08]' : 'cursor-default'}`}
                  style={active ? { boxShadow: '0 0 16px rgba(245,158,11,0.3)' } : undefined}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {!isHost && <p className="text-[10px] text-amber-100/30">Samo host menja podešavanja</p>}
        </motion.div>

        {!isHost && (
          <motion.p
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-[12px] text-amber-100/40 text-center py-2"
          >
            Čekamo da host započne igru...
          </motion.p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-6 flex flex-col gap-3">
          {isHost && (
            <Button
              fullWidth
              disabled={!canStart || starting}
              onClick={handleStart}
              className="!bg-amber-500 !text-[#0a1626] hover:!bg-amber-400 active:!bg-amber-600"
            >
              {starting ? 'Pokretanje...' : canStart ? 'Započni igru' : `Još ${MIN_PLAYERS - playerCount} igrača`}
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={handleLeave} className="!text-amber-100/40 hover:!text-amber-100/70">
            Napusti sobu
          </Button>
        </div>
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(7,13,24,0.95)' }}
          >
            <motion.span
              key={countdown}
              initial={{ scale: 4, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-[140px] font-bold text-amber-400 leading-none tabular-nums"
              style={{ textShadow: '0 0 40px rgba(245,158,11,0.5)' }}
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
