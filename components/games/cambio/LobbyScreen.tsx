'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus } from 'lucide-react';
import { CambioRoom } from '@/lib/types/cambio';
import { Button } from '@/components/shared/Button';
import { PlayerCard } from './CambioPlayerCard';
import { startGame, leaveRoom, addAI, removePlayer } from '@/lib/firestore/cambio';
import { hexA } from '@/lib/utils';

const ACCENT = '#10b981';
const fadeIn = (delay = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } });

export function LobbyScreen({ room, playerId }: { room: CambioRoom; playerId: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === playerId;
  const canStart = room.players.length >= 2;
  const canAddAI = room.players.length < 4 && isHost;

  function copyCode() { navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  async function handleStart() {
    if (!canStart || starting) return;
    setStarting(true);
    await startGame(room.code);
  }

  async function handleLeave() {
    await leaveRoom(room.code, playerId);
    router.push('/');
  }

  async function handleAddAI() {
    if (!canAddAI) return;
    await addAI(room.code);
  }

  async function handleKick(pid: string) {
    if (!isHost || pid === playerId) return;
    await removePlayer(room.code, pid);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col gap-6 px-5 pb-12 pt-20">

        <motion.div {...fadeIn(0.05)} className="rounded-3xl p-6 text-center"
          style={{ background: `linear-gradient(160deg,${hexA(ACCENT, 0.28)} 0%,rgba(0,0,0,0.85) 100%)`, border: `1px solid ${hexA(ACCENT, 0.25)}`, boxShadow: `0 20px 60px ${hexA(ACCENT, 0.25)}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-200/50">Pristupni kod</p>
          <button type="button" onClick={copyCode} className="mt-3 block w-full">
            <span className="text-[44px] font-extrabold tracking-[0.28em] text-emerald-400" style={{ textShadow: `0 0 28px ${hexA(ACCENT, 0.45)}` }}>{room.code}</span>
          </button>
          <div className="mt-1 h-4 text-[11px]">
            <AnimatePresence mode="wait">
              {copied
                ? <motion.span key="c" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-400">Kopirano</motion.span>
                : <motion.span key="h" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="text-emerald-100/50">tapni da kopiraš</motion.span>}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div {...fadeIn(0.15)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-lg font-extrabold tracking-[-0.3px] text-white">Igrači <span style={{ color: ACCENT }}>{room.players.length}</span><span className="text-white/30">/4</span></span>
            {room.players.length < 2 && (
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[11px] font-semibold" style={{ color: hexA(ACCENT, 0.7) }}>čekamo još {2 - room.players.length}</motion.span>
            )}
          </div>
          <div className="relative mb-5 h-px w-full bg-white/[0.06]">
            <motion.div className="absolute left-0 top-0 h-px" animate={{ width: `${Math.min((room.players.length / 4) * 100, 100)}%` }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} style={{ background: canStart ? '#10b981' : ACCENT }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <AnimatePresence mode="popLayout">
              {room.players.map(p => (
                <PlayerCard key={p.id} player={p} isHost={p.id === room.hostId} isSelf={p.id === playerId} canKick={isHost && p.id !== playerId} onKick={() => handleKick(p.id)} />
              ))}
            </AnimatePresence>
          </div>
          {canAddAI && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleAddAI}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-500/30 py-2.5 text-[13px] font-semibold text-blue-400/60 hover:text-blue-400 hover:border-blue-500/60 transition-colors">
              <Bot size={14} /><Plus size={12} />Dodaj CPU igrača
            </motion.button>
          )}
        </motion.div>

        <motion.div {...fadeIn(0.25)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-200/50">Info</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-white/50">Karte po igraču</span><span className="font-bold text-white/80">4 (2×2)</span></div>
            <div className="flex justify-between"><span className="text-white/50">Početni pregled</span><span className="font-bold text-white/80">2 karte (jednom)</span></div>
            <div className="flex justify-between"><span className="text-white/50">Snap prozor</span><span className="font-bold text-white/80">2 sekunde</span></div>
            <div className="flex justify-between"><span className="text-white/50">Cilj</span><span className="font-bold text-white/80">Najmanji zbir</span></div>
          </div>
        </motion.div>

        {!isHost && (
          <motion.p animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 3 }} className="py-1 text-center text-[12px] text-emerald-100/40">
            Čekamo da host pokrene igru...
          </motion.p>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-4">
          {isHost && (
            <Button fullWidth disabled={!canStart || starting} onClick={handleStart} className="!rounded-2xl !text-white"
              style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})`, boxShadow: `0 4px 16px ${hexA(ACCENT, 0.4)}` }}>
              {starting ? 'Pokretanje...' : canStart ? 'Pokreni igru' : `Još ${2 - room.players.length} igrača`}
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={handleLeave} className="!text-emerald-100/40 hover:!text-emerald-100/70">Napusti sobu</Button>
        </div>
      </div>
    </div>
  );
}
