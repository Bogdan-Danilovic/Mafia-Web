'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SpicyGameState, SpicyClaim } from '@/lib/games/spicy/types';
import { SpicyAction } from '@/lib/games/spicy/gameEngine';
import { SpicyCardComponent } from '@/components/games/spicy/SpicyCard';
import { SpiceChip } from '@/components/games/spicy/SpiceChip';
import { ClaimModal } from '@/components/games/spicy/ClaimModal';
import { Button } from '@/components/ui/Button';

interface Props { state: SpicyGameState; dispatch: (a: SpicyAction) => void; }

export function PlayingScreen({ state, dispatch }: Props) {
  const [claimOpen, setClaimOpen] = useState(false);
  const player = state.players[state.currentPlayerIndex];

  function handlePlay(cardId: string, claim: SpicyClaim) {
    setClaimOpen(false);
    dispatch({ type: 'PLAY_CARD', cardId, claim });
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col px-5 py-5" style={{ background: '#080b14' }}>
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="rounded-xl px-3 py-1.5 text-sm font-bold text-white" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {player.name}
          </div>
          <div className="flex gap-2 text-xs text-white/40">
            <span>🏆 {player.trophies}</span>
            <span>🃏 {player.wonCards.length}</span>
          </div>
        </div>

        {/* Pile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-white/40">Paprena gomila</span>
            <span className="text-xs text-white/30">Špil: {state.drawPile.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-14 flex-shrink-0">
              {state.pile.length === 0 ? (
                <div className="h-full w-full rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center">
                  <span className="text-xs text-white/30">Prazna</span>
                </div>
              ) : (
                <>
                  {[...Array(Math.min(3, state.pile.length - 1))].map((_, i) => (
                    <div key={i} className="absolute h-full w-full rounded-xl"
                      style={{ background: 'linear-gradient(160deg,#1a0a0a,#0f0808)', border: '1.5px solid rgba(239,68,68,0.2)', transform: `translate(${(i + 1) * 2}px,${(i + 1) * -2}px)`, zIndex: i }} />
                  ))}
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(160deg,#1a0a0a,#0f0808)', border: '1.5px solid rgba(239,68,68,0.4)', zIndex: 10 }}>
                    <span className="text-xl">🌶️</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: '#ef4444', zIndex: 20 }}>
                    {state.pile.length}
                  </div>
                </>
              )}
            </div>
            <div className="flex-1">
              {state.lastClaim ? (
                <div>
                  <div className="text-xs text-white/40 mb-1">Poslednja objava</div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-white">{state.lastClaim.value}</span>
                    <SpiceChip spice={state.lastClaim.spice} size="md" />
                  </div>
                </div>
              ) : (
                <span className="text-sm text-white/30">{state.isFirstOnPile ? 'Prva karta — objavi 1, 2 ili 3' : 'Nema objave'}</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Trophies + player overview */}
        <div className="mb-4 flex items-center gap-3">
          {[0, 1, 2].map((i) => <span key={i} className="text-lg">{i < state.trophiesLeft ? '🏆' : '⬜'}</span>)}
          <span className="text-xs text-white/30">({state.trophiesLeft} trofeja)</span>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {state.players.map((p, i) => (
            <div key={p.id} className="flex-shrink-0 rounded-xl px-3 py-2 text-xs"
              style={{ background: i === state.currentPlayerIndex ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === state.currentPlayerIndex ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
              <div className="font-semibold text-white max-w-[80px] truncate">{p.name}</div>
              <div className="text-white/40 mt-0.5">{'🏆'.repeat(p.trophies)} ✋{p.hand.length}</div>
            </div>
          ))}
        </div>

        {/* Hand */}
        <div className="flex-1">
          <div className="mb-3 text-xs uppercase tracking-wider text-white/40">Tvoje karte ({player.hand.length})</div>
          <div className="flex flex-wrap gap-2">
            {player.hand.map((c) => <SpicyCardComponent key={c.id} card={c} faceUp size="md" />)}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button variant="ghost" className="flex-1 !border !border-white/15" onClick={() => dispatch({ type: 'PASS' })}>
            Dalje (+1)
          </Button>
          <Button className="flex-1" disabled={player.hand.length === 0} onClick={() => setClaimOpen(true)}
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}>
            🌶️ Odigraj
          </Button>
        </div>
      </div>

      {claimOpen && (
        <ClaimModal hand={player.hand} lastClaim={state.lastClaim} isFirstOnPile={state.isFirstOnPile} onConfirm={handlePlay} onClose={() => setClaimOpen(false)} />
      )}
    </>
  );
}
