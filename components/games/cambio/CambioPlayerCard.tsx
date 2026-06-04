'use client';

import { motion } from 'framer-motion';
import { BasePlayer } from '@/lib/types/core';

interface Props {
  player: BasePlayer;
  isHost: boolean;
  isSelf: boolean;
  canKick?: boolean;
  onKick?: () => void;
}

export function PlayerCard({ player, isHost, isSelf, canKick, onKick }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: player.isConnected ? 1 : 0.3, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group flex items-center gap-3 py-2.5 relative"
    >
      <div className="relative flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${isSelf ? 'bg-emerald-400' : player.isAI ? 'bg-blue-400/70' : player.isConnected ? 'bg-emerald-400/70' : 'bg-slate-700'}`} />
        {(player.isConnected || player.isAI) && (
          <motion.div
            className={`absolute inset-0 rounded-full ${isSelf ? 'bg-emerald-400' : player.isAI ? 'bg-blue-400' : 'bg-emerald-400'}`}
            animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />
        )}
      </div>
      <span className={`text-[14px] font-medium ${isSelf ? 'text-emerald-300' : 'text-slate-300'}`}>{player.name}</span>
      {isSelf && <span className="text-[9px] text-emerald-500 tracking-[0.15em] uppercase">ti</span>}
      {isHost && <span className="text-[9px] text-emerald-500/80 tracking-[0.15em] uppercase">host</span>}
      {player.isAI && <span className="text-[9px] text-blue-400/80 tracking-[0.15em] uppercase">cpu</span>}
      {!player.isConnected && !player.isAI && <span className="text-[10px] text-slate-600 ml-auto">offline</span>}
      {canKick && !isSelf && !player.isAI && (
        <button onClick={onKick} className="touch-show ml-auto flex items-center justify-center w-8 h-8 text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
    </motion.div>
  );
}
