'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AliasRoom } from '@/lib/types/alias';
import { playAgain, leaveRoom } from '@/lib/firestore/alias';

interface Props {
  room: AliasRoom;
  playerId: string;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ['#0891b2', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'][Math.floor(Math.random() * 5)],
      size: 4 + Math.random() * 6,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: 360 + Math.random() * 360 }}
          transition={{ delay: p.delay, duration: p.duration, ease: 'linear', repeat: Infinity }}
          style={{ position: 'absolute', width: p.size, height: p.size, backgroundColor: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px' }}
        />
      ))}
    </div>
  );
}

export function GameOverScreen({ room, playerId }: Props) {
  const router = useRouter();
  const isHost = room.hostId === playerId;

  const winner = room.scores.a >= room.settings.targetScore ? 'a' :
                 room.scores.b >= room.settings.targetScore ? 'b' : null;
  const isDraw = room.scores.a === room.scores.b;
  const aborted = !winner && !isDraw;

  const playerTeam = room.players.find((p) => p.id === playerId)?.teamId;
  const isWinner = winner !== null && playerTeam === winner;

  async function handleLeave() {
    await leaveRoom(room.code, playerId);
    localStorage.removeItem('playerId');
    router.push('/');
  }

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 py-10 h-screen-safe overflow-y-auto">
      {winner && <Confetti />}

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-[340px] flex flex-col gap-6"
      >
        <motion.div variants={fadeUp} className="text-center">
          <motion.p
            className="text-5xl mb-4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
          >
            {aborted ? '⚠️' : winner === 'a' ? '🏆' : '🏆'}
          </motion.p>
          <h2 className="text-[28px] font-bold text-white tracking-[-0.03em] leading-tight">
            {aborted ? 'Igra prekinuta' :
             isDraw ? 'Neriješeno!' :
             winner === 'a' ? 'Tim A pobjeđuje!' : 'Tim B pobjeđuje!'}
          </h2>
          {aborted && (
            <p className="text-[12px] text-slate-500 mt-2">Premalo igrača za nastavak</p>
          )}
          {isWinner && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[13px] text-emerald-400 mt-2"
            >
              Čestitamo, bio/la si u pobjedničkom timu!
            </motion.p>
          )}
        </motion.div>

        {/* Final scores */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-8">
          <div className="text-center">
            <p className={`text-[48px] font-bold tabular-nums leading-none ${winner === 'a' ? 'text-cyan-400' : 'text-slate-500'}`}
               style={winner === 'a' ? { textShadow: '0 0 25px rgba(8,145,178,0.5)' } : {}}>
              {room.scores.a}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">Tim A</p>
          </div>
          <div className="text-[28px] text-slate-700 font-light">:</div>
          <div className="text-center">
            <p className={`text-[48px] font-bold tabular-nums leading-none ${winner === 'b' ? 'text-amber-400' : 'text-slate-500'}`}
               style={winner === 'b' ? { textShadow: '0 0 25px rgba(245,158,11,0.5)' } : {}}>
              {room.scores.b}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2">Tim B</p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="flex gap-px w-full overflow-hidden rounded-lg">
          {[
            { v: room.round, l: room.round === 1 ? 'runda' : 'rundi' },
            { v: room.players.length, l: 'igrača' },
            { v: `${room.scores.a + room.scores.b}`, l: 'ukupno poena' },
          ].map((s, i) => (
            <div key={i} className="flex-1 text-center py-3 bg-white/[0.02]">
              <p className="text-[16px] font-bold text-white tabular-nums">{s.v}</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-[0.15em] mt-0.5">{s.l}</p>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} className="flex flex-col gap-2 mt-4">
          {isHost ? (
            <button
              onClick={() => playAgain(room.code)}
              className="w-full py-3.5 rounded-lg text-[13px] font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-[0_0_20px_rgba(8,145,178,0.3)]"
            >
              Nova igra
            </button>
          ) : (
            <p className="text-[11px] text-slate-500 text-center py-2">Čekamo host-a...</p>
          )}
          <button
            onClick={handleLeave}
            className="w-full py-3 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors"
          >
            Napusti sobu
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
