'use client';

import { motion } from 'framer-motion';
import { Player } from '@/lib/types';

interface Props {
  player: Player;
  isHost: boolean;
  isSelf: boolean;
  canKick: boolean;
  onKick?: () => void;
}

const AVATARS = ['🦊', '🐺', '🦉', '🐙', '🦝', '🐸', '🦋', '🐧', '🦎', '🐬', '🦅', '🐻'];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function PlayerCard({ player, isHost, isSelf, canKick, onKick }: Props) {
  const avatarIndex = hashName(player.name) % AVATARS.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: player.isConnected ? 1 : 0.4,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        ${isSelf ? 'bg-violet-500/15 border border-violet-500/30' : 'bg-surface/60 border border-slate-600/30'}
      `}
    >
      <span className="text-xl">{AVATARS[avatarIndex]}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-100 truncate">
            {player.name}
          </span>
          {isSelf && (
            <span className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold">
              ti
            </span>
          )}
          {isHost && (
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
              👑 host
            </span>
          )}
        </div>
        {!player.isConnected && (
          <span className="text-[10px] text-slate-500">nije povezan</span>
        )}
      </div>

      {canKick && !isSelf && (
        <button
          onClick={onKick}
          className="flex items-center justify-center w-11 h-11 -mr-2 text-sm text-slate-500 hover:text-red-400 active:text-red-300 transition-colors rounded-lg"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}
