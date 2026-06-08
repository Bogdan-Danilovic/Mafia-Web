'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MafiaRoom, ROLE_LABEL, ROLE_ICON, ROLE_TEAM } from '@/lib/types/mafia';
import { playAgain, leaveRoom } from '@/lib/firestore/mafia';
import { useAuth } from '@/hooks/useAuth';
import { recordGameResult } from '@/lib/firestore/players';
import { Button } from '@/components/ui/Button';
import { hexA } from '@/lib/utils';

interface Props { room: MafiaRoom; playerId: string; }

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

const WIN_COLORS: Record<string, { accent: string; accent2: string; label: string; icon: string }> = {
  mafia:     { accent: '#dc2626', accent2: '#ef4444', label: 'Mafija pobjeđuje', icon: '🔫' },
  civilians: { accent: '#10b981', accent2: '#34d399', label: 'Civili pobjeđuju',  icon: '🎉' },
  avenger:   { accent: '#f97316', accent2: '#fb923c', label: 'Osvetnik pobjeđuje', icon: '⚔️' },
  null:      { accent: '#475569', accent2: '#64748b', label: 'Igra prekinuta',     icon: '⚠️' },
};

export function FinishedScreen({ room, playerId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const hasSaved = useRef(false);

  const isHost = room.hostId === playerId;
  const winner = room.winner ?? 'null';
  const cfg = WIN_COLORS[winner];
  const me = room.players[playerId];
  const myRole = me?.role;
  const myTeam = myRole ? ROLE_TEAM[myRole] : null;
  const iWon = myTeam === room.winner;

  useEffect(() => {
    if (!user || hasSaved.current || room.winner === null) return;
    hasSaved.current = true;
    recordGameResult({
      playerId: user.uid,
      gameType: 'mafia',
      gameName: 'mafia',
      won: iWon,
      isHost,
      roomCode: room.code,
      gameKey: `${room.code}_${room.createdAt}`,
      playerNames: Object.values(room.players).map((p) => p.name),
    }).catch((e) => console.error('[stats] mafia', e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, room.winner]);

  async function handleLeave() {
    await leaveRoom(room.code, playerId);
    localStorage.removeItem('playerId');
    router.push('/games/mafia');
  }

  const allPlayers = Object.values(room.players);

  // Group players by team for display
  const mafiaSide = allPlayers.filter((p) => p.role && ROLE_TEAM[p.role] === 'mafia');
  const civilSide = allPlayers.filter((p) => p.role && ROLE_TEAM[p.role] === 'civilian');
  const neutralSide = allPlayers.filter((p) => p.role && ROLE_TEAM[p.role] === 'neutral');

  function renderGroup(label: string, players: typeof allPlayers, color: string) {
    if (!players.length) return null;
    return (
      <div>
        <p className="text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: `${color}80` }}>{label}</p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {players.map((p, i) => {
            const team = p.role ? ROLE_TEAM[p.role] : null;
            const isWinner = team === room.winner;
            return (
              <motion.div
                key={p.id}
                variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                className="flex items-center justify-between py-2.5 px-4"
                style={{
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: isWinner ? `${color}08` : 'transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isWinner ? color : '#334155' }} />
                  <span className="text-[12px] text-slate-300 font-medium">
                    {p.name}
                    {p.id === playerId && (
                      <span className="text-[8px] uppercase tracking-wider ml-2" style={{ color }}>ti</span>
                    )}
                    {!p.isAlive && (
                      <span className="text-[8px] text-slate-600 ml-1">✕</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {p.role && <span className="text-[13px]">{ROLE_ICON[p.role]}</span>}
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: isWinner ? color : '#334155' }}>
                    {p.role ? ROLE_LABEL[p.role] : '?'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 px-5 py-10 h-screen-safe overflow-y-auto"
      style={{ background: '#080b14' }}>
      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-6">
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">

          {/* Winner hero */}
          <motion.div
            variants={fadeUp}
            className="w-full rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${hexA(cfg.accent, 0.18)}, ${hexA(cfg.accent2, 0.08)})`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="p-6 text-center">
              <motion.p
                className="text-4xl mb-4"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
              >
                {cfg.icon}
              </motion.p>
              <h2
                className="text-[28px] font-bold tracking-[-0.03em] leading-tight"
                style={{ color: cfg.accent2, textShadow: `0 0 20px ${hexA(cfg.accent, 0.4)}` }}
              >
                {cfg.label}
              </h2>
              {room.winner === null && (
                <p className="text-[12px] text-slate-500 mt-2">Premalo igrača za nastavak</p>
              )}

              {/* Personal outcome */}
              {myTeam && (
                <div className="mt-4 px-3 py-2 rounded-lg inline-block"
                  style={{
                    background: iWon ? `${cfg.accent}18` : 'rgba(100,116,139,0.1)',
                    border: `1px solid ${iWon ? `${cfg.accent}50` : 'rgba(100,116,139,0.2)'}`,
                  }}>
                  <span className="text-[11px] font-semibold"
                    style={{ color: iWon ? cfg.accent2 : '#64748b' }}>
                    {iWon ? 'Pobijedio/la si' : 'Izgubio/la si'}
                    {myRole && ` — ${ROLE_LABEL[myRole]}`}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="flex justify-center gap-4 mt-5">
                {[
                  { v: allPlayers.filter((p) => !p.isAlive).length, l: 'eliminirani' },
                ].map((s, i) => (
                  <div key={i}
                    className="flex flex-col items-center px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.04]">
                    <p className="text-[16px] font-bold text-white tabular-nums">{s.v}</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-[0.15em] mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Role reveal groups */}
          <motion.div variants={fadeUp} className="flex flex-col gap-4">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.4 } } }}
              className="flex flex-col gap-4"
            >
              {renderGroup('Mafija', mafiaSide, '#ef4444')}
              {renderGroup('Civili', civilSide, '#10b981')}
              {renderGroup('Neutralni', neutralSide, '#f97316')}
            </motion.div>
          </motion.div>

          {/* Actions */}
          <motion.div variants={fadeUp} className="flex flex-col gap-2 mt-2">
            {isHost ? (
              <Button
                fullWidth
                onClick={() => playAgain(room.code)}
                className="!rounded-2xl !text-white"
                style={{
                  background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent2})`,
                  boxShadow: `0 4px 16px ${hexA(cfg.accent, 0.4)}`,
                }}
              >
                Nova igra
              </Button>
            ) : (
              <p className="text-[11px] text-slate-500 text-center py-2">Čekamo host-a...</p>
            )}
            <Button variant="ghost" fullWidth onClick={handleLeave} className="!rounded-2xl">
              Napusti
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
