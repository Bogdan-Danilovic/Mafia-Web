'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flip7Room } from '@/lib/types/flip7';
import { Button } from '@/components/ui/Button';
import { playAgain, leaveRoom } from '@/lib/firestore/flip7';

interface Props {
  room: Flip7Room;
  playerId: string;
}

export function GameOverScreen({ room, playerId }: Props) {
  const router = useRouter();
  const isHost = room.hostId === playerId;
  const winner = room.players.find((p) => p.id === room.winnerId);
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  async function handlePlayAgain() {
    await playAgain(room.code);
  }

  async function handleLeave() {
    await leaveRoom(room.code, playerId);
    router.push('/');
  }

  return (
    <div className="relative flex flex-col items-center flex-1 px-6 pt-20 pb-10 h-screen-safe overflow-y-auto">
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{ background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.10) 0%, transparent 70%)' }}
      />
      <div className="relative w-full max-w-[360px] my-auto flex flex-col items-center gap-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 12 }}
          className="text-center"
        >
          <span className="text-6xl block mb-3">🏆</span>
          <h2 className="text-[34px] font-bold text-amber-400" style={{ textShadow: '0 0 30px rgba(245,158,11,0.45)' }}>
            {winner ? winner.name : 'Kraj igre'}
          </h2>
          <p className="text-[13px] text-amber-100/60 mt-1">
            {winner ? `pobeđuje sa ${winner.totalScore} poena!` : 'igra je završena'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full flex flex-col gap-2"
        >
          <p className="text-[10px] text-amber-200/40 tracking-[0.2em] uppercase mb-1">Konačni poredak</p>
          {ranked.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.07 }}
              className="flex items-center justify-between py-2.5 px-4 rounded-xl"
              style={{ background: i === 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.025)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[13px] font-bold text-amber-200/40 tabular-nums w-4">{i + 1}</span>
                <span className="text-[14px] text-amber-50 truncate">{p.name}</span>
                {p.id === playerId && <span className="text-[9px] text-amber-400/70 uppercase">ti</span>}
              </div>
              <span className="text-[15px] font-bold text-amber-100 tabular-nums">{p.totalScore}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="w-full flex flex-col gap-3 pt-2"
        >
          {isHost && (
            <Button fullWidth onClick={handlePlayAgain} className="!bg-amber-500 !text-[#0a1626] hover:!bg-amber-400 active:!bg-amber-600">
              Igraj ponovo
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={handleLeave} className="!text-amber-100/50 hover:!text-amber-100/80">
            Napusti sobu
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
