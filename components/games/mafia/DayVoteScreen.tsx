'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MafiaRoom } from '@/lib/types/mafia';
import { submitVote, processVotes } from '@/lib/firestore/mafia';
import { Button } from '@/components/ui/Button';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

export function DayVoteScreen({ room, playerId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  const me = room.players[playerId];
  const isHost = room.hostId === playerId;
  const isAlive = me?.isAlive ?? false;
  const isSilenced = me?.isSilenced ?? false;
  const canVote = isAlive && !isSilenced;

  const alreadyVoted = room.votes.some((v) => v.voterId === playerId);
  const alivePlayers = Object.values(room.players).filter((p) => p.isAlive);
  const votablePlayers = alivePlayers.filter((p) => p.id !== playerId);

  // Real-time vote counts (anonymous — only count, no who-voted-for-whom)
  const voteCounts: Record<string, number> = {};
  for (const vote of room.votes) {
    voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
  }

  const totalEligible = alivePlayers.filter((p) => !p.isSilenced).length;
  const totalVoted = room.votes.length;
  const allVoted = totalVoted >= totalEligible;

  // Timer
  useEffect(() => {
    if (timerExpired) return;
    const t = setTimeout(() => setTimerExpired(true), room.settings.dayDuration * 1000);
    return () => clearTimeout(t);
  }, [room.settings.dayDuration, timerExpired]);

  // Host auto-processes
  useEffect(() => {
    if ((allVoted || timerExpired) && isHost && !processing) {
      setProcessing(true);
      processVotes(room.code).finally(() => setProcessing(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVoted, timerExpired]);

  async function handleConfirm() {
    if (!selected || confirmed || !canVote) return;
    setConfirmed(true);
    await submitVote(room.code, playerId, selected);
  }

  const maxVotes = Math.max(0, ...Object.values(voteCounts));

  return (
    <div className="relative flex flex-col flex-1 px-5 py-10 h-screen-safe overflow-y-auto"
      style={{ background: '#0f1320' }}>
      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-6 flex-1">

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <h2 className="text-[24px] font-bold text-white tracking-[-0.03em]">Glasanje</h2>
          <p className="text-[11px] text-slate-500 mt-1">{totalVoted} od {totalEligible} glasova</p>
        </motion.div>

        {/* Vote progress ring */}
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
                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - totalVoted / Math.max(totalEligible, 1)) }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </svg>
            {!allVoted && (
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              >
                <div className="absolute top-1/2 left-1/2 w-[1px] h-1/2 origin-bottom bg-gradient-to-t from-red-500/60 to-transparent"
                  style={{ transform: 'translate(-50%, -100%)' }} />
              </motion.div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[14px] font-bold text-red-400 tabular-nums">{totalVoted}</span>
            </div>
          </div>
        </div>

        {/* Voted status chips */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {alivePlayers.map((p) => {
            const voted = room.votes.some((v) => v.voterId === p.id);
            const silenced = p.isSilenced;
            return (
              <motion.span
                key={p.id}
                animate={{ opacity: voted || silenced ? 1 : 0.35 }}
                className="text-[10px] px-2 py-0.5 rounded-md"
                style={{
                  background: silenced ? 'rgba(236,72,153,0.08)' : voted ? 'rgba(220,38,38,0.1)' : 'transparent',
                  color: silenced ? '#f9a8d4' : voted ? '#fca5a5' : '#475569',
                }}
              >
                {p.name}{silenced ? ' 🔇' : voted ? ' ✓' : ''}
              </motion.span>
            );
          })}
        </div>

        {/* Vote options */}
        <AnimatePresence mode="wait">
          {canVote && !confirmed && !alreadyVoted ? (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-1"
            >
              {votablePlayers.map((p, i) => {
                const vCount = voteCounts[p.id] ?? 0;
                const isSelected = selected === p.id;
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                    whileTap={{ scale: 0.98, x: 4 }}
                    onClick={() => setSelected(p.id)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer relative overflow-hidden"
                    style={{
                      background: isSelected ? 'rgba(220,38,38,0.10)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(220,38,38,0.45)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                  >
                    {/* Vote heat bar */}
                    {vCount > 0 && (
                      <motion.div
                        className="absolute inset-0 origin-left"
                        style={{ background: 'rgba(220,38,38,0.06)' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: vCount / Math.max(maxVotes, 1) }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    )}
                    <div className="w-1.5 h-1.5 rounded-full relative z-10"
                      style={{ background: isSelected ? ACCENT2 : '#475569' }} />
                    <span className="text-[13px] font-medium text-slate-300 relative z-10 flex-1">{p.name}</span>
                    {vCount > 0 && (
                      <span className="text-[11px] text-red-400/70 relative z-10 tabular-nums">{vCount}</span>
                    )}
                  </motion.button>
                );
              })}

              <div className="h-px bg-white/[0.03] my-1" />

              <Button
                fullWidth
                disabled={!selected}
                onClick={handleConfirm}
                className="!rounded-2xl !text-white mt-1"
                style={{
                  background: selected ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : undefined,
                  boxShadow: selected ? '0 4px 16px rgba(220,38,38,0.35)' : undefined,
                }}
              >
                Potvrdi glas
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              {isSilenced ? (
                <>
                  <span className="text-3xl">🔇</span>
                  <p className="text-[13px] text-pink-300/70">Ne možeš glasati danas</p>
                  <p className="text-[11px] text-slate-600">neko te je ućutkao noćas</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-slate-400">
                    {!isAlive ? 'Eliminisan si' : 'Glas primljen'}
                  </p>
                  <motion.p
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="text-[11px] text-slate-700"
                  >
                    čekamo ostale...
                  </motion.p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Host force-process */}
        <AnimatePresence>
          {isHost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-auto pt-2"
            >
              <Button
                fullWidth
                onClick={() => { setProcessing(true); processVotes(room.code).finally(() => setProcessing(false)); }}
                disabled={processing || room.votes.length === 0}
                variant="ghost"
                className="!rounded-2xl text-[11px]"
              >
                {processing ? 'Obrađujem...' : 'Zatvori glasanje'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
