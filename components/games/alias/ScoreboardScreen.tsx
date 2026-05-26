'use client';

import { motion } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { nextRound } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

export function ScoreboardScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const leading = room.scores.a >= room.scores.b ? 'a' : 'b';
  const target = room.settings.targetScore;

  const teamAPlayers = room.players.filter((p) => p.teamId === 'a');
  const teamBPlayers = room.players.filter((p) => p.teamId === 'b');

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      <div className="breathing-orb w-[250px] h-[250px] bg-cyan-500/8 top-[10%] left-[-30px]" />
      <div className="breathing-orb w-[200px] h-[200px] bg-amber-500/8 bottom-[15%] right-[-30px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-[340px] flex flex-col items-center gap-8"
      >
        <p className="text-[10px] text-slate-500 tracking-[0.25em] uppercase">Rezultat</p>

        {/* Score display */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <motion.p
              key={room.scores.a}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-[56px] font-bold text-cyan-400 tabular-nums leading-none"
              style={{ textShadow: '0 0 25px rgba(8,145,178,0.5)' }}
            >
              {room.scores.a}
            </motion.p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">Tim A</p>
          </div>

          <div className="text-[32px] text-slate-700 font-light">:</div>

          <div className="text-center">
            <motion.p
              key={room.scores.b}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-[56px] font-bold text-amber-400 tabular-nums leading-none"
              style={{ textShadow: '0 0 25px rgba(245,158,11,0.5)' }}
            >
              {room.scores.b}
            </motion.p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">Tim B</p>
          </div>
        </div>

        {/* Progress to target */}
        <div className="w-full">
          <div className="flex justify-between text-[9px] text-slate-600 mb-1">
            <span>0</span>
            <span>cilj: {target}</span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-cyan-500/60 rounded-full"
              animate={{ width: `${Math.min((room.scores.a / target) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
          <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden mt-1">
            <motion.div
              className="h-full bg-amber-500/60 rounded-full"
              animate={{ width: `${Math.min((room.scores.b / target) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
        </div>

        {/* Team rosters */}
        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <p className="text-[9px] text-cyan-500/60 tracking-[0.2em] uppercase mb-2">Tim A</p>
            {teamAPlayers.map((p) => (
              <p key={p.id} className="text-[11px] text-slate-400 py-0.5">
                {p.name}
                {p.id === playerId && <span className="text-[8px] text-slate-600 ml-1">ti</span>}
              </p>
            ))}
          </div>
          <div className="flex-1">
            <p className="text-[9px] text-amber-500/60 tracking-[0.2em] uppercase mb-2">Tim B</p>
            {teamBPlayers.map((p) => (
              <p key={p.id} className="text-[11px] text-slate-400 py-0.5">
                {p.name}
                {p.id === playerId && <span className="text-[8px] text-slate-600 ml-1">ti</span>}
              </p>
            ))}
          </div>
        </div>

        {/* Next round */}
        <div className="w-full mt-4">
          {isHost ? (
            <button
              onClick={() => nextRound(room.code)}
              className="w-full py-3.5 rounded-lg text-[13px] font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-[0_0_20px_rgba(8,145,178,0.3)]"
            >
              {room.scores.a >= target || room.scores.b >= target ? 'Završi igru' : 'Sljedeća runda'}
            </button>
          ) : (
            <p className="text-[11px] text-slate-500 text-center py-2">Čekamo host-a...</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
