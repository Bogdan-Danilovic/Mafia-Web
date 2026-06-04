'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CambioRoom } from '@/lib/types/cambio';
import { CardComponent } from './CardComponent';
import { trySnap, closeSnapWindow } from '@/lib/firestore/cambio';
import { SNAP_WINDOW_MS } from './constants';
import { hexA } from '@/lib/utils';

const ACCENT = '#10b981';

interface Props {
  room: CambioRoom;
  playerId: string;
  isHost: boolean;
}

export function SnapOverlay({ room, playerId, isHost }: Props) {
  const snap = room.snapWindow;
  const [progress, setProgress] = useState(100);
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  const player = playerIndex >= 0 ? room.players[playerIndex] : null;

  useEffect(() => {
    if (!snap?.open || snap.winner) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - snap.openedAt;
      const remaining = Math.max(0, 1 - elapsed / SNAP_WINDOW_MS);
      setProgress(remaining * 100);
      if (remaining <= 0 && isHost) closeSnapWindow(room.code);
    }, 50);
    return () => clearInterval(interval);
  }, [snap, isHost, room.code]);

  if (!snap?.open) return null;

  const topCard = room.discardPile[room.discardPile.length - 1];
  const myMatchingCards = player?.cards
    .map((c, i) => ({ card: c, index: i }))
    .filter(({ card }) => card.rank === snap.discardedRank) ?? [];

  const isWinner = snap.winner === playerId;
  const isPenalty = snap.winner?.startsWith('penalty:');
  const isDone = !!snap.winner;

  return (
    <AnimatePresence>
      {snap.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-[320px] rounded-3xl p-6 flex flex-col items-center gap-4"
            style={{ background: 'linear-gradient(160deg,#0f1320 0%,#080b14 100%)', border: `1px solid ${hexA(ACCENT, 0.3)}`, boxShadow: `0 0 40px ${hexA(ACCENT, 0.2)}` }}
          >
            {!isDone ? (
              <>
                <div className="text-center">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-2xl font-extrabold text-white mb-1">⚡ Snap!</motion.div>
                  <p className="text-sm text-white/50">Zalepi kartu vrednosti <span className="font-bold text-white">{snap.discardedRank}</span></p>
                </div>

                {topCard && (
                  <CardComponent card={topCard} playerId={playerId} revealed size="md" />
                )}

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.05 }}
                    style={{ background: progress > 50 ? ACCENT : progress > 25 ? '#f59e0b' : '#ef4444' }} />
                </div>

                {myMatchingCards.length > 0 ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <p className="text-[12px] text-emerald-400 font-semibold">Imaš kartu! Tapni da zalepiš:</p>
                    <div className="flex gap-3 justify-center">
                      {myMatchingCards.map(({ card, index }) => (
                        <CardComponent key={index} card={card} playerId={playerId} revealed selectable onClick={() => trySnap(room.code, playerId, index)} size="md" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-white/30">Nemaš kartu iste vrednosti</p>
                )}
              </>
            ) : isWinner ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <div className="text-4xl mb-2">⚡</div>
                <div className="text-xl font-extrabold text-emerald-400">Snap!</div>
                <p className="text-sm text-white/60 mt-1">Karta uklonjena</p>
              </motion.div>
            ) : isPenalty ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <div className="text-4xl mb-2">💀</div>
                <div className="text-xl font-extrabold text-red-400">Pogrešan Snap!</div>
                <p className="text-sm text-white/60 mt-1">Kaznena karta dodeljena</p>
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <div className="text-xl font-extrabold text-white">
                  {room.players.find(p => p.id === snap.winner)?.name ?? ''} ⚡
                </div>
                <p className="text-sm text-white/60 mt-1">Snap!</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
