'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Room } from '@/lib/types';
import { advanceToVoting, shufflePrompt } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';

interface Props {
  room: Room;
  playerId: string;
}

const listItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function DiscussionScreen({ room, playerId }: Props) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const isHost = room.hostId === playerId;
  const isImpostor = room.impostorIds.includes(playerId);
  const prompt = isImpostor ? room.currentPrompt.impostor : room.currentPrompt.crew;
  const alivePlayers = room.players.filter((p) => p.isAlive);

  useEffect(() => {
    if (!timerRunning || timer === null || timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [timerRunning, timer]);

  const toggleTimer = useCallback(() => {
    if (timer === null) {
      setTimer(60);
      setTimerRunning(true);
    } else {
      setTimerRunning((r) => !r);
    }
  }, [timer]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col flex-1 px-6 py-8 h-screen-safe">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-5 flex-1">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
            Runda {room.round}
          </p>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Diskusija</h2>
        </motion.div>

        {/* Optional timer */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-3"
          >
            {timer !== null && (
              <span className={`text-2xl font-bold tabular-nums tracking-tight ${timer <= 10 ? 'text-red-400' : 'text-slate-200'}`}>
                {formatTime(timer)}
              </span>
            )}
            <button
              onClick={toggleTimer}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface/60 border border-slate-600/30 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {timer === null ? 'Pokreni tajmer' : timerRunning ? 'Pauza' : 'Nastavi'}
            </button>
          </motion.div>
        )}

        {/* Non-host timer display */}
        {!isHost && timer !== null && (
          <div className="text-center">
            <span className={`text-2xl font-bold tabular-nums tracking-tight ${timer <= 10 ? 'text-red-400' : 'text-slate-200'}`}>
              {formatTime(timer)}
            </span>
          </div>
        )}

        {/* Prompt peek */}
        <motion.button
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
          onPointerDown={() => setShowPrompt(true)}
          onPointerUp={() => setShowPrompt(false)}
          onPointerLeave={() => setShowPrompt(false)}
          onPointerCancel={() => setShowPrompt(false)}
          className={`
            w-full rounded-xl p-4 text-center transition-all duration-200 touch-none select-none
            ${showPrompt
              ? isImpostor
                ? 'bg-red-950/40 border border-red-500/30 glow-danger'
                : 'bg-violet-950/30 border border-violet-500/30 glow-violet-sm'
              : 'bg-surface/60 border border-slate-600/30 hover:border-slate-500/40'
            }
          `}
        >
          {showPrompt ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
                {room.gameMode === 'sentences' ? 'Tvoje pitanje' : 'Tvoj pojam'}
              </p>
              <p className="text-sm text-slate-100 font-medium leading-relaxed">{prompt}</p>
            </motion.div>
          ) : (
            <p className="text-sm text-slate-500">
              Zadrži da pogledaš pitanje
            </p>
          )}
        </motion.button>

        {/* Players alive */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">
            Igrači u igri ({alivePlayers.length})
          </p>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-2 gap-2"
          >
            {alivePlayers.map((p) => (
              <motion.div
                key={p.id}
                variants={listItem}
                className={`
                  flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors
                  ${p.id === playerId
                    ? 'bg-violet-500/10 border border-violet-500/20'
                    : 'bg-surface/40 border border-slate-600/20'
                  }
                `}
              >
                <span className="text-xs">
                  {p.isConnected ? '🟢' : '⚫'}
                </span>
                <span className="text-sm text-slate-200 truncate">
                  {p.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Info */}
        <p className="text-xs text-slate-500 text-center">
          Diskutujte o svojim odgovorima. Ko zvuči sumnjivo?
        </p>

        {/* Host controls */}
        <div className="mt-auto pt-4 flex flex-col gap-2">
          {isHost && (
            <>
              <Button fullWidth onClick={() => advanceToVoting(room.code)}>
                Počni glasanje
              </Button>
              <Button variant="ghost" fullWidth onClick={() => shufflePrompt(room.code)}>
                Zameni pitanje
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
