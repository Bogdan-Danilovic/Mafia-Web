'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { AvalonRoom, AvalonPlayer } from '@/lib/types/avalon';
import { advanceFromRoleReveal } from '@/lib/firestore/avalon';
import { Button } from '@/components/ui/Button';

interface Props {
  room: AvalonRoom;
  playerId: string;
}

const ROLE_DISPLAY: Record<string, { name: string; emoji: string; color: string; glow: string }> = {
  merlin:   { name: 'Merlin',    emoji: '🧙', color: 'text-yellow-400', glow: 'rgba(245,158,11,0.4)' },
  assassin: { name: 'Asasin',    emoji: '🗡️', color: 'text-red-400',    glow: 'rgba(239,68,68,0.4)' },
  percival: { name: 'Percival',  emoji: '🛡️', color: 'text-blue-400',   glow: 'rgba(59,130,246,0.4)' },
  mordred:  { name: 'Mordred',   emoji: '👑', color: 'text-red-400',    glow: 'rgba(239,68,68,0.4)' },
  morgana:  { name: 'Morgana',   emoji: '🪄', color: 'text-red-400',    glow: 'rgba(239,68,68,0.4)' },
  oberon:   { name: 'Oberon',    emoji: '👁️', color: 'text-red-400',    glow: 'rgba(239,68,68,0.4)' },
  good:     { name: 'Vitez',     emoji: '⚔️', color: 'text-blue-400',   glow: 'rgba(59,130,246,0.4)' },
  evil:     { name: 'Sluga Zla', emoji: '🐍', color: 'text-red-400',    glow: 'rgba(239,68,68,0.4)' },
};

const ROLE_FLAVORS: Record<string, string> = {
  merlin:   'Znaš istinu, ali je ne smeš otkriti. Prepoznaješ zlo — čuvaj se Asasina.',
  percival: 'Vidiš dva lika u tami. Jedan je tvoj saveznik, drugi te vara.',
  good:     'Tvoja vera je tvoje jedino oružje. Veruj instinktu.',
  mordred:  'Merlin te ne vidi. Iskoristi tu prednost.',
  morgana:  'Percival misli da si Merlin. Igraj ulogu dobro.',
  assassin: 'Ako dobri pobede, imaš poslednji udarac — pogodi Merlina.',
  oberon:   'Zlo si, ali usamljeno. Ni tvoji te ne znaju.',
  evil:     'Služiš Mordreda. Sabotiraj misije, ali ostaj skriven.',
};

function getRoleInfo(me: AvalonPlayer, room: AvalonRoom): { lines: string[] } {
  const lines: string[] = [];

  if (me.role === 'merlin') {
    const evilVisible = room.players.filter((p) => p.loyalty === 'evil' && p.role !== 'mordred');
    if (evilVisible.length > 0) {
      lines.push('Zli igrači: ' + evilVisible.map((p) => p.name).join(', '));
    }
  }

  if (me.role === 'percival') {
    const targets = room.players.filter((p) => p.role === 'merlin' || p.role === 'morgana');
    if (targets.length > 0) {
      lines.push('Merlin je: ' + targets.map((p) => p.name).join(' ili '));
    }
  }

  if (me.loyalty === 'evil' && me.role !== 'oberon') {
    const allies = room.players.filter(
      (p) => p.loyalty === 'evil' && p.id !== me.id && p.role !== 'oberon'
    );
    if (allies.length > 0) {
      lines.push('Saveznici: ' + allies.map((p) => p.name).join(', '));
    }
  }

  return { lines };
}

export function RoleRevealScreen({ room, playerId }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);
  const holdProgress = useMotionValue(0);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = room.hostId === playerId;
  const me = room.players.find((p) => p.id === playerId);
  const role = me?.role ?? 'good';
  const loyalty = me?.loyalty ?? 'good';
  const display = ROLE_DISPLAY[role] ?? ROLE_DISPLAY.good;
  const isEvil = loyalty === 'evil';
  const info = me ? getRoleInfo(me, room) : { lines: [] };

  const barWidth = useTransform(holdProgress, [0, 1], ['0%', '100%']);
  const barColor = useTransform(holdProgress, [0, 0.5, 1],
    isEvil
      ? ['rgba(239,68,68,0.3)', 'rgba(239,68,68,0.6)', 'rgba(239,68,68,0.9)']
      : ['rgba(59,130,246,0.3)', 'rgba(59,130,246,0.6)', 'rgba(59,130,246,0.9)']
  );

  const startHold = useCallback(() => {
    if (revealed) return;
    holdRef.current = setInterval(() => {
      const current = holdProgress.get();
      if (current >= 1) {
        if (holdRef.current) clearInterval(holdRef.current);
        setRevealed(true);
        setHasSeen(true);
        return;
      }
      holdProgress.set(current + 0.02);
    }, 16);
  }, [revealed, holdProgress]);

  const stopHold = useCallback(() => {
    if (holdRef.current) clearInterval(holdRef.current);
    if (!revealed) holdProgress.set(0);
  }, [revealed, holdProgress]);

  const dismiss = useCallback(() => {
    setRevealed(false);
    holdProgress.set(0);
  }, [holdProgress]);

  useEffect(() => {
    return () => { if (holdRef.current) clearInterval(holdRef.current); };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          background: revealed
            ? `radial-gradient(ellipse at center, ${display.glow.replace('0.4', '0.06')} 0%, transparent 70%)`
            : 'none',
        }}
        transition={{ duration: 0.8 }}
      />

      <div className="relative w-full max-w-[320px] flex flex-col items-center gap-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-slate-500 tracking-[0.2em] uppercase"
        >
          Tvoja uloga
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 250, damping: 22 }}
          className="w-full aspect-[3/4] max-h-[440px] relative select-none touch-none"
          onPointerDown={revealed ? dismiss : startHold}
          onPointerUp={revealed ? undefined : stopHold}
          onPointerLeave={revealed ? undefined : stopHold}
          onPointerCancel={revealed ? undefined : stopHold}
        >
          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-surface/30 rounded-2xl overflow-hidden"
              >
                <motion.div
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: barWidth, backgroundColor: barColor as unknown as string }}
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="text-4xl mb-6 relative z-10"
                >
                  🔒
                </motion.div>
                <p className="text-[13px] text-slate-400 relative z-10">Zadrži da otključaš</p>
                <p className="text-[11px] text-slate-600 mt-1 relative z-10">svoju ulogu</p>
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-8 ${
                  isEvil ? 'bg-red-950/20' : 'bg-blue-950/15'
                }`}
                style={{ boxShadow: `0 0 40px ${display.glow}` }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/5 rounded-2xl"
                  animate={{ opacity: [0.3, 0, 0.1, 0] }}
                  transition={{ duration: 0.3 }}
                />

                <span className="text-5xl mb-4">{display.emoji}</span>

                <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">Ti si</p>

                <h2
                  className={`text-[36px] font-bold tracking-[-0.03em] mb-2 ${display.color}`}
                  style={{ textShadow: `0 0 20px ${display.glow}` }}
                >
                  {display.name}
                </h2>

                <p className={`text-[12px] mb-4 ${isEvil ? 'text-red-400/60' : 'text-blue-400/60'}`}>
                  {isEvil ? 'Sluga Zla' : 'Vitez Dobra'}
                </p>

                {ROLE_FLAVORS[role] && (
                  <p className="text-[12px] leading-relaxed text-slate-400 text-center px-2 mb-6">
                    {ROLE_FLAVORS[role]}
                  </p>
                )}

                {info.lines.length > 0 && (
                  <>
                    <div className="w-12 h-px bg-white/[0.06] mb-5" />
                    <div className="flex flex-col items-center gap-2">
                      {info.lines.map((line, i) => (
                        <p key={i} className="text-[13px] text-amber-300/80 text-center">
                          {line}
                        </p>
                      ))}
                    </div>
                  </>
                )}

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute bottom-6 text-[10px] text-slate-600"
                >
                  tapni da sakriješ
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {hasSeen && !revealed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <p className="text-[10px] text-slate-500">
              🔒 Zapamti svoju ulogu. Ne pravi screenshot.
            </p>
          </motion.div>
        )}

        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full"
          >
            <Button
              fullWidth
              onClick={() => advanceFromRoleReveal(room.code)}
              className="!bg-amber-600 hover:!bg-amber-500"
            >
              Svi su videli → Prva misija
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
