'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flip7Room } from '@/lib/types/flip7';
import { Button } from '@/components/ui/Button';
import { Flip7PlayerPanel } from '@/components/games/flip7/Flip7PlayerPanel';
import {
  sayJosJednu,
  sayDosta,
  applyStop,
  applyOkreniTri,
  hostSkipTarget,
} from '@/lib/firestore/flip7';

interface Props {
  room: Flip7Room;
  playerId: string;
}

const PENDING_COPY: Record<'stop' | 'okreni_tri', { title: string; desc: string }> = {
  stop: { title: 'Izvučen STOP', desc: 'Izaberi ko se bezbedno zaustavlja (banka poene)' },
  okreni_tri: { title: 'Izvučen OKRENI TRI', desc: 'Izaberi ko mora da okrene tri karte' },
};

export function GameScreen({ room, playerId }: Props) {
  const [busy, setBusy] = useState(false);

  const target = room.players[room.currentTargetIndex];
  const pending = room.pendingAction;
  const me = room.players.find((p) => p.id === playerId);

  const myTurn = pending.type === null && target?.id === playerId && target?.status === 'active';
  const iResolve = pending.type !== null && pending.byPlayerId === playerId;
  const chooser = pending.byPlayerId ? room.players.find((p) => p.id === pending.byPlayerId) : null;
  const activePlayers = room.players.filter((p) => p.status === 'active');
  const focusedId = pending.type === null ? target?.id : pending.byPlayerId;

  const isHost = room.hostId === playerId;
  const blocker = focusedId ? room.players.find((p) => p.id === focusedId) : null;
  const canHostSkip = isHost && !!blocker && !blocker.isConnected;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex flex-col flex-1 h-screen-safe">
      {/* Top bar */}
      <div className="flex-shrink-0 px-5 pt-20 pb-3">
        <div className="flex items-center justify-between text-[11px] text-amber-200/50">
          <span className="tracking-[0.15em] uppercase">Runda {room.roundNumber}</span>
          <span className="tabular-nums">Cilj {room.settings.targetScore}</span>
          <span className="tabular-nums">Špil {room.deck.length}</span>
        </div>
        <AnimatePresence mode="wait">
          {room.lastEvent && (
            <motion.p
              key={room.lastEvent}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-2 text-[13px] text-amber-100/90 leading-snug min-h-[18px]"
            >
              {room.lastEvent}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4 flex flex-col gap-2">
        {room.players.map((p) => (
          <Flip7PlayerPanel
            key={p.id}
            player={p}
            isSelf={p.id === playerId}
            focused={p.id === focusedId}
          />
        ))}
      </div>

      {/* Action bar */}
      <div
        className="flex-shrink-0 px-5 pt-3 pb-8 border-t"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'rgba(7,13,24,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <AnimatePresence mode="wait">
          {canHostSkip ? (
            <motion.div key="host-skip" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
              <p className="text-[12px] text-amber-100/70 text-center">
                <span className="font-semibold text-amber-400">{blocker?.name ?? 'Igrač'}</span> nije povezan
                {pending.type
                  ? ` — treba da reši ${pending.type === 'stop' ? 'STOP' : 'OKRENI TRI'}`
                  : ' a na potezu je'}
              </p>
              <Button
                fullWidth
                disabled={busy}
                onClick={() => run(() => hostSkipTarget(room.code, playerId))}
                className="!bg-amber-500 !text-[#0a1626] hover:!bg-amber-400 active:!bg-amber-600"
              >
                Preskoči igrača
              </Button>
            </motion.div>
          ) : iResolve && pending.type ? (
            <motion.div key="resolve" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              <div>
                <p className="text-[12px] font-bold text-amber-400 tracking-wide uppercase">
                  {PENDING_COPY[pending.type].title}
                </p>
                <p className="text-[12px] text-amber-100/60">{PENDING_COPY[pending.type].desc}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activePlayers.map((p) => (
                  <button
                    key={p.id}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        pending.type === 'stop'
                          ? applyStop(room.code, p.id)
                          : applyOkreniTri(room.code, p.id)
                      )
                    }
                    className="min-h-[46px] px-4 py-2.5 rounded-xl text-[14px] font-semibold bg-amber-500/15 text-amber-200 border border-amber-500/30 active:bg-amber-500/30 hover:bg-amber-500/25 hover:border-amber-400 transition-colors disabled:opacity-40"
                  >
                    {p.id === playerId ? 'Ti' : p.name}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : pending.type ? (
            <motion.p key="wait-pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-amber-100/50 text-center py-3">
              {chooser?.name ?? 'Igrač'} bira metu za {pending.type === 'stop' ? 'STOP' : 'OKRENI TRI'}…
              {chooser && !chooser.isConnected && <span className="text-amber-100/30"> · nije povezan</span>}
            </motion.p>
          ) : myTurn ? (
            <motion.div key="my-turn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
              <Button
                fullWidth
                disabled={busy}
                onClick={() => run(() => sayJosJednu(room.code, playerId))}
                className="!bg-amber-500 !text-[#0a1626] hover:!bg-amber-400 active:!bg-amber-600"
              >
                Još jednu
              </Button>
              <Button
                fullWidth
                variant="secondary"
                disabled={busy}
                onClick={() => run(() => sayDosta(room.code, playerId))}
                className="!border-emerald-500/40 !text-emerald-300 hover:!border-emerald-400 hover:!text-emerald-200"
              >
                Dosta
              </Button>
            </motion.div>
          ) : me && me.status !== 'active' ? (
            <motion.p key="im-out" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-amber-100/40 text-center py-3">
              Sačekaj kraj runde…
            </motion.p>
          ) : (
            <motion.p key="other-turn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-3">
              <span className="text-[12px] text-amber-100/40">Na potezu </span>
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="text-[13px] font-semibold text-amber-300"
              >
                {target?.name ?? '—'}
              </motion.span>
              {target && !target.isConnected && (
                <span className="text-[12px] text-amber-100/30"> · nije povezan</span>
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
