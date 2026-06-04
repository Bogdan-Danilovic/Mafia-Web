'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CambioRoom } from '@/lib/types/cambio';
import { CardComponent } from './CardComponent';
import { Button } from '@/components/shared/Button';
import { peekCard, blindSwap, peekAndSwap, skipPower } from '@/lib/firestore/cambio';
import { hexA } from '@/lib/utils';

const ACCENT = '#10b981';

interface Props {
  room: CambioRoom;
  playerId: string;
}

export function SpecialPowerModal({ room, playerId }: Props) {
  const rawPower = room.activePower;
  if (!rawPower) return null;
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (rawPower.sourcePlayerIndex !== playerIndex) return null;
  const power = rawPower;

  const [selectedMy, setSelectedMy] = useState<number | null>(null);
  const [selectedOppPlayer, setSelectedOppPlayer] = useState<number | null>(null);
  const [selectedOppCard, setSelectedOppCard] = useState<number | null>(null);

  const myPlayer = room.players[playerIndex];

  function getTitle() {
    if (power.type === 'peek_own') return '🔍 Poglej svoju kartu';
    if (power.type === 'peek_opponent') return '👁 Poglej tuđu kartu';
    if (power.type === 'blind_swap') return '🔀 Naslepo zameni';
    if (power.type === 'peek_and_swap' && power.step === 'peek') return '👁 Crni Kralj — Poglej';
    return '🔀 Crni Kralj — Zameni';
  }

  function getDesc() {
    if (power.type === 'peek_own') return 'Odaberi jednu od svojih karata da je pogledaš.';
    if (power.type === 'peek_opponent') return 'Odaberi kartu drugog igrača da je (tajno) pogledaš.';
    if (power.type === 'blind_swap') return 'Odaberi svoju kartu i kartu drugog igrača — zameniće se bez gledanja.';
    if (power.step === 'peek') return 'Pogledaj bilo čiju kartu (svoju ili tuđu).';
    return 'Sada možeš zameniti svoju kartu sa pogledanom kartom.';
  }

  async function handlePeekOwn(cardIdx: number) {
    await peekCard(room.code, playerId, playerIndex, cardIdx);
  }

  async function handlePeekOpp() {
    if (selectedOppPlayer === null || selectedOppCard === null) return;
    await peekCard(room.code, playerId, selectedOppPlayer, selectedOppCard);
  }

  async function handleBlindSwap() {
    if (selectedMy === null || selectedOppPlayer === null || selectedOppCard === null) return;
    await blindSwap(room.code, playerId, selectedMy, selectedOppPlayer, selectedOppCard);
  }

  async function handlePeekAndSwapPeek() {
    if (power.step !== 'peek') return;
    if (selectedOppPlayer === null || selectedOppCard === null) {
      if (selectedMy !== null) { await peekCard(room.code, playerId, playerIndex, selectedMy); return; }
      return;
    }
    await peekCard(room.code, playerId, selectedOppPlayer, selectedOppCard);
  }

  async function handlePeekAndSwapSwap() {
    if (selectedMy === null) return;
    await peekAndSwap(room.code, playerId, selectedMy);
  }

  const opponents = room.players.filter((_, i) => i !== playerIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5"
        style={{ background: 'linear-gradient(160deg,#0f1320 0%,#080b14 100%)', border: `1px solid ${hexA(ACCENT, 0.25)}` }}
      >
        <div className="text-center">
          <div className="text-xl font-extrabold text-white">{getTitle()}</div>
          <p className="text-sm text-white/50 mt-1">{getDesc()}</p>
        </div>

        {/* peek_own */}
        {power.type === 'peek_own' && (
          <div className="flex gap-3 justify-center flex-wrap">
            {myPlayer.cards.map((card, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <CardComponent card={card} playerId={playerId} selectable onClick={() => handlePeekOwn(i)} size="md" />
                <span className="text-[10px] text-white/30">karta {i + 1}</span>
              </div>
            ))}
          </div>
        )}

        {/* peek_opponent */}
        {power.type === 'peek_opponent' && (
          <div className="flex flex-col gap-3">
            {opponents.map((opp, oi) => {
              const realOppIndex = room.players.findIndex(p => p.id === opp.id);
              return (
                <div key={opp.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[11px] font-semibold text-white/40 mb-2">{opp.name}</p>
                  <div className="flex gap-2">
                    {opp.cards.map((card, ci) => (
                      <CardComponent key={ci} card={card} playerId={playerId}
                        selected={selectedOppPlayer === realOppIndex && selectedOppCard === ci}
                        selectable
                        onClick={() => { setSelectedOppPlayer(realOppIndex); setSelectedOppCard(ci); }}
                        size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
            <Button fullWidth disabled={selectedOppPlayer === null || selectedOppCard === null} onClick={handlePeekOpp}
              style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})` }} className="!text-white !rounded-2xl">
              Poglej
            </Button>
          </div>
        )}

        {/* blind_swap */}
        {power.type === 'blind_swap' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] font-semibold text-white/40 mb-2">Tvoja karta</p>
              <div className="flex gap-2">
                {myPlayer.cards.map((card, i) => (
                  <CardComponent key={i} card={card} playerId={playerId} selected={selectedMy === i} selectable onClick={() => setSelectedMy(i)} size="sm" />
                ))}
              </div>
            </div>
            {opponents.map(opp => {
              const realOppIndex = room.players.findIndex(p => p.id === opp.id);
              return (
                <div key={opp.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[11px] font-semibold text-white/40 mb-2">{opp.name}</p>
                  <div className="flex gap-2">
                    {opp.cards.map((card, ci) => (
                      <CardComponent key={ci} card={card} playerId={playerId}
                        selected={selectedOppPlayer === realOppIndex && selectedOppCard === ci}
                        selectable
                        onClick={() => { setSelectedOppPlayer(realOppIndex); setSelectedOppCard(ci); }}
                        size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
            <Button fullWidth disabled={selectedMy === null || selectedOppPlayer === null || selectedOppCard === null} onClick={handleBlindSwap}
              style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})` }} className="!text-white !rounded-2xl">
              Zameni
            </Button>
          </div>
        )}

        {/* peek_and_swap */}
        {power.type === 'peek_and_swap' && power.step === 'peek' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] font-semibold text-white/40 mb-2">Tvoje karte</p>
              <div className="flex gap-2">
                {myPlayer.cards.map((card, i) => (
                  <CardComponent key={i} card={card} playerId={playerId} selected={selectedMy === i} selectable onClick={() => { setSelectedMy(i); setSelectedOppPlayer(null); setSelectedOppCard(null); }} size="sm" />
                ))}
              </div>
            </div>
            {opponents.map(opp => {
              const realOppIndex = room.players.findIndex(p => p.id === opp.id);
              return (
                <div key={opp.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[11px] font-semibold text-white/40 mb-2">{opp.name}</p>
                  <div className="flex gap-2">
                    {opp.cards.map((card, ci) => (
                      <CardComponent key={ci} card={card} playerId={playerId}
                        selected={selectedOppPlayer === realOppIndex && selectedOppCard === ci}
                        selectable
                        onClick={() => { setSelectedOppPlayer(realOppIndex); setSelectedOppCard(ci); setSelectedMy(null); }}
                        size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
            <Button fullWidth disabled={(selectedMy === null && selectedOppPlayer === null)} onClick={handlePeekAndSwapPeek}
              style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})` }} className="!text-white !rounded-2xl">
              Poglej
            </Button>
          </div>
        )}

        {power.type === 'peek_and_swap' && power.step === 'swap' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-white/60 text-center">Odaberi svoju kartu za zamenu (ili preskoči)</p>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[11px] font-semibold text-white/40 mb-2">Tvoje karte</p>
              <div className="flex gap-2">
                {myPlayer.cards.map((card, i) => (
                  <CardComponent key={i} card={card} playerId={playerId} selected={selectedMy === i} selectable onClick={() => setSelectedMy(i)} size="sm" />
                ))}
              </div>
            </div>
            <Button fullWidth disabled={selectedMy === null} onClick={handlePeekAndSwapSwap}
              style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})` }} className="!text-white !rounded-2xl">
              Zameni
            </Button>
            <Button variant="ghost" fullWidth onClick={() => skipPower(room.code, playerId)}>Preskoči zamenu</Button>
          </div>
        )}

        <Button variant="ghost" fullWidth onClick={() => skipPower(room.code, playerId)} className="!text-white/30 !text-xs">
          Preskoči moć
        </Button>
      </motion.div>
    </div>
  );
}
