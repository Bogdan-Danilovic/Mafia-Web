'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Room } from '@/lib/types';
import { playAgain, leaveRoom } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';

interface Props {
  room: Room;
  playerId: string;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const roleItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export function GameOverScreen({ room, playerId }: Props) {
  const router = useRouter();
  const isHost = room.hostId === playerId;
  const crewWon = room.winner === 'crew';
  const impostorCount = room.impostorIds.length;
  const crewCount = room.players.length - impostorCount;

  async function handleLeave() {
    await leaveRoom(room.code, playerId);
    localStorage.removeItem('playerId');
    router.push('/');
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 h-screen-safe overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm flex flex-col items-center gap-5"
      >
        {/* Winner banner */}
        <motion.div
          variants={fadeUp}
          className={`
            text-center px-8 py-6 rounded-2xl w-full
            ${crewWon
              ? 'bg-emerald-950/30 border border-emerald-500/20'
              : 'bg-red-950/30 border border-red-500/20'
            }
          `}
        >
          <p className="text-4xl mb-2">{crewWon ? '🎉' : '🎭'}</p>
          <h2 className="text-2xl font-bold tracking-tight">
            {crewWon ? 'Crewmate tim pobeđuje!' : 'Impostor pobeđuje!'}
          </h2>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="flex gap-3 w-full">
          <div className="flex-1 text-center px-3 py-2.5 rounded-xl bg-surface/40 border border-slate-600/15">
            <p className="text-lg font-bold text-slate-100">{room.round}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{room.round === 1 ? 'runda' : 'runde'}</p>
          </div>
          <div className="flex-1 text-center px-3 py-2.5 rounded-xl bg-surface/40 border border-slate-600/15">
            <p className="text-lg font-bold text-slate-100">{room.players.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">igrača</p>
          </div>
          <div className="flex-1 text-center px-3 py-2.5 rounded-xl bg-surface/40 border border-slate-600/15">
            <p className="text-lg font-bold text-slate-100">{crewCount}:{impostorCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">crew:imp</p>
          </div>
        </motion.div>

        {/* Roles reveal */}
        <motion.div variants={fadeUp} className="w-full">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 text-center">
            Uloge
          </p>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="flex flex-col gap-2"
          >
            {room.players.map((p) => {
              const wasImpostor = room.impostorIds.includes(p.id);
              return (
                <motion.div
                  key={p.id}
                  variants={roleItem}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl
                    ${wasImpostor
                      ? 'bg-red-950/30 border border-red-500/20'
                      : 'bg-surface/40 border border-slate-600/20'
                    }
                  `}
                >
                  <span className="text-sm font-medium text-slate-200">
                    {p.name}
                    {p.id === playerId && (
                      <span className="text-[10px] text-violet-400 ml-2 uppercase">ti</span>
                    )}
                  </span>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      wasImpostor ? 'text-red-400' : 'text-slate-500'
                    }`}
                  >
                    {wasImpostor ? 'Impostor' : 'Crewmate'}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Prompts */}
        <motion.div variants={fadeUp} className="w-full">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 text-center">
            Pitanja
          </p>
          <div className="flex flex-col gap-2">
            <div className="px-4 py-3 rounded-xl bg-violet-950/15 border border-violet-500/10">
              <p className="text-[10px] text-violet-400 uppercase tracking-wider mb-1">Crewmate</p>
              <p className="text-sm text-slate-200 leading-relaxed">{room.currentPrompt.crew}</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-red-950/15 border border-red-500/10">
              <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Impostor</p>
              <p className="text-sm text-slate-200 leading-relaxed">{room.currentPrompt.impostor}</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} className="w-full flex flex-col gap-2 mt-2">
          {isHost ? (
            <Button fullWidth onClick={() => playAgain(room.code)}>
              Igraj ponovo
            </Button>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">
              Čekamo host-a za novu igru...
            </p>
          )}
          <Button variant="ghost" fullWidth onClick={handleLeave}>
            Napusti sobu
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
