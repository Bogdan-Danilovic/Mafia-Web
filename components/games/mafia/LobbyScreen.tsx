'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MafiaRoom, ROLE_TABLE } from '@/lib/types/mafia';
import { Button } from '@/components/ui/Button';
import { LobbyPlayerList } from '@/components/shared/LobbyPlayerList';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { startGame, leaveRoom } from '@/lib/firestore/mafia';
import { useRouter } from 'next/navigation';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

function DecryptCode({ code }: { code: string }) {
  const [revealed, setRevealed] = useState(0);
  const chars = 'ABCDEFGHKLMNPQRSTUVWXYZ23456789';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => {
    if (revealed >= code.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 120);
    return () => clearTimeout(t);
  });
  return (
    <span className="inline-flex tracking-[0.4em]">
      {code.split('').map((char, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={i < revealed ? 'text-red-400' : 'text-slate-600'}>
          {i < revealed ? char : chars[Math.floor(Math.random() * chars.length)]}
        </motion.span>
      ))}
    </span>
  );
}

const ROLE_ROWS: { count: number; roles: string }[] = [
  { count: 6,  roles: 'Boss, Mafijaš, Policajac, Doktor, 2× Civil' },
  { count: 7,  roles: 'Boss, Mafijaš, Policajac, Doktor, Osvetnik, 2× Civil' },
  { count: 8,  roles: '+ Dama' },
  { count: 10, roles: '+ još 1 Mafijaš' },
  { count: 12, roles: '+ još Civili' },
];

export function LobbyScreen({ room, playerId }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showRoles, setShowRoles] = useState(false);

  const isHost = room.hostId === playerId;
  const playerList = Object.values(room.players);
  const playerCount = playerList.length;
  const canStart = playerCount >= 6;

  const handleStart = useCallback(() => { setStarting(true); setCountdown(3); }, []);

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    await leaveRoom(room.code, playerId);
    localStorage.removeItem('playerId');
    router.push('/games/mafia');
  }

  // LobbyPlayerList expects players as array
  const playersArray = playerList.map((p) => ({
    id: p.id,
    name: p.name,
    isConnected: p.isConnected,
    isHost: p.id === room.hostId,
  }));

  return (
    <div className="relative flex flex-col flex-1 px-5 py-8 h-screen-safe overflow-y-auto"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-[400px] mx-auto flex flex-col gap-7 flex-1">

        {/* Room code */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5"
            style={{ backdropFilter: 'blur(12px)' }}>
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">Pristupni kod</p>
            <button onClick={copyCode} className="block cursor-pointer">
              <span className="text-[36px] font-bold">
                <DecryptCode code={room.code} />
              </span>
            </button>
            <div className="h-4 mt-1">
              <AnimatePresence mode="wait">
                {copied
                  ? <motion.span key="c" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[10px] text-emerald-400">Kopirano</motion.span>
                  : <motion.span key="h" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="text-[10px] text-slate-500">tapni da kopiraš</motion.span>
                }
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Players */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Igrači · {playerCount}</p>
            {!canStart && (
              <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}
                className="text-[10px] text-amber-400/70">
                čekamo još {6 - playerCount}
              </motion.p>
            )}
          </div>

          <div className="w-full h-px mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <motion.div
              className={`h-px ${canStart ? 'bg-emerald-500/50' : 'bg-amber-500/40'}`}
              animate={{ width: `${Math.min((playerCount / 6) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          </div>

          <LobbyPlayerList
            players={playersArray}
            selfId={playerId}
            hostId={room.hostId}
            canKick={false}
            onKick={() => {}}
          />
        </motion.div>

        {/* Role distribution info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <button
            onClick={() => setShowRoles((v) => !v)}
            className="flex items-center justify-between w-full py-2 text-[10px] text-slate-500 tracking-[0.2em] uppercase cursor-pointer"
          >
            <span>Raspodjela uloga</span>
            <span className="text-[12px]">{showRoles ? '▲' : '▼'}</span>
          </button>
          <AnimatePresence>
            {showRoles && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  {Object.entries(ROLE_TABLE).slice(0, 5).map(([cnt, roles], i) => (
                    <div key={cnt}
                      className="flex items-start gap-3 px-4 py-2.5"
                      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span className="shrink-0 text-[10px] font-bold text-red-400/70 w-5">{cnt}</span>
                      <span className="text-[10px] text-slate-500 leading-relaxed">{roles.join(', ')}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-600 mt-2 text-center">* 13–14 igrača: dodaju se Civili</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {!isHost && (
          <motion.p animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 3 }}
            className="text-[12px] text-slate-600 text-center py-4">
            Čekamo da host pokrene igru...
          </motion.p>
        )}

        <div className="mt-auto pt-4 flex flex-col gap-3">
          {isHost && (
            <Button
              fullWidth
              disabled={!canStart || starting}
              onClick={handleStart}
              className="!rounded-2xl !text-white"
              style={{
                background: canStart ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : undefined,
                boxShadow: canStart ? '0 4px 16px rgba(220,38,38,0.4)' : undefined,
              }}
            >
              {starting ? 'Pokretanje...' : canStart ? 'Pokreni igru' : `Još ${6 - playerCount} igrača`}
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={handleLeave} className="!rounded-2xl">
            Napusti
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {countdown !== null && (
          <CountdownTimer
            seconds={countdown}
            onEnd={() => { startGame(room.code); setCountdown(null); }}
            accentColor={ACCENT}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
