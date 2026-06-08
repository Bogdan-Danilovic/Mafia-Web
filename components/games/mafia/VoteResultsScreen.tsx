'use client';

import { motion } from 'framer-motion';
import { MafiaRoom, ROLE_LABEL, ROLE_ICON } from '@/lib/types/mafia';
import { advanceToNight } from '@/lib/firestore/mafia';
import { Button } from '@/components/ui/Button';
import { hexA } from '@/lib/utils';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

export function VoteResultsScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const eliminatedId = room.eliminatedThisRound;
  const eliminated = eliminatedId ? room.players[eliminatedId] : null;
  const revealRole = room.settings.showEliminatedRole && eliminated?.role;

  // Build vote tally for display
  const voteCounts: Record<string, number> = {};
  for (const vote of room.votes) {
    voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
  }

  return (
    <div className="relative flex flex-col flex-1 px-5 py-10 h-screen-safe overflow-y-auto"
      style={{ background: '#0f1320' }}>
      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-6">
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">

          {/* Header */}
          <motion.div variants={fadeUp} className="text-center">
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">Rezultat glasanja</p>
          </motion.div>

          {/* Eliminated card */}
          <motion.div
            variants={fadeUp}
            className="w-full rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: eliminated
                ? `linear-gradient(135deg, ${hexA(ACCENT, 0.15)}, ${hexA(ACCENT2, 0.08)})`
                : 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="p-6 text-center">
              {eliminated ? (
                <>
                  <motion.div
                    className="text-5xl mb-4"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
                  >
                    {revealRole ? ROLE_ICON[eliminated.role!] : '💀'}
                  </motion.div>
                  <h2 className="text-[26px] font-bold tracking-[-0.03em] text-white mb-1">
                    {eliminated.name}
                  </h2>
                  {revealRole && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <p className="text-[13px] font-semibold mt-2" style={{ color: '#f87171' }}>
                        {ROLE_LABEL[eliminated.role!]}
                      </p>
                    </motion.div>
                  )}
                  <p className="text-[11px] text-slate-600 mt-3">je lynchovan/a</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">🤝</div>
                  <h2 className="text-[22px] font-bold text-white tracking-[-0.03em]">Izjednačeno</h2>
                  <p className="text-[12px] text-slate-500 mt-2">Niko nije eliminisan danas</p>
                </>
              )}
            </div>
          </motion.div>

          {/* Vote breakdown */}
          {Object.keys(voteCounts).length > 0 && (
            <motion.div variants={fadeUp}>
              <p className="text-[9px] text-slate-600 tracking-[0.2em] uppercase mb-3">Glasovi</p>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {Object.entries(voteCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([targetId, count], i) => {
                    const player = room.players[targetId];
                    const maxC = Math.max(...Object.values(voteCounts));
                    return (
                      <div
                        key={targetId}
                        className="flex items-center gap-3 px-4 py-2.5 relative overflow-hidden"
                        style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      >
                        <motion.div
                          className="absolute inset-0 origin-left"
                          style={{ background: 'rgba(220,38,38,0.05)' }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: count / maxC }}
                          transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 200, damping: 25 }}
                        />
                        <span className="text-[12px] text-slate-400 relative z-10 flex-1">{player?.name ?? targetId}</span>
                        <span className="text-[13px] font-bold text-red-400/80 relative z-10 tabular-nums">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* Alive players */}
          <motion.div variants={fadeUp}>
            <p className="text-[9px] text-slate-600 tracking-[0.2em] uppercase mb-3">Preostali</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(room.players)
                .filter((p) => p.isAlive)
                .map((p) => (
                  <span key={p.id}
                    className="text-[10px] px-2.5 py-1 rounded-md border border-white/[0.06] bg-white/[0.03] text-slate-500">
                    {p.name}
                  </span>
                ))}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div variants={fadeUp} className="mt-auto pt-2">
            {isHost ? (
              <Button
                fullWidth
                onClick={() => advanceToNight(room.code)}
                className="!rounded-2xl !text-white"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                  boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
                }}
              >
                Nova noć
              </Button>
            ) : (
              <motion.p
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="text-[11px] text-slate-600 text-center"
              >
                Čekamo host-a...
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
