'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AvalonRoom, QuestVote } from '@/lib/types/avalon';
import { castQuestVote, resolveQuest } from '@/lib/firestore/avalon';
import { Button } from '@/components/ui/Button';

interface Props {
  room: AvalonRoom;
  playerId: string;
}

export function QuestPhaseScreen({ room, playerId }: Props) {
  const [voting, setVoting] = useState(false);

  const me = room.players.find((p) => p.id === playerId);
  const isOnMission = me?.isOnMission ?? false;
  const isEvil = me?.loyalty === 'evil';
  const myVote = room.questVotes[playerId] as QuestVote | undefined;
  const hasVoted = !!myVote;
  const isHost = room.hostId === playerId;

  const missionPlayers = room.players.filter((p) => p.isOnMission);
  const totalExpected = missionPlayers.length;
  const totalVoted = Object.keys(room.questVotes).length;
  const allVoted = totalVoted >= totalExpected;

  useEffect(() => {
    if (allVoted && isHost) {
      resolveQuest(room.code);
    }
  }, [allVoted, isHost, room.code]);

  async function handleVote(vote: QuestVote) {
    if (hasVoted || voting) return;
    setVoting(true);
    try {
      await castQuestVote(room.code, playerId, vote);
    } catch {
      setVoting(false);
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          background: 'radial-gradient(ellipse 400px 400px at center, rgba(217,119,6,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[320px] flex flex-col items-center gap-8">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">
            Misija {room.currentMission}
          </p>
          <h2 className="text-[24px] font-bold text-white">Tajna misija</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
        >
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-3 text-center">Tim na misiji</p>
          <div className="flex flex-wrap justify-center gap-2">
            {missionPlayers.map((p) => (
              <span
                key={p.id}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium ${
                  p.id === playerId
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/[0.03] text-slate-400'
                }`}
              >
                {p.name}{p.id === playerId ? ' (ti)' : ''}
              </span>
            ))}
          </div>
        </motion.div>

        {isOnMission && !hasVoted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full flex flex-col gap-4"
          >
            <p className="text-[12px] text-slate-400 text-center">
              {isEvil ? 'Možeš sabotirati ili pomoći...' : 'Glasaj za uspjeh misije'}
            </p>
            <div className="flex gap-4">
              <Button
                fullWidth
                disabled={voting}
                onClick={() => handleVote('success')}
                className="!bg-blue-600/80 hover:!bg-blue-500"
              >
                ✓ Uspjeh
              </Button>
              {isEvil && (
                <Button
                  fullWidth
                  disabled={voting}
                  onClick={() => handleVote('sabotage')}
                  className="!bg-red-600/60 hover:!bg-red-500/70"
                >
                  ✗ Sabotaža
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {isOnMission && hasVoted && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[14px] text-slate-400"
          >
            Glas poslan. Čekamo ostale...
          </motion.p>
        )}

        {!isOnMission && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <span className="text-3xl">⏳</span>
            <p className="text-[12px] text-slate-600">Tim je na misiji...</p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Glasovi misije</p>
            <p className="text-[12px] text-slate-400">{totalVoted}/{totalExpected}</p>
          </div>
          <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500/60 rounded-full"
              animate={{ width: `${(totalVoted / totalExpected) * 100}%` }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
