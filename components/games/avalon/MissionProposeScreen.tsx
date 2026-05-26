'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvalonRoom, getMissionTeamSize } from '@/lib/types/avalon';
import { proposeTeam } from '@/lib/firestore/avalon';
import { Button } from '@/components/ui/Button';

interface Props {
  room: AvalonRoom;
  playerId: string;
}

export function MissionProposeScreen({ room, playerId }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const leader = room.players.find((p) => p.isLeader);
  const isLeader = leader?.id === playerId;
  const teamSize = getMissionTeamSize(room.players.length, room.currentMission);
  const canSubmit = selected.length === teamSize;

  function togglePlayer(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < teamSize
          ? [...prev, id]
          : prev
    );
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await proposeTeam(room.code, selected);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-col flex-1 px-8 py-10 h-screen-safe overflow-y-auto">
      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-8 flex-1">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">
            Misija {room.currentMission} od 5
          </p>

          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((m) => {
              const result = room.missionResults.find((r) => r.missionNumber === m);
              const isCurrent = m === room.currentMission;
              return (
                <motion.div
                  key={m}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold border-2 ${
                    result?.result === 'success'
                      ? 'bg-blue-500/20 border-blue-400 text-blue-400'
                      : result?.result === 'fail'
                        ? 'bg-red-500/20 border-red-400 text-red-400'
                        : isCurrent
                          ? 'border-amber-500 text-amber-400'
                          : 'border-slate-700 text-slate-600'
                  }`}
                >
                  {m}
                </motion.div>
              );
            })}
          </div>

          {room.consecutiveRejects > 0 && (
            <p className="text-[11px] text-red-400/70">
              Odbijanja: {room.consecutiveRejects}/5
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">Lider</p>
          <p className="text-[18px] font-bold text-amber-400" style={{ textShadow: '0 0 12px rgba(217,119,6,0.3)' }}>
            {leader?.name ?? '...'}
          </p>
          <p className="text-[12px] text-slate-500 mt-1">
            {isLeader ? `Izaberi ${teamSize} vitezova za misiju` : `${leader?.name} bira tim...`}
          </p>
        </motion.div>

        {isLeader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-2"
          >
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-1">
              Tim · {selected.length}/{teamSize}
            </p>
            {room.players
              .filter((p) => p.isConnected)
              .map((p) => {
                const isSelected = selected.includes(p.id);
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => togglePlayer(p.id)}
                    className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 ${
                      isSelected
                        ? 'bg-amber-600/20 border border-amber-500/40'
                        : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-amber-400 bg-amber-500/30' : 'border-slate-600'
                    }`}>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full bg-amber-400"
                        />
                      )}
                    </div>
                    <span className={`text-[14px] font-medium ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                      {p.name}
                    </span>
                    {p.id === playerId && (
                      <span className="text-[9px] text-amber-500/60 tracking-[0.15em] uppercase">ti</span>
                    )}
                  </motion.button>
                );
              })}
          </motion.div>
        )}

        {!isLeader && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex flex-col items-center gap-3 py-8"
          >
            <span className="text-3xl">⏳</span>
            <p className="text-[12px] text-slate-600">Čekamo liderov izbor...</p>
          </motion.div>
        )}

        {isLeader && (
          <div className="mt-auto pt-6">
            <Button
              fullWidth
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="!bg-amber-600 hover:!bg-amber-500"
            >
              {submitting ? 'Šaljem...' : canSubmit ? 'Predloži tim' : `Izaberi još ${teamSize - selected.length}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
