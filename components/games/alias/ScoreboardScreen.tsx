'use client';

import { motion } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { nextRound, finishGame } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

export function ScoreboardScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const target = room.settings.targetScore;
  const aLeading = room.scores.a >= room.scores.b;
  const gameOver = room.scores.a >= target || room.scores.b >= target;

  const teamAPlayers = room.players.filter((p) => p.teamId === 'a');
  const teamBPlayers = room.players.filter((p) => p.teamId === 'b');

  return (
    <div
      className="relative flex flex-col items-center justify-center flex-1 px-5 h-screen-safe overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="pointer-events-none fixed rounded-full"
        style={{ width: 300, height: 300, top: '5%', left: '-10%', background: 'radial-gradient(circle, rgba(8,145,178,0.07), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="pointer-events-none fixed rounded-full"
        style={{ width: 280, height: 280, bottom: '10%', right: '-10%', background: 'radial-gradient(circle, rgba(245,158,11,0.07), transparent 70%)', filter: 'blur(60px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-[340px] flex flex-col items-center gap-7"
      >
        <p className="text-[10px] text-slate-500 tracking-[0.25em] uppercase">Rezultat</p>

        {/* Scores */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <motion.p
              key={room.scores.a}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-[56px] font-bold tabular-nums leading-none"
              style={{
                color: aLeading ? '#22d3ee' : '#475569',
                textShadow: aLeading ? '0 0 25px rgba(8,145,178,0.5)' : 'none',
              }}
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
              className="text-[56px] font-bold tabular-nums leading-none"
              style={{
                color: !aLeading ? '#fbbf24' : '#475569',
                textShadow: !aLeading ? '0 0 25px rgba(245,158,11,0.5)' : 'none',
              }}
            >
              {room.scores.b}
            </motion.p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">Tim B</p>
          </div>
        </div>

        {/* Progress bars */}
        <div className="w-full flex flex-col gap-2">
          {[
            { label: 'Tim A', score: room.scores.a, color: 'linear-gradient(90deg, #0891b2, #22d3ee)', textColor: 'rgba(8,145,178,0.7)' },
            { label: 'Tim B', score: room.scores.b, color: 'linear-gradient(90deg, #f59e0b, #fbbf24)', textColor: 'rgba(245,158,11,0.7)' },
          ].map(({ label, score, color, textColor }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider w-10" style={{ color: textColor }}>{label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  animate={{ width: `${Math.min((score / target) * 100, 100)}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />
              </div>
              <span className="text-[9px] text-slate-600 w-6 text-right">{target}</span>
            </div>
          ))}
        </div>

        {/* Team rosters */}
        <div
          className="flex w-full rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex-1 p-4">
            <p className="text-[9px] text-cyan-500/60 tracking-[0.2em] uppercase mb-3">Tim A</p>
            {teamAPlayers.map((p) => (
              <p key={p.id} className="text-[11px] text-slate-400 py-0.5">
                {p.name}{p.id === playerId && <span className="text-[8px] text-slate-600 ml-1">ti</span>}
              </p>
            ))}
          </div>
          <div className="w-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="flex-1 p-4">
            <p className="text-[9px] text-amber-500/60 tracking-[0.2em] uppercase mb-3">Tim B</p>
            {teamBPlayers.map((p) => (
              <p key={p.id} className="text-[11px] text-slate-400 py-0.5">
                {p.name}{p.id === playerId && <span className="text-[8px] text-slate-600 ml-1">ti</span>}
              </p>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2">
          {isHost ? (
            <>
              <button
                onClick={() => nextRound(room.code)}
                className="w-full py-3.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 active:scale-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  border: '1px solid rgba(8,145,178,0.5)',
                  boxShadow: '0 0 20px rgba(8,145,178,0.3)',
                }}
              >
                {gameOver ? 'Završi igru' : 'Sljedeća runda'}
              </button>
              <button
                onClick={() => finishGame(room.code)}
                className="w-full py-3 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-95 cursor-pointer"
                style={{ color: '#475569', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                Završi partiju
              </button>
            </>
          ) : (
            <p className="text-[11px] text-slate-500 text-center py-2">Čekamo host-a...</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
