'use client';

import { motion } from 'framer-motion';
import { MafiaRoom } from '@/lib/types/mafia';
import { advanceToDayVote } from '@/lib/firestore/mafia';
import { Button } from '@/components/ui/Button';

interface Props { room: MafiaRoom; playerId: string; }

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

export function DayResultsScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const me = room.players[playerId];
  const result = room.nightResult;
  const isSilenced = me?.isSilenced ?? false;

  // Build narrative events
  const events: { icon: string; text: string; color?: string }[] = [];

  if (!result) {
    events.push({ icon: '🌅', text: 'Jutro je. Sve je mirno.' });
  } else {
    if (result.killed.length === 0 && result.saved.length === 0) {
      events.push({ icon: '🌤', text: result.message });
    } else {
      if (result.saved.length > 0) {
        events.push({ icon: '💉', text: 'Doktor je spasio igrača noćas.', color: '#6ee7b7' });
      }
      if (result.killed.length > 0) {
        for (const id of result.killed) {
          const name = room.players[id]?.name ?? 'Igrač';
          events.push({ icon: '💀', text: `${name} nije preživio/la noć.`, color: '#f87171' });
        }
      }
      if (result.avengerDied && result.mafiaKillerDied) {
        events.push({ icon: '⚔️', text: 'Dve osobe su se sukobile ove noći.', color: '#fdba74' });
      }
      if (result.avengerLostPower) {
        events.push({ icon: '⚔️', text: 'Osvetnik je pogodio mafiju — ali gubi moć.', color: '#fdba74' });
      }
    }
  }

  // Policajac privately sees investigation result
  const isPolice = me?.role === 'policajac';
  const investigation = result?.investigation;

  return (
    <div className="relative flex flex-col flex-1 px-5 py-10 h-screen-safe overflow-y-auto"
      style={{ background: '#0f1320' }}>

      {/* Subtle red breathing orb */}
      <div
        className="breathing-orb"
        style={{
          width: '400px',
          height: '400px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
          background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[360px] mx-auto flex flex-col gap-6">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          <motion.div variants={fadeUp} className="text-center">
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">Jutro — Dan {room.round}</p>
            <h2 className="text-[28px] font-bold text-white tracking-[-0.03em]">Noćni izvještaj</h2>
          </motion.div>

          {/* Events */}
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {events.map((ev, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5"
              >
                <span className="text-xl shrink-0">{ev.icon}</span>
                <p
                  className="text-[13px] leading-relaxed font-medium"
                  style={{ color: ev.color ?? '#94a3b8' }}
                >
                  {ev.text}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Police investigation result */}
          {isPolice && investigation && (
            <motion.div
              variants={fadeUp}
              className="rounded-xl p-4"
              style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            >
              <p className="text-[9px] text-blue-400/60 tracking-[0.2em] uppercase mb-2">Tvoja privatna istraga</p>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-slate-300">
                  {room.players[investigation.targetId]?.name ?? 'Igrač'}
                </span>
                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                  style={{
                    background: investigation.result === 'mafia' ? 'rgba(220,38,38,0.15)' : 'rgba(16,185,129,0.15)',
                    color: investigation.result === 'mafia' ? '#f87171' : '#6ee7b7',
                  }}
                >
                  {investigation.result === 'mafia' ? 'MAFIJA' : 'NEVIN'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Silenced notice */}
          {isSilenced && (
            <motion.div
              variants={fadeUp}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.25)' }}
            >
              <span className="text-xl">🔇</span>
              <p className="text-[12px] text-pink-300/80">Ne možeš glasati danas — neko te je ućutkao.</p>
            </motion.div>
          )}

          {/* Alive players list */}
          <motion.div variants={fadeUp}>
            <p className="text-[9px] text-slate-600 tracking-[0.2em] uppercase mb-3">Živi igrači</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(room.players)
                .filter((p) => p.isAlive)
                .map((p) => (
                  <span
                    key={p.id}
                    className="text-[10px] px-2.5 py-1 rounded-md border border-white/[0.06] bg-white/[0.03] text-slate-500"
                  >
                    {p.name}
                    {p.isSilenced && ' 🔇'}
                  </span>
                ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Advance */}
        <div className="mt-auto pt-4">
          {isHost ? (
            <Button
              fullWidth
              onClick={() => advanceToDayVote(room.code)}
              className="!rounded-2xl !text-white"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
              }}
            >
              Nastavi na glasanje
            </Button>
          ) : (
            <motion.p
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="text-[11px] text-slate-600 text-center"
            >
              Čekamo host-a...
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
