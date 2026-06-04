'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CambioRoom } from '@/lib/types/cambio';
import { CardComponent } from './CardComponent';
import { SnapOverlay } from './SnapOverlay';
import { SpecialPowerModal } from './SpecialPowerModal';
import { Button } from '@/components/shared/Button';
import {
  drawCard, swapAndDiscard, discardDirectly, callCambio,
} from '@/lib/firestore/cambio';
import { getCardValue } from './constants';
import { getAiAction } from './ai';
import { hexA } from '@/lib/utils';

const ACCENT = '#10b981';
const AI_DELAY = 1400;

interface Props {
  room: CambioRoom;
  playerId: string;
  isHost: boolean;
}

export function GameScreen({ room, playerId, isHost }: Props) {
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  const currentPlayer = room.players[room.currentPlayerIndex];
  const isMyTurn = room.currentPlayerIndex === playerIndex;
  const myPlayer = playerIndex >= 0 ? room.players[playerIndex] : null;
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI logic — host runs AI turns
  useEffect(() => {
    if (!isHost) return;
    const cp = room.players[room.currentPlayerIndex];
    if (!cp?.isAI) return;
    if (room.snapWindow?.open && !room.snapWindow.winner) return;
    if (room.activePower && room.activePower.sourcePlayerIndex === room.currentPlayerIndex) {
      // AI handles power
      aiTimerRef.current = setTimeout(async () => {
        const action = getAiAction(room, cp.id);
        if (!action) return;
        if (action.type === 'power_peek') {
          const { peekCard } = await import('@/lib/firestore/cambio');
          const tp = action.targetPlayerIndex ?? room.currentPlayerIndex;
          const tc = action.targetCardIndex ?? 0;
          await peekCard(room.code, cp.id, tp, tc);
        } else if (action.type === 'power_swap') {
          const { blindSwap, peekAndSwap, skipPower } = await import('@/lib/firestore/cambio');
          const power = room.activePower;
          if (!power) return;
          if (power.type === 'blind_swap') {
            await blindSwap(room.code, cp.id, action.cardIndex ?? 0, action.targetPlayerIndex ?? 0, action.targetCardIndex ?? 0);
          } else if (power.type === 'peek_and_swap') {
            if (power.step === 'swap') await peekAndSwap(room.code, cp.id, action.cardIndex ?? 0);
            else await skipPower(room.code, cp.id);
          } else {
            await skipPower(room.code, cp.id);
          }
        }
      }, AI_DELAY);
      return;
    }

    aiTimerRef.current = setTimeout(async () => {
      const action = getAiAction(room, cp.id);
      if (!action) return;
      if (action.type === 'cambio') { await callCambio(room.code, cp.id); return; }
      if (action.type === 'draw') { await drawCard(room.code, cp.id); return; }
      if (action.type === 'swap' && action.cardIndex !== undefined) {
        await swapAndDiscard(room.code, cp.id, action.cardIndex); return;
      }
      if (action.type === 'discard') { await discardDirectly(room.code, cp.id); return; }
    }, AI_DELAY);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [room.currentPlayerIndex, room.drawnCard, room.activePower, room.snapWindow, isHost]); // eslint-disable-line

  async function handleDraw() {
    if (!isMyTurn || room.drawnCard) return;
    await drawCard(room.code, playerId);
  }

  async function handleSwapSelect(cardIdx: number) {
    if (!isMyTurn || !room.drawnCard) return;
    await swapAndDiscard(room.code, playerId, cardIdx);
    setSwapTarget(null);
  }

  async function handleDiscardDirectly() {
    if (!isMyTurn || !room.drawnCard) return;
    await discardDirectly(room.code, playerId);
  }

  async function handleCambio() {
    if (!isMyTurn || room.drawnCard) return;
    await callCambio(room.code, playerId);
  }

  if (!myPlayer) return null;

  const topDiscard = room.discardPile[room.discardPile.length - 1];
  const isLastRound = room.status === 'last_round';
  const showPower = !!room.activePower && room.activePower.sourcePlayerIndex === playerIndex;
  const showSnap = !!room.snapWindow?.open;

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative" style={{ background: '#080b14' }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}`, animation: 'gh-pulse 2s ease-in-out infinite' }} />
          <span className="text-[12px] font-semibold text-white/60">
            {isLastRound ? '⚡ Poslednji krug' : `Krug ${room.roundNumber}`}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={currentPlayer.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            className="text-[13px] font-bold" style={{ color: isMyTurn ? ACCENT : 'rgba(255,255,255,0.5)' }}>
            {isMyTurn ? 'Tvoj red' : `${currentPlayer.name}...`}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Opponent hands */}
      <div className="flex flex-col gap-2 px-4 py-2">
        {room.players.filter((_, i) => i !== playerIndex).map((opp, oi) => {
          const isTheirTurn = room.players.findIndex(p => p.id === opp.id) === room.currentPlayerIndex;
          return (
            <div key={opp.id} className="flex items-center gap-3 rounded-2xl px-3 py-2"
              style={{ background: isTheirTurn ? hexA(ACCENT, 0.08) : 'rgba(255,255,255,0.03)', border: `1px solid ${isTheirTurn ? hexA(ACCENT, 0.2) : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.3s' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[12px] font-semibold text-white/70 truncate">{opp.name}</span>
                  {opp.isAI && <span className="text-[9px] text-blue-400/60 uppercase">cpu</span>}
                  {isTheirTurn && <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="text-[10px]" style={{ color: ACCENT }}>▶</motion.span>}
                </div>
                <div className="flex gap-1.5">
                  {opp.cards.map((card, ci) => (
                    <CardComponent key={ci} card={card} playerId={playerId} size="sm" />
                  ))}
                  {opp.penaltyCount > 0 && (
                    <div className="flex items-center justify-center w-[48px] h-[68px] rounded-lg border border-red-500/30 bg-red-900/20">
                      <span className="text-[11px] font-bold text-red-400">+{opp.penaltyCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Center — draw pile + discard */}
      <div className="flex items-center justify-center gap-8 py-4">
        {/* Draw pile */}
        <div className="flex flex-col items-center gap-1">
          <motion.button
            whileHover={isMyTurn && !room.drawnCard ? { scale: 1.05 } : undefined}
            whileTap={isMyTurn && !room.drawnCard ? { scale: 0.95 } : undefined}
            onClick={handleDraw}
            disabled={!isMyTurn || !!room.drawnCard}
            className="relative w-[60px] h-[84px] rounded-lg cursor-pointer disabled:cursor-default"
            style={{ background: 'linear-gradient(135deg,#0f1320,#161b2e)', border: `1px solid ${isMyTurn && !room.drawnCard ? hexA(ACCENT, 0.4) : 'rgba(255,255,255,0.1)'}`, boxShadow: isMyTurn && !room.drawnCard ? `0 0 16px ${hexA(ACCENT, 0.3)}` : 'none' }}
          >
            <div className="absolute inset-[3px] rounded-md opacity-20"
              style={{ background: `repeating-linear-gradient(45deg,${ACCENT} 0px,${ACCENT} 1px,transparent 1px,transparent 6px),repeating-linear-gradient(-45deg,${ACCENT} 0px,${ACCENT} 1px,transparent 1px,transparent 6px)` }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg opacity-30">🃏</span>
            </div>
          </motion.button>
          <span className="text-[11px] text-white/30">{room.drawPile.length} karata</span>
        </div>

        {/* Discard pile */}
        <div className="flex flex-col items-center gap-1">
          {topDiscard ? (
            <CardComponent card={topDiscard} playerId={playerId} revealed size="md" />
          ) : (
            <div className="w-[60px] h-[84px] rounded-lg border border-dashed border-white/10" />
          )}
          <span className="text-[11px] text-white/30">bacanje</span>
        </div>
      </div>

      {/* Drawn card + actions */}
      <AnimatePresence>
        {room.drawnCard && isMyTurn && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="flex flex-col items-center gap-3 px-4 py-2">
            <p className="text-[12px] text-white/40">Izvučena karta:</p>
            <CardComponent card={room.drawnCard} playerId={playerId} revealed size="md" />
            <div className="flex gap-3 w-full max-w-[280px]">
              <Button variant="secondary" fullWidth onClick={handleDiscardDirectly} className="!rounded-2xl text-[13px]">
                Baci direktno
              </Button>
              <Button fullWidth onClick={() => setSwapTarget(-1)} disabled={swapTarget !== null}
                className="!rounded-2xl !text-white text-[13px]"
                style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})` }}>
                Zameni kartu
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap target selection */}
      <AnimatePresence>
        {swapTarget !== null && room.drawnCard && isMyTurn && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 px-4">
            <p className="text-[12px] text-emerald-400">Odaberi svoju kartu za zamenu:</p>
            <button onClick={() => setSwapTarget(null)} className="text-[11px] text-white/30 hover:text-white/60">otkaži</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My hand */}
      <div className="flex flex-col gap-2 px-4 pb-4 mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-white/50">Tvoje karte</span>
          {myPlayer.penaltyCount > 0 && (
            <span className="text-[11px] font-bold text-red-400">+{myPlayer.penaltyCount} kazna</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            {myPlayer.cards.map((card, i) => (
              <CardComponent
                key={i}
                card={card}
                playerId={playerId}
                selectable={swapTarget !== null}
                selected={swapTarget === i}
                onClick={swapTarget !== null ? () => handleSwapSelect(i) : undefined}
                size="md"
              />
            ))}
          </div>

          <div className="ml-auto flex flex-col gap-1.5">
            {isMyTurn && !room.drawnCard && !room.activePower && (
              <>
                <Button onClick={handleDraw} disabled={!!room.drawnCard}
                  className="!rounded-xl !px-4 !py-2 !text-xs !min-h-[36px] !text-white"
                  style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})`, boxShadow: `0 2px 8px ${hexA(ACCENT, 0.4)}` }}>
                  Vuci
                </Button>
                <Button variant="danger" onClick={handleCambio}
                  className="!rounded-xl !px-4 !py-2 !text-xs !min-h-[36px]">
                  Cambio!
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {showSnap && <SnapOverlay room={room} playerId={playerId} isHost={isHost} />}
      {showPower && !showSnap && <SpecialPowerModal room={room} playerId={playerId} />}
    </div>
  );
}
