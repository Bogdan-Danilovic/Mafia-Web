'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MafiaRoom, ROLE_LABEL, ROLE_ICON, ROLE_TEAM } from '@/lib/types/mafia';
import { killPlayer, finishGame } from '@/lib/firestore/mafia';
import { Button } from '@/components/ui/Button';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';

export function PlayingScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const me = room.players[playerId];
  const allPlayers = Object.values(room.players);
  const aliveCount = allPlayers.filter(p => p.isAlive).length;

  // ─── Player View ────────────────────────────────────────────────────────────
  if (!isHost) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-8 h-screen-safe" style={{ background: '#040608' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <motion.div
            animate={{ opacity: me?.isAlive ? [0.4, 0.8, 0.4] : 0.2 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="text-6xl mb-6"
          >
            {me?.isAlive ? (me?.role ? ROLE_ICON[me.role] : '👤') : '👻'}
          </motion.div>
          <p className="text-[14px] text-slate-400 mb-2">
            {me?.isAlive ? 'Igra je u toku' : 'Eliminisan si'}
          </p>
          <p className="text-[11px] text-slate-700">
            {me?.isAlive ? 'Prati upute naratora.' : 'Sada si duh. Gledaj i šuti.'}
          </p>
          
          {me?.isAlive && (
            <div className="mt-8 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]">
              <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase mb-1">Tvoja Uloga</p>
              <p className="text-[16px] font-bold text-white">{me?.role ? ROLE_LABEL[me.role] : 'Nepoznato'}</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ─── Host / Narrator View ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 px-5 py-8 h-screen-safe overflow-y-auto" style={{ background: '#040608' }}>
      <div className="w-full max-w-[400px] mx-auto flex flex-col gap-6 flex-1">
        
        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-1">Narator panel</p>
          <h2 className="text-[20px] font-bold text-white">Upravljanje Igrom</h2>
          <p className="text-[11px] text-slate-600 mt-1">Živih: {aliveCount} / {allPlayers.length}</p>
        </div>

        {/* Players List */}
        <div className="flex-1 flex flex-col gap-2">
          {allPlayers.map((p) => {
            const team = p.role ? ROLE_TEAM[p.role] : 'neutral';
            const color = team === 'mafia' ? '#ef4444' : team === 'civilian' ? '#10b981' : '#f97316';
            
            return (
              <div 
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                style={{ opacity: p.isAlive ? 1 : 0.4 }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-slate-200">{p.name}</span>
                    {!p.isAlive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">MRTAV</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[12px]">{p.role ? ROLE_ICON[p.role] : '👤'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.05em]" style={{ color }}>
                      {p.role ? ROLE_LABEL[p.role] : 'Nepoznato'}
                    </span>
                  </div>
                </div>
                
                {p.isAlive && (
                  <button
                    onClick={() => killPlayer(room.code, p.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                    title="Eliminiši"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Game End Actions */}
        <div className="flex flex-col gap-3 mt-4">
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase text-center">Završi Igru</p>
          <div className="flex gap-3">
            <Button
              className="flex-1 !rounded-xl !bg-red-500/10 !text-red-400 hover:!bg-red-500/20 !border !border-red-500/20"
              onClick={() => finishGame(room.code, 'mafia')}
            >
              Mafija pobjeđuje
            </Button>
            <Button
              className="flex-1 !rounded-xl !bg-emerald-500/10 !text-emerald-400 hover:!bg-emerald-500/20 !border !border-emerald-500/20"
              onClick={() => finishGame(room.code, 'civilians')}
            >
              Civili pobjeđuju
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
