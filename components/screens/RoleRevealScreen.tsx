'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room } from '@/lib/types';
import { advanceToDiscussion, shufflePrompt } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';

interface Props {
  room: Room;
  playerId: string;
}

export function RoleRevealScreen({ room, playerId }: Props) {
  const [isHolding, setIsHolding] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);
  const isHost = room.hostId === playerId;
  const isImpostor = room.impostorIds.includes(playerId);
  const prompt = isImpostor ? room.currentPrompt.impostor : room.currentPrompt.crew;
  const role = isImpostor ? 'Impostor' : 'Crewmate';

  const handlePointerDown = useCallback(() => {
    setIsHolding(true);
    setHasSeen(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsHolding(false);
  }, []);

  async function handleAdvance() {
    await advanceToDiscussion(room.code);
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 h-screen-safe">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-400 uppercase tracking-widest"
        >
          Runda {room.round}
        </motion.p>

        {/* Hold zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
          className="w-full aspect-[3/4] max-h-[420px] relative select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Card back (visible when not holding) */}
          <AnimatePresence mode="wait">
            {!isHolding ? (
              <motion.div
                key="back"
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -90 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-surface border border-slate-600/40"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="text-5xl mb-4"
                >
                  🎭
                </motion.div>
                <p className="text-sm font-medium text-slate-300">
                  Zadrži da vidiš
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  svoju ulogu
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="front"
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -90 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                className={`
                  absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-6
                  ${isImpostor
                    ? 'bg-red-950/60 border-2 border-red-500/40 glow-danger'
                    : 'bg-violet-950/40 border-2 border-violet-500/40 glow-violet'
                  }
                `}
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* Visual pulse on reveal */}
                <motion.div
                  className={`absolute inset-0 rounded-2xl ${isImpostor ? 'bg-red-500/10' : 'bg-violet-500/10'}`}
                  animate={{ opacity: [0.6, 0, 0.3, 0] }}
                  transition={{ duration: 0.8, times: [0, 0.3, 0.6, 1] }}
                />
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">
                  Ti si
                </p>
                <h2
                  className={`text-3xl font-bold mb-6 ${
                    isImpostor ? 'text-red-400' : 'text-violet-400'
                  }`}
                >
                  {role}
                </h2>
                <div className="w-12 h-px bg-slate-600/50 mb-6" />
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">
                  {room.gameMode === 'sentences' ? 'Tvoje pitanje' : 'Tvoj pojam'}
                </p>
                <p className="text-base text-center text-slate-100 font-medium leading-relaxed">
                  {prompt}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {hasSeen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-1"
          >
            <p className="text-xs text-slate-500">
              Zapamti svoju ulogu i pitanje
            </p>
            <p className="text-[10px] text-slate-600">
              🔒 Ne pravi screenshot
            </p>
          </motion.div>
        )}

        {isHost && (
          <div className="w-full flex flex-col gap-2">
            <Button fullWidth onClick={handleAdvance}>
              Svi su videli → Diskusija
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => shufflePrompt(room.code)}
            >
              Zameni pitanje
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
