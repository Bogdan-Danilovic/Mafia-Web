'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AliasRoom } from '@/lib/types/alias';
import { updateSettings, kickPlayer, startGame } from '@/lib/firestore/alias';
import { AdBanner } from '@/components/ads/AdBanner';
import { HostUnlockButton } from '@/components/ads/HostUnlockButton';
import { DonationModal } from '@/components/ads/DonationModal';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { hexA } from '@/lib/utils';

interface Props {
  room: AliasRoom;
  playerId: string;
}

const ACCENT = '#0891b2';
const ACCENT2 = '#06b6d4';
const DURATION_OPTIONS: Array<30 | 60 | 90> = [30, 60, 90];

function DecryptCode({ code }: { code: string }) {
  const [revealed, setRevealed] = useState(0);
  const chars = 'ABCDEFGHKLMNPQRSTUVWXYZ23456789';

  useEffect(() => {
    if (revealed >= code.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 120);
    return () => clearTimeout(t);
  }, [revealed, code.length]);

  return (
    <span className="inline-flex tracking-[0.4em]">
      {code.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={i < revealed ? 'text-cyan-400' : 'text-slate-600'}
        >
          {i < revealed ? char : chars[Math.floor(Math.random() * chars.length)]}
        </motion.span>
      ))}
    </span>
  );
}

export function LobbyScreen({ room, playerId }: Props) {
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [donationOpen, setDonationOpen] = useState(false);

  const isHost = room.hostId === playerId;
  const playerCount = room.players.length;
  const canStart = playerCount >= 2;

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { startGame(room.code); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, room.code]);

  const handleStart = useCallback(() => {
    setStarting(true);
    setCountdown(3);
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative flex flex-col flex-1 px-5 py-8 h-screen-safe overflow-y-auto no-scrollbar">
      <div className="w-full max-w-[400px] mx-auto flex flex-col gap-6 flex-1">

        {/* Room code card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-2">Pristupni kod</p>
          <button onClick={copyCode} className="block cursor-pointer">
            <span className="text-[36px] font-bold" style={{ textShadow: `0 0 30px ${hexA(ACCENT, 0.4)}` }}>
              <DecryptCode code={room.code} />
            </span>
          </button>
          <div className="h-4 mt-1">
            <AnimatePresence mode="wait">
              {copied
                ? <motion.span key="c" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[10px] text-emerald-400">Kopirano</motion.span>
                : <motion.span key="h" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="text-[10px] text-white/40">tapni da kopiraš</motion.span>
              }
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Players */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase">Igrači · {playerCount}</p>
            {playerCount < 2 && (
              <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}
                className="text-[10px] text-amber-400/70">
                čekamo još {2 - playerCount}
              </motion.p>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-px mb-4 bg-white/[0.04] overflow-hidden rounded-full">
            <motion.div
              className="h-px rounded-full"
              style={{ background: canStart ? `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})` : 'rgba(245,158,11,0.5)' }}
              animate={{ width: `${Math.min((playerCount / 2) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <AnimatePresence mode="popLayout">
              {room.players.map(p => (
                <PlayerCard key={p.id} player={p}
                  isHost={p.id === room.hostId} isSelf={p.id === playerId}
                  canKick={isHost && room.status === 'lobby'}
                  onKick={() => kickPlayer(room.code, p.id)}
                  variant="grid" />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Host settings */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.05] p-5"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            {/* Duration chips */}
            <div>
              <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-3">Trajanje runde</p>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(d => {
                  const active = room.settings.roundDuration === d;
                  return (
                    <button key={d} onClick={() => updateSettings(room.code, { roundDuration: d })}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 cursor-pointer"
                      style={{
                        background: active ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? hexA(ACCENT, 0.5) : 'rgba(255,255,255,0.06)'}`,
                        color: active ? '#fff' : '#64748b',
                        boxShadow: active ? `0 0 16px ${hexA(ACCENT, 0.35)}` : 'none',
                      }}>
                      {d}s
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target score stepper */}
            <div>
              <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-3">Poeni za pobjedu</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => updateSettings(room.code, { targetScore: Math.max(10, room.settings.targetScore - 5) })}
                  className="w-10 h-10 rounded-xl text-[18px] font-bold transition-all duration-200 active:scale-95 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}>
                  −
                </button>
                <span className="text-[24px] font-bold text-white tabular-nums w-12 text-center">
                  {room.settings.targetScore}
                </span>
                <button
                  onClick={() => updateSettings(room.code, { targetScore: Math.min(100, room.settings.targetScore + 5) })}
                  className="w-10 h-10 rounded-xl text-[18px] font-bold transition-all duration-200 active:scale-95 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}>
                  +
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {!isHost && (
          <motion.p animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 3 }}
            className="text-[12px] text-white/30 text-center py-4">
            Čekamo da host započne igru...
          </motion.p>
        )}

        <AdBanner slot="TODO_SLOT_LOBBY" format="horizontal" className="mt-2 rounded-xl overflow-hidden" />

        {isHost && (
          <div className="mt-1">
            <HostUnlockButton roomCode={room.code} />
          </div>
        )}

        <div className="mt-1">
          <button
            onClick={() => setDonationOpen(true)}
            className="w-full py-2.5 rounded-xl text-[11px] text-white/20 hover:text-white/40 transition-colors cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            Podržite razvoj — gledaj video
          </button>
        </div>

        <DonationModal isOpen={donationOpen} onClose={() => setDonationOpen(false)} />

        <div className="mt-auto pt-4">
          {isHost && (
            <button
              disabled={!canStart || starting}
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl text-[13px] font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: canStart && !starting ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${canStart && !starting ? hexA(ACCENT, 0.5) : 'rgba(255,255,255,0.06)'}`,
                boxShadow: canStart && !starting ? `0 4px 20px ${hexA(ACCENT, 0.35)}` : 'none',
              }}
            >
              {starting ? 'Pokretanje...' : canStart ? 'Započni igru' : `Još ${2 - playerCount} igrača`}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(8,11,20,0.95)' }}>
            <motion.span key={countdown}
              initial={{ scale: 4, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-[140px] font-bold leading-none tabular-nums"
              style={{ color: ACCENT2, textShadow: `0 0 40px ${hexA(ACCENT, 0.6)}` }}>
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
