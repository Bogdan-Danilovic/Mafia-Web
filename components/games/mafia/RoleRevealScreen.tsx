'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { MafiaRoom, ROLE_TEAM, ROLE_LABEL, ROLE_ICON, Role } from '@/lib/types/mafia';
import { advanceToPlaying } from '@/lib/firestore/mafia';
import { Button } from '@/components/ui/Button';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

const ROLE_COLORS: Record<Role, { bg: string; border: string; text: string }> = {
  'mafia':      { bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.5)',   text: '#f87171' },
  'mafia-boss': { bg: 'rgba(220,38,38,0.15)',   border: 'rgba(220,38,38,0.6)',   text: '#ef4444' },
  'dama':       { bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.5)',  text: '#f9a8d4' },
  'policajac':  { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.5)',  text: '#93c5fd' },
  'doktor':     { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.5)',  text: '#6ee7b7' },
  'osvetnik':   { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.5)',  text: '#fdba74' },
  'civil':      { bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' },
};

function getAllyInfo(role: Role, players: Record<string, { id: string; name: string; role: Role | null }>): string[] {
  const lines: string[] = [];
  const all = Object.values(players);

  if (role === 'mafia' || role === 'mafia-boss' || role === 'dama') {
    const boss = all.find((p) => p.role === 'mafia-boss');
    const mafia = all.filter((p) => p.role === 'mafia');
    const dama = all.find((p) => p.role === 'dama');
    if (boss) lines.push(`Boss: ${boss.name}`);
    if (mafia.length) lines.push(`Mafijaši: ${mafia.map((p) => p.name).join(', ')}`);
    if (dama) lines.push(`Dama: ${dama.name}`);
  }

  if (role === 'osvetnik') {
    lines.push('Napadaš mafijaša → gubiš moć, ali živiš');
    lines.push('Napadaš civila → ti umireš');
    lines.push('Mafija napada tebe → obostrana smrt');
  }

  return lines;
}

export function RoleRevealScreen({ room, playerId }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);
  const holdProgress = useMotionValue(0);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const me = room.players[playerId];
  const myRole = me?.role ?? null;
  const isHost = room.hostId === playerId;
  const colors = myRole ? ROLE_COLORS[myRole] : ROLE_COLORS['civil'];
  const allies = myRole ? getAllyInfo(myRole, room.players) : [];

  const barWidth = useTransform(holdProgress, [0, 1], ['0%', '100%']);
  const barColor = useTransform(
    holdProgress, [0, 0.5, 1],
    [`${colors.border.replace(')', ', 0.3)')}`, colors.border, colors.text]
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
      {/* Ambient glow */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          background: revealed
            ? `radial-gradient(ellipse at center, ${colors.bg} 0%, transparent 70%)`
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
          Tvoja Uloga
        </motion.p>

        {/* Hold card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 22 }}
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
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Progress bar */}
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
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-8"
                style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/5 rounded-2xl"
                  animate={{ opacity: [0.3, 0, 0.1, 0] }}
                  transition={{ duration: 0.3 }}
                />
                <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-3 relative z-10">Ti si</p>

                <div className="text-4xl mb-3 relative z-10">{myRole ? ROLE_ICON[myRole] : '👤'}</div>

                <h2
                  className="text-[32px] font-bold tracking-[-0.03em] mb-6 relative z-10 text-center"
                  style={{ color: colors.text, textShadow: `0 0 24px ${colors.border}` }}
                >
                  {myRole ? ROLE_LABEL[myRole] : 'Civil'}
                </h2>

                {allies.length > 0 && (
                  <div className="w-full relative z-10">
                    <div className="w-12 h-px mb-4 mx-auto" style={{ background: colors.border }} />
                    {allies.map((line, i) => (
                      <p key={i} className="text-[11px] text-center mb-1" style={{ color: colors.text, opacity: 0.8 }}>
                        {line}
                      </p>
                    ))}
                  </div>
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
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-slate-600">
            Ne pravi screenshot — zapamti svoju ulogu.
          </motion.p>
        )}

        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            <Button
              fullWidth
              onClick={() => advanceToPlaying(room.code)}
              className="!rounded-2xl !text-white"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
              }}
            >
              Svi su vidjeli → Započni Igru
            </Button>
          </motion.div>
        )}

        {!isHost && (
          <motion.p
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="text-[11px] text-slate-600"
          >
            Čekamo ostale igrače...
          </motion.p>
        )}
      </div>
    </div>
  );
}
