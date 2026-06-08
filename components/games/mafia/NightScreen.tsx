'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MafiaRoom, MafiaPlayer, ROLE_LABEL, ROLE_ICON, NightAction } from '@/lib/types/mafia';
import { submitNightAction, processNightActions } from '@/lib/firestore/mafia';
import { Button } from '@/components/ui/Button';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

function PlayerPicker({
  players,
  label,
  excludeIds = [],
  onSelect,
  selected,
  disabled,
}: {
  players: MafiaPlayer[];
  label: string;
  excludeIds?: string[];
  onSelect: (id: string) => void;
  selected: string | null;
  disabled: boolean;
}) {
  const options = players.filter((p) => p.isAlive && !excludeIds.includes(p.id));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">{label}</p>
      {options.map((p, i) => {
        const isSelected = selected === p.id;
        return (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
            whileTap={{ scale: 0.98, x: 4 }}
            disabled={disabled}
            onClick={() => onSelect(p.id)}
            className="flex items-center gap-3 px-4 py-3.5 text-left rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40"
            style={{
              background: isSelected ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isSelected ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.05)'}`,
              boxShadow: isSelected ? '0 0 12px rgba(220,38,38,0.2)' : 'none',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? ACCENT2 : '#475569' }} />
            <span className="text-[13px] font-medium" style={{ color: isSelected ? '#f87171' : '#94a3b8' }}>
              {p.name}
            </span>
            {isSelected && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="ml-auto text-[10px] text-red-400"
              >
                ✓
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export function NightScreen({ room, playerId }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  const me = room.players[playerId];
  const myRole = me?.role ?? null;
  const isHost = room.hostId === playerId;
  const allPlayers = Object.values(room.players);
  const alivePlayers = allPlayers.filter((p) => p.isAlive);
  const isAlive = me?.isAlive ?? false;

  const isAlreadySubmitted = room.nightActionsReady[playerId] ?? false;

  // How many night actors have submitted
  const actorRoles = ['mafia-boss', 'dama', 'doktor', 'policajac', 'osvetnik'];
  const totalActors = alivePlayers.filter((p) => p.role && actorRoles.includes(p.role)).length;
  const submittedCount = Object.keys(room.nightActionsReady).length;
  const allDone = submittedCount >= totalActors;

  // Timer
  useEffect(() => {
    if (timerExpired || submitted) return;
    const t = setTimeout(() => setTimerExpired(true), room.settings.nightDuration * 1000);
    return () => clearTimeout(t);
  }, [room.settings.nightDuration, submitted, timerExpired]);

  // Host auto-processes when all done or timer expires
  useEffect(() => {
    if ((allDone || timerExpired) && isHost && !processing) {
      setProcessing(true);
      processNightActions(room.code).finally(() => setProcessing(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, timerExpired]);

  async function handleSubmit(targetId: string | null, actionType: NightAction['actionType']) {
    if (submitted || isAlreadySubmitted || !myRole) return;
    setSubmitted(true);
    const action: NightAction = {
      phase: room.nightPhase,
      actorId: playerId,
      targetId,
      actionType,
    };
    await submitNightAction(room.code, action);
  }

  // ─── Spectator (dead player) ───────────────────────────────────────────────
  if (!isAlive) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-8 h-screen-safe" style={{ background: '#040608' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="text-5xl mb-6 opacity-30">👁</div>
          <p className="text-[13px] text-slate-500 mb-2">Eliminisan si</p>
          <p className="text-[11px] text-slate-700">Gledaš kao spektator</p>
          <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-[300px]">
            {alivePlayers.map((p) => (
              <span key={p.id} className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-slate-500">
                {p.name}
              </span>
            ))}
          </div>
          <p className="text-[9px] text-slate-700 mt-3 uppercase tracking-[0.2em]">Živi igrači</p>
        </motion.div>
      </div>
    );
  }

  const hasNightAction = myRole && ['mafia-boss', 'dama', 'doktor', 'policajac', 'osvetnik'].includes(myRole);

  // ─── No night action (civil / mafia without kill role) ───────────────────
  if (!hasNightAction) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-8 h-screen-safe" style={{ background: '#040608' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="text-6xl mb-6"
          >
            🌙
          </motion.div>
          <p className="text-[14px] text-slate-400 mb-2">Mirno spavaš</p>
          <p className="text-[11px] text-slate-700">Čekaj jutro...</p>
        </motion.div>
      </div>
    );
  }

  const isDoneAction = submitted || isAlreadySubmitted;

  // ─── Osvetnik who lost power ───────────────────────────────────────────────
  if (myRole === 'osvetnik' && !me.avengerPowerActive) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-8 h-screen-safe" style={{ background: '#040608' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="text-5xl mb-6">⚔️</div>
          <p className="text-[14px] text-slate-400 mb-2">Moć izgubljena</p>
          <p className="text-[11px] text-slate-600">Mirno spavaš ovu noć</p>
        </motion.div>
      </div>
    );
  }

  // ─── Night action screens ──────────────────────────────────────────────────
  function getActionLabel(): string {
    switch (myRole) {
      case 'mafia-boss': return 'Biraš žrtvu noćas';
      case 'dama': return 'Ućutkuješ igrača';
      case 'doktor': return 'Štiti igrača';
      case 'policajac': return 'Ispituješ igrača';
      case 'osvetnik': return 'Napadat ćeš ili preskočiti';
      default: return '';
    }
  }

  function getActionType(): NightAction['actionType'] {
    switch (myRole) {
      case 'mafia-boss': return 'kill';
      case 'dama': return 'silence';
      case 'doktor': return 'protect';
      case 'policajac': return 'investigate';
      case 'osvetnik': return 'avenge';
      default: return 'skip';
    }
  }

  const excludeForDoktor = myRole === 'doktor' && !room.settings.allowSelfProtect && me.selfProtectUsed
    ? [playerId]
    : myRole === 'doktor' && !room.settings.allowSelfProtect
      ? [playerId]
      : [];

  const excludeForMafia = myRole === 'mafia-boss'
    ? Object.values(room.players).filter((p) => p.role === 'mafia' || p.role === 'mafia-boss' || p.role === 'dama').map((p) => p.id)
    : [];

  return (
    <div className="flex flex-col flex-1 px-5 py-10 h-screen-safe overflow-y-auto" style={{ background: '#040608' }}>
      <div className="w-full max-w-[360px] mx-auto flex flex-col gap-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="text-3xl mb-3">🌙</div>
          <h2 className="text-[22px] font-bold text-white tracking-[-0.03em]">Noć {room.nightPhase}</h2>
          <p className="text-[11px] text-slate-500 mt-1">{getActionLabel()}</p>
        </motion.div>

        {/* Progress */}
        <div className="flex justify-center">
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(220,38,38,0.08)" strokeWidth="2" />
              <motion.circle
                cx="24" cy="24" r="20" fill="none"
                stroke="rgba(220,38,38,0.6)"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeLinecap="round"
                animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - submittedCount / Math.max(totalActors, 1)) }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-red-400 tabular-nums">{submittedCount}</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isDoneAction ? (
            <motion.div key="action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <PlayerPicker
                players={alivePlayers}
                label="Odaberi igrača"
                excludeIds={myRole === 'mafia-boss' ? excludeForMafia : myRole === 'doktor' ? excludeForDoktor : []}
                onSelect={setSelected}
                selected={selected}
                disabled={isDoneAction}
              />

              <Button
                fullWidth
                disabled={!selected || isDoneAction}
                onClick={() => handleSubmit(selected, getActionType())}
                className="!rounded-2xl !text-white mt-2"
                style={{
                  background: selected ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : undefined,
                  boxShadow: selected ? '0 4px 16px rgba(220,38,38,0.4)' : undefined,
                }}
              >
                Potvrdi
              </Button>

              {myRole === 'osvetnik' && (
                <button
                  onClick={() => handleSubmit(null, 'skip')}
                  className="py-2.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
                >
                  Preskoči ovu noć
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-8"
            >
              <div className="text-2xl">✓</div>
              <p className="text-[13px] text-slate-400">Akcija zabilježena</p>
              <motion.p
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="text-[11px] text-slate-700"
              >
                čekamo ostale...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mafia boss sees who other mafia voted for */}
        {myRole === 'mafia-boss' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
            <p className="text-[9px] text-slate-600 tracking-[0.2em] uppercase mb-3">Tim</p>
            {Object.values(room.players)
              .filter((p) => p.role === 'mafia' && p.isAlive)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="text-[12px] text-slate-400">{p.name}</span>
                  <span className="text-[10px]" style={{ color: p.nightActionSubmitted ? '#ef4444' : '#475569' }}>
                    {p.nightActionSubmitted ? 'spreman' : 'čeka...'}
                  </span>
                </div>
              ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
