'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImpostorRoom } from '@/lib/types/impostor';
import { castVote, processVotes } from '@/lib/firestore/impostor';
import { tallyVotes, checkWinCondition } from '@/lib/utils';
import { Button } from '@/components/shared/Button';

interface Props {
  room: ImpostorRoom;
  playerId: string;
}

const listItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function VotingScreen({ room, playerId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const isHost = room.hostId === playerId;
  const isAlive = room.players.find((p) => p.id === playerId)?.isAlive ?? false;
  const alivePlayers = room.players.filter((p) => p.isAlive);
  const votablePlayers = alivePlayers.filter((p) => p.id !== playerId);

  const totalAlive = alivePlayers.length;
  const totalVoted = Object.keys(room.votes).length;
  const allVoted = totalVoted >= totalAlive;

  useEffect(() => {
    if (playerId in room.votes) setHasVoted(true);
  }, [playerId, room.votes]);

  async function handleVote(votedForId: string) {
    if (hasVoted || !isAlive) return;
    setSelected(votedForId);
    setHasVoted(true);
    await castVote(room.code, playerId, votedForId);
  }

  async function handleSkip() {
    if (hasVoted || !isAlive) return;
    setSelected('skip');
    setHasVoted(true);
    await castVote(room.code, playerId, 'skip');
  }

  async function handleProcessVotes() {
    if (processing) return;
    setProcessing(true);
    const { eliminatedId } = tallyVotes(room.votes);

    const updatedPlayers = eliminatedId
      ? room.players.map((p) => (p.id === eliminatedId ? { ...p, isAlive: false } : p))
      : room.players;

    const winner = eliminatedId
      ? checkWinCondition(updatedPlayers, room.impostorIds)
      : null;

    await processVotes(room.code, eliminatedId, winner);
  }

  return (
    <div className="flex flex-col flex-1 px-6 py-8 h-screen-safe">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-5 flex-1">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Glasanje</h2>
          <p className="text-xs text-slate-400 mt-1">
            {totalVoted} od {totalAlive} glasalo
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-violet-500 rounded-full"
            animate={{ width: `${(totalVoted / totalAlive) * 100}%` }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
          />
        </div>

        {/* Who voted (anonymous chips) */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {alivePlayers.map((p) => {
            const voted = p.id in room.votes;
            return (
              <motion.div
                key={p.id}
                animate={{ opacity: voted ? 1 : 0.5 }}
                className={`
                  px-2.5 py-1 rounded-lg text-xs transition-colors duration-300
                  ${voted
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/20'
                    : 'bg-surface/40 text-slate-500 border border-slate-600/10'
                  }
                `}
              >
                {p.name}{voted ? ' ✓' : ''}
              </motion.div>
            );
          })}
        </div>

        {/* Vote options OR waiting state */}
        <AnimatePresence mode="wait">
          {isAlive && !hasVoted ? (
            <motion.div
              key="voting"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              className="flex flex-col gap-2"
            >
              {votablePlayers.map((p) => (
                <motion.button
                  key={p.id}
                  variants={listItem}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote(p.id)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left bg-surface/60 border border-slate-600/30 text-slate-200 hover:border-violet-500/30 hover:bg-surface-light/40 transition-all duration-150"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                </motion.button>
              ))}

              <div className="h-px bg-slate-600/20 my-1" />

              <motion.button
                variants={listItem}
                whileTap={{ scale: 0.98 }}
                onClick={handleSkip}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 bg-transparent border border-dashed border-slate-600/30 hover:text-slate-400 hover:border-slate-500/40 transition-all duration-150"
              >
                Preskoči glasanje
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center flex-1 gap-3"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                className="text-3xl"
              >
                🗳️
              </motion.div>
              <p className="text-sm text-slate-400">
                {!isAlive
                  ? 'Eliminisan si — ne možeš da glasaš'
                  : selected === 'skip'
                    ? 'Preskočio si glasanje. Čekamo ostale...'
                    : 'Glasao si. Čekamo ostale...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Process votes (host, all voted) */}
        <AnimatePresence>
          {isHost && allVoted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
              className="mt-auto pt-4"
            >
              <Button fullWidth onClick={handleProcessVotes} disabled={processing}>
                {processing ? 'Obrađujem...' : 'Otkrij rezultat'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
