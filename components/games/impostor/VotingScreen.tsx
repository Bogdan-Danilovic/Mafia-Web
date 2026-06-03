'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImpostorRoom } from '@/lib/types/impostor';
import { castVote, processVotes } from '@/lib/firestore/impostor';
import { Button } from '@/components/ui/Button';

interface Props {
  room: ImpostorRoom;
  playerId: string;
}

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

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

  // Auto-advance when all votes are in — host triggers processing
  useEffect(() => {
    if (allVoted && isHost && !processing) {
      setProcessing(true);
      processVotes(room.code).finally(() => setProcessing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVoted]);

  async function handleVote(id: string) {
    if (hasVoted || !isAlive) return;
    setSelected(id);
    setHasVoted(true);
    await castVote(room.code, playerId, id);
  }

  async function handleSkip() {
    if (hasVoted || !isAlive) return;
    setSelected('skip');
    setHasVoted(true);
    await castVote(room.code, playerId, 'skip');
  }

  async function handleProcess() {
    if (processing) return;
    setProcessing(true);
    await processVotes(room.code);
    setProcessing(false);
  }

  return (
    <div className="relative flex flex-col flex-1 px-8 py-10 h-screen-safe">
      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-6 flex-1">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <h2 className="text-[24px] font-bold text-white tracking-[-0.03em]">Glasanje</h2>
          <p className="text-[11px] text-slate-500 mt-1">{totalVoted} od {totalAlive}</p>
        </motion.div>

        {/* Radar progress */}
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(220,38,38,0.08)" strokeWidth="2" />
              <motion.circle
                cx="32" cy="32" r="28" fill="none"
                stroke="rgba(220,38,38,0.6)"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeLinecap="round"
                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - totalVoted / totalAlive) }}
                transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
              />
            </svg>
            {!allVoted && (
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              >
                <div className="absolute top-1/2 left-1/2 w-[1px] h-1/2 origin-bottom bg-gradient-to-t from-red-500/60 to-transparent" style={{ transform: 'translate(-50%, -100%)' }} />
              </motion.div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[14px] font-bold text-red-400 tabular-nums">
                {totalVoted}
              </span>
            </div>
          </div>
        </div>

        {/* Voter chips */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {alivePlayers.map((p) => {
            const voted = p.id in room.votes;
            return (
              <motion.span
                key={p.id}
                animate={{ opacity: voted ? 1 : 0.35 }}
                className={`text-[10px] px-2 py-0.5 rounded-md transition-all duration-500 ${
                  voted ? 'text-red-300 bg-red-500/10' : 'text-slate-600'
                }`}
              >
                {p.name}{voted ? ' ✓' : ''}
              </motion.span>
            );
          })}
        </div>

        {/* Vote options */}
        <AnimatePresence mode="wait">
          {isAlive && !hasVoted ? (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-1"
            >
              {votablePlayers.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring' as const, stiffness: 300, damping: 24 }}
                  whileTap={{ scale: 0.98, x: 4 }}
                  onClick={() => handleVote(p.id)}
                  className="flex items-center gap-3 px-4 py-3.5 text-left text-[13px] font-medium text-slate-300 rounded-lg hover:bg-white/[0.03] transition-colors duration-150"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  {p.name}
                </motion.button>
              ))}

              <div className="h-px bg-white/[0.03] my-2" />

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: votablePlayers.length * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSkip}
                className="py-3 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
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
              <p className="text-[12px] text-slate-500">
                {!isAlive ? 'Eliminisan si' : selected === 'skip' ? 'Preskočio si' : 'Glasao si'}
              </p>
              <motion.p
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="text-[11px] text-slate-600"
              >
                čekamo ostale...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Process */}
        <AnimatePresence>
          {isHost && allVoted && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-auto pt-4"
            >
              <Button
                fullWidth
                onClick={handleProcess}
                disabled={processing}
                className="!rounded-2xl !text-white"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                  boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
                }}
              >
                {processing ? 'Obrađujem...' : 'Otkrij rezultat'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
