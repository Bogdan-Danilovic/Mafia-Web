'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MafiaRoom } from '@/lib/types/mafia';
import { advanceToDayResults } from '@/lib/firestore/mafia';

interface Props { room: MafiaRoom; playerId: string; }

export function NightProcessingScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;

  useEffect(() => {
    if (!isHost) return;
    const t = setTimeout(() => advanceToDayResults(room.code), 2500);
    return () => clearTimeout(t);
  }, [isHost, room.code]);

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 h-screen-safe"
      style={{ background: '#040608' }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="text-6xl mb-6"
        >
          🌙
        </motion.div>

        <motion.p
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="text-[15px] text-slate-400 font-medium tracking-wide"
        >
          Grad spava...
        </motion.p>

        <motion.div
          className="flex gap-1.5 justify-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-red-500/40"
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
