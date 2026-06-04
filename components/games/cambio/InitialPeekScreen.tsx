'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CambioRoom } from '@/lib/types/cambio';
import { CardComponent } from './CardComponent';
import { Button } from '@/components/shared/Button';
import { confirmInitialPeek } from '@/lib/firestore/cambio';
import { hexA } from '@/lib/utils';
import { getCardValue } from './constants';

const ACCENT = '#10b981';

export function InitialPeekScreen({ room, playerId }: { room: CambioRoom; playerId: string }) {
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  const player = room.players[playerIndex];
  const alreadyReady = room.peekReady.includes(playerId);

  const [selected, setSelected] = useState<number[]>([]);
  const [peeking, setPeeking] = useState<number[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (alreadyReady) { setConfirmed(true); setPeeking([2, 3]); }
  }, [alreadyReady]);

  function toggleSelect(idx: number) {
    if (confirmed) return;
    setSelected(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx);
      if (prev.length >= 2) return prev;
      return [...prev, idx];
    });
  }

  async function handleConfirm() {
    if (selected.length < 2 || confirmed) return;
    setConfirmed(true);
    setPeeking(selected);
    await confirmInitialPeek(room.code, playerId, selected as [number, number]);
  }

  if (!player) return null;

  const waitingFor = room.players.filter(p => !p.isAI && !room.peekReady.includes(p.id) && p.id !== playerId);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-[380px] flex flex-col gap-6">

        <div className="text-center">
          <div className="text-2xl font-extrabold text-white mb-1">Pogledaj 2 karte</div>
          <p className="text-sm text-white/50">Odaberi 2 karte koje ćeš zapamtiti.<br />Ovo je tvoja jedina šansa!</p>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl p-5"
          style={{ background: `linear-gradient(135deg,${hexA(ACCENT, 0.12)} 0%,rgba(0,0,0,0.6) 100%)`, border: `1px solid ${hexA(ACCENT, 0.2)}` }}>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">{player.name}</p>
          <div className="grid grid-cols-2 gap-3 mx-auto w-fit">
            {player.cards.map((card, i) => {
              const isPeeking = peeking.includes(i);
              const isSelected = selected.includes(i);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <CardComponent
                    card={card}
                    playerId={playerId}
                    revealed={isPeeking}
                    selected={isSelected}
                    selectable={!confirmed}
                    peek={isPeeking}
                    onClick={() => toggleSelect(i)}
                  />
                  {isPeeking && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] font-bold text-center"
                      style={{ color: getCardValue(card.rank, card.suit) < 0 ? '#34d399' : getCardValue(card.rank, card.suit) === 0 ? '#818cf8' : 'rgba(255,255,255,0.6)' }}>
                      {card.rank}{card.suit} = {getCardValue(card.rank, card.suit)}
                    </motion.div>
                  )}
                  {!isPeeking && !confirmed && (
                    <span className="text-[10px] text-white/30">{isSelected ? '✓ odabrana' : `karta ${i + 1}`}</span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {!confirmed ? (
          <Button fullWidth disabled={selected.length < 2} onClick={handleConfirm}
            className="!rounded-2xl !text-white"
            style={{ background: selected.length < 2 ? undefined : `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})`, boxShadow: selected.length < 2 ? undefined : `0 4px 16px ${hexA(ACCENT, 0.4)}` }}>
            {selected.length < 2 ? `Odaberi još ${2 - selected.length}` : 'Zapamtio sam!'}
          </Button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="text-emerald-400 font-semibold text-sm mb-1">✓ Spremno</div>
            {waitingFor.length > 0 && (
              <motion.p animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[12px] text-white/40">
                Čekamo: {waitingFor.map(p => p.name).join(', ')}
              </motion.p>
            )}
          </motion.div>
        )}

        <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
          <p className="text-[11px] text-white/40 leading-relaxed">💡 Napomena: Karte su postavljene u 2×2 formaciji. Možeš gledati samo 2 karte <strong className="text-white/60">jednom</strong> pre početka igre. Koristi specijalne karte da vidiš više!</p>
        </div>
      </motion.div>
    </div>
  );
}
