'use client';

import { motion } from 'framer-motion';
import { GameGrid } from '@/components/hub/GameGrid';
import { Particles } from '@/components/hub/Particles';

export default function HubPage() {
  return (
    <main className="relative flex flex-col items-center min-h-dvh px-4 py-12 sm:py-16 overflow-hidden">
      <Particles />

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="text-center mb-12 sm:mb-16 z-10"
      >
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 tracking-tight">
          🎮 GameHub
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-slate-400 text-base sm:text-lg"
        >
          Tvoj hub za društvene igre
        </motion.p>
      </motion.header>

      <div className="z-10 w-full">
        <GameGrid />
      </div>
    </main>
  );
}
