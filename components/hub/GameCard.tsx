'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { GameDefinition } from '@/lib/games/registry';

const TILT_MAX = 10;

export function GameCard({ game, index }: { game: GameDefinition; index: number }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [TILT_MAX, -TILT_MAX]), { stiffness: 300, damping: 20 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-TILT_MAX, TILT_MAX]), { stiffness: 300, damping: 20 });

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current || !game.available) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    setHovered(false);
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: index * 0.08 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => game.available && setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => game.available && router.push(game.path)}
      style={{
        rotateX: game.available ? rotateX : 0,
        rotateY: game.available ? rotateY : 0,
        transformPerspective: 800,
      }}
      className={`relative rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden
        ${game.available
          ? 'cursor-pointer bg-white/[0.06] hover:border-white/20'
          : 'cursor-not-allowed bg-white/[0.03] grayscale opacity-60'
        }`}
    >
      {game.available && hovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 -z-10 blur-3xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${game.accentColor}30, transparent 70%)` }}
        />
      )}

      <div className="relative p-6 flex flex-col gap-4">
        <motion.div
          animate={hovered ? { scale: 1.15, rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-5xl w-fit"
        >
          {game.icon}
        </motion.div>

        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-slate-100">{game.name}</h3>
          {!game.available && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
              Uskoro
            </span>
          )}
        </div>

        <p className="text-sm text-slate-400 leading-relaxed">{game.description}</p>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{game.minPlayers}–{game.maxPlayers} igrača</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>{game.avgDuration}</span>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {game.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500">
              {tag}
            </span>
          ))}
        </div>

        {game.available ? (
          <motion.div
            animate={hovered ? { opacity: 1, y: 0 } : { opacity: 0.7, y: 4 }}
            className="mt-2 py-2.5 rounded-xl text-center text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}cc)` }}
          >
            Igraj
          </motion.div>
        ) : (
          <div className="mt-2 py-2.5 rounded-xl text-center text-sm font-medium text-slate-500 border border-white/5">
            🔒 Zaključano
          </div>
        )}
      </div>
    </motion.div>
  );
}
