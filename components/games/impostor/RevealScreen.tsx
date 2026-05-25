'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ImpostorRoom } from '@/lib/types/impostor';
import { nextRound, finishGame } from '@/lib/firestore/impostor';
import { Button } from '@/components/shared/Button';

interface Props {
  room: ImpostorRoom;
  playerId: string;
}

export function RevealScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const eliminated = room.players.find((p) => p.id === room.eliminatedId);
  const wasImpostor = room.eliminatedId ? room.impostorIds.includes(room.eliminatedId) : false;
  const isSingleImpostor = room.impostorIds.length === 1;
  const gameOver = room.winner !== null;

  const showRole = useMemo(() => {
    if (!room.eliminatedId) return false;
    if (isSingleImpostor) return true;
    return room.settings.revealOnVote;
  }, [room.eliminatedId, isSingleImpostor, room.settings.revealOnVote]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 h-screen-safe">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {room.eliminatedId && eliminated ? (
          <>
            {/* Eliminated name */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring' as const, stiffness: 200, damping: 20 }}
              className="text-center"
            >
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">
                Eliminisan
              </p>
              <p className="text-3xl font-bold text-slate-100 tracking-tight">
                {eliminated.name}
              </p>
            </motion.div>

            {/* Role reveal with glow pulse */}
            {showRole && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: 'spring' as const, stiffness: 200, damping: 15 }}
                className="relative"
              >
                {/* Animated glow ring */}
                <motion.div
                  className={`absolute -inset-3 rounded-2xl ${wasImpostor ? 'bg-red-500/20' : 'bg-emerald-500/15'}`}
                  animate={{ opacity: [0, 0.8, 0.3], scale: [0.95, 1.05, 1] }}
                  transition={{ duration: 1.2, delay: 1.1 }}
                />
                <div
                  className={`
                    relative px-8 py-4 rounded-xl text-lg font-bold
                    ${wasImpostor
                      ? 'bg-red-950/60 text-red-400 border border-red-500/40 glow-danger'
                      : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                    }
                  `}
                >
                  {wasImpostor ? '🎭 Bio je Impostor!' : '✅ Nije bio Impostor'}
                </div>
              </motion.div>
            )}

            {!showRole && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="px-6 py-3 rounded-xl text-sm text-slate-400 bg-surface/60 border border-slate-600/30"
              >
                Uloga ostaje tajna...
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' as const, stiffness: 200, damping: 20 }}
            className="text-center"
          >
            <p className="text-4xl mb-4">🤷</p>
            <p className="text-lg font-semibold text-slate-300 tracking-tight">
              Izjednačen rezultat
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Niko nije eliminisan
            </p>
          </motion.div>
        )}

        {/* Game over banner */}
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, type: 'spring' as const, stiffness: 300, damping: 24 }}
            className={`
              w-full text-center px-6 py-5 rounded-2xl
              ${room.winner === 'crew'
                ? 'bg-emerald-950/30 border border-emerald-500/20'
                : 'bg-red-950/30 border border-red-500/20'
              }
            `}
          >
            <p className="text-xl font-bold tracking-tight">
              {room.winner === 'crew' ? '🎉 Crewmate tim pobeđuje!' : '🎭 Impostor pobeđuje!'}
            </p>
          </motion.div>
        )}

        {/* Both prompts preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: gameOver ? 2.2 : 1.6 }}
          className="w-full space-y-2"
        >
          <p className="text-xs text-slate-500 uppercase tracking-widest text-center mb-1">Pitanja</p>
          <div className="px-4 py-2.5 rounded-xl bg-violet-950/15 border border-violet-500/10">
            <p className="text-[10px] text-violet-400 uppercase tracking-wider mb-0.5">Crewmate</p>
            <p className="text-xs text-slate-300">{room.currentPrompt.crew}</p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-red-950/15 border border-red-500/10">
            <p className="text-[10px] text-red-400 uppercase tracking-wider mb-0.5">Impostor</p>
            <p className="text-xs text-slate-300">{room.currentPrompt.impostor}</p>
          </div>
        </motion.div>

        {/* Host controls */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: gameOver ? 2.5 : 2 }}
            className="w-full"
          >
            {gameOver ? (
              <Button fullWidth onClick={() => finishGame(room.code)}>
                Prikaži rezultate
              </Button>
            ) : (
              <Button fullWidth onClick={() => nextRound(room.code)}>
                Sledeća runda
              </Button>
            )}
          </motion.div>
        )}

        {!isHost && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-xs text-slate-500"
          >
            Čekamo host-a...
          </motion.p>
        )}
      </div>
    </div>
  );
}
