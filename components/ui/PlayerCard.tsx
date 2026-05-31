'use client';

import { motion } from 'framer-motion';
import { BasePlayer } from '@/lib/types/core';

interface Props {
  player: BasePlayer & { isAlive?: boolean };
  isHost: boolean;
  isSelf: boolean;
  canKick: boolean;
  onKick?: () => void;
  variant?: 'list' | 'grid';
}

export function PlayerCard({ player, isHost, isSelf, canKick, onKick, variant = 'list' }: Props) {
  const initials = player.name.slice(0, 2).toUpperCase();

  if (variant === 'grid') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: player.isConnected ? 1 : 0.35, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="group relative flex flex-col items-center gap-2.5 p-4 rounded-2xl"
        style={{
          background: isSelf
            ? 'linear-gradient(145deg, rgba(139,92,246,0.18), rgba(139,92,246,0.06))'
            : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: `1px solid ${isSelf ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)'}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isSelf ? '0 0 20px rgba(139,92,246,0.12)' : 'none',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold relative"
          style={{
            background: isSelf ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(255,255,255,0.08)',
            color: isSelf ? '#fff' : '#94a3b8',
          }}
        >
          {initials}
          {player.isConnected && (
            <motion.span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px]"
              style={{ background: isSelf ? '#8b5cf6' : '#10b981', borderColor: 'var(--bg-base)' }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />
          )}
        </div>

        <span
          className="text-[11px] font-semibold truncate w-full text-center leading-tight"
          style={{ color: isSelf ? '#c4b5fd' : '#cbd5e1' }}
        >
          {player.name}
        </span>

        {isHost && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            host
          </span>
        )}
        {isSelf && !isHost && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
            ti
          </span>
        )}

        {canKick && !isSelf && (
          <button
            onClick={onKick}
            className="touch-show absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
          >
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </motion.div>
    );
  }

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
        <div className={`w-2.5 h-2.5 rounded-full ${isSelf ? 'bg-violet-400' : player.isConnected ? 'bg-emerald-400/70' : 'bg-slate-700'}`} />
        {player.isConnected && (
          <motion.div
            className={`absolute inset-0 rounded-full ${isSelf ? 'bg-violet-400' : 'bg-emerald-400'}`}
            animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />
        )}
      </div>
      <span className={`text-[14px] font-medium ${isSelf ? 'text-violet-300' : 'text-slate-300'}`}>
        {player.name}
      </span>
      {isSelf && <span className="text-[9px] text-violet-500 tracking-[0.15em] uppercase">ti</span>}
      {isHost && <span className="text-[9px] text-amber-500/80 tracking-[0.15em] uppercase">host</span>}
      {!player.isConnected && <span className="text-[10px] text-slate-600 ml-auto">offline</span>}
      {canKick && !isSelf && (
        <button
          onClick={onKick}
          className="touch-show ml-auto flex items-center justify-center w-8 h-8 text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}
