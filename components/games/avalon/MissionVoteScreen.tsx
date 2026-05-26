'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AvalonRoom, TeamVote } from '@/lib/types/avalon';
import { castTeamVote, resolveTeamVote } from '@/lib/firestore/avalon';
import { Button } from '@/components/ui/Button';

interface Props {
  room: AvalonRoom;
  playerId: string;
}

export function MissionVoteScreen({ room, playerId }: Props) {
  const [voting, setVoting] = useState(false);

  const myVote = room.teamVotes[playerId] as TeamVote | undefined;
  const hasVoted = !!myVote;
  const connectedPlayers = room.players.filter((p) => p.isConnected);
  const totalExpected = connectedPlayers.length;
  const totalVoted = Object.keys(room.teamVotes).length;
  const allVoted = totalVoted >= totalExpected;
  const isHost = room.hostId === playerId;

  const proposedNames = room.proposedTeam
    .map((id) => room.players.find((p) => p.id === id)?.name)
    .filter(Boolean);

  const leader = room.players.find((p) => p.isLeader);

  useEffect(() => {
    if (allVoted && isHost) {
      resolveTeamVote(room.code);
    }
  }, [allVoted, isHost, room.code]);

  async function handleVote(vote: TeamVote) {
    if (hasVoted || voting) return;
    setVoting(true);
    await castTeamVote(room.code, playerId, vote);
    setVoting(false);
  }

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      <div className="relative w-full max-w-[320px] flex flex-col items-center gap-8">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">
            Misija {room.currentMission} · Glasanje za tim
          </p>
          <p className="text-[13px] text-slate-400">
            {leader?.name} predlaže:
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full p-5 rounded-xl bg-amber-950/15 border border-amber-500/10"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {proposedNames.map((name) => (
              <span
                key={name}
                className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-300 text-[13px] font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>

        {!hasVoted ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full flex gap-4"
          >
            <Button
              fullWidth
              disabled={voting}
              onClick={() => handleVote('approve')}
              className="!bg-blue-600/80 hover:!bg-blue-500"
            >
              ✓ Odobri
            </Button>
            <Button
              fullWidth
              disabled={voting}
              onClick={() => handleVote('reject')}
              className="!bg-red-600/60 hover:!bg-red-500/70"
            >
              ✗ Odbij
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-[14px] text-slate-400">
              Glasao si: <span className={myVote === 'approve' ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>
                {myVote === 'approve' ? 'Odobri' : 'Odbij'}
              </span>
            </p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Glasovi</p>
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

        <div className="w-full flex flex-wrap justify-center gap-2">
          {connectedPlayers.map((p) => {
            const voted = p.id in room.teamVotes;
            return (
              <motion.div
                key={p.id}
                animate={voted ? { scale: [1, 1.1, 1] } : { opacity: [0.4, 0.7, 0.4] }}
                transition={voted ? { duration: 0.3 } : { repeat: Infinity, duration: 2 }}
                className={`px-3 py-1.5 rounded-lg text-[11px] ${
                  voted
                    ? 'bg-amber-600/20 text-amber-300'
                    : 'bg-white/[0.02] text-slate-600'
                }`}
              >
                {p.name}{p.id === playerId ? ' (ti)' : ''}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
