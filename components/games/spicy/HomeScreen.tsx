'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Users, Clock, Play } from 'lucide-react';
import { SpicyPlayerSetup } from '@/lib/games/spicy/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { hexA, generatePlayerId } from '@/lib/utils';
import { getGameById } from '@/lib/games/registry';

const GAME = getGameById('spicy')!;
const ACCENT = GAME.accentColor;

const RULES = [
  'Odigraj kartu licem nadole — objavi broj i začin (istinito ili ne).',
  'Svaka sledeća objava mora biti veći broj, isti začin.',
  'Izazovi objavu! Pobednik uzima gomilu, gubitnik vuče 2.',
  'Posle 10 → resetuje se na 1–3, začin ostaje isti.',
  'Odigraj poslednju kartu → osvoji trofej (10 poena)!',
  '2 trofeja ili svi trofeja podeljeni → igra se završava.',
];

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export function SpicyHomeScreen() {
  const router = useRouter();
  const [players, setPlayers] = useState<SpicyPlayerSetup[]>([
    { id: generatePlayerId(), name: '' },
    { id: generatePlayerId(), name: '' },
  ]);

  const addPlayer = () => players.length < 6 && setPlayers((prev) => [...prev, { id: generatePlayerId(), name: '' }]);
  const removePlayer = (id: string) => players.length > 2 && setPlayers((prev) => prev.filter((p) => p.id !== id));
  const updateName = (id: string, name: string) => setPlayers((prev) => prev.map((p) => p.id === id ? { ...p, name } : p));
  const allNamed = players.every((p) => p.name.trim().length >= 2);

  function handleStart() {
    if (!allNamed) return;
    const clean = players.map((p) => ({ ...p, name: p.name.trim() }));
    sessionStorage.setItem('spicy_setups', JSON.stringify(clean));
    router.push('/games/spicy/play');
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6 px-5 pb-14 pt-20">
        {/* Back */}
        <motion.button {...fadeIn(0.05)} type="button" onClick={() => router.push('/')}
          aria-label="Nazad na hub"
          className="flex h-9 w-9 items-center justify-center self-start rounded-full text-white"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ArrowLeft size={18} strokeWidth={2.2} />
        </motion.button>

        {/* Hero */}
        <motion.div {...fadeIn(0.15)} className="rounded-3xl p-6"
          style={{ background: `linear-gradient(160deg, ${hexA(ACCENT, 0.22)} 0%, rgba(0,0,0,0.85) 100%)`, border: `1px solid ${hexA(ACCENT, 0.25)}`, boxShadow: `0 20px 60px ${hexA(ACCENT, 0.18)}` }}>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ background: hexA(ACCENT, 0.2), border: `1px solid ${hexA(ACCENT, 0.35)}` }}>
              {GAME.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[26px] font-extrabold tracking-[-0.5px] text-white">{GAME.name}</div>
              <div className="mt-0.5 text-sm text-white/60">Blefirај. Izazivaj. Pobeđuj.</div>
            </div>
          </div>
          <p className="m-0 text-sm leading-relaxed text-white/70">{GAME.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[13px] font-semibold text-white">
              <Users size={14} /> {GAME.minPlayers}–{GAME.maxPlayers}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[13px] font-semibold text-white">
              <Clock size={14} /> {GAME.avgDuration}
            </span>
            {GAME.tags.map((tag) => (
              <span key={tag} className="rounded-full px-3 py-1.5 text-[13px] font-semibold capitalize text-white"
                style={{ background: hexA(ACCENT, 0.15), border: `1px solid ${hexA(ACCENT, 0.3)}` }}>
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Players */}
        <motion.div {...fadeIn(0.3)} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold tracking-[-0.3px] text-white">Igrači</div>
            <div className="flex items-center gap-2">
              <button onClick={() => removePlayer(players[players.length - 1].id)} disabled={players.length <= 2}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm font-bold text-white">{players.length}</span>
              <button onClick={addPlayer} disabled={players.length >= 6}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {players.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Input label={`Igrač ${i + 1}`} placeholder={`Ime igrača ${i + 1}`} value={p.name}
                  onChange={(e) => updateName(p.id, e.target.value)} maxLength={16} autoComplete="off"
                  className="focus:!border-red-500/60 focus:!ring-red-500/25" />
              </motion.div>
            ))}
          </div>
          <Button fullWidth disabled={!allNamed} onClick={handleStart} className="!rounded-2xl !text-white !font-bold"
            style={{ background: allNamed ? `linear-gradient(135deg, ${ACCENT}, #dc2626)` : undefined, boxShadow: allNamed ? `0 4px 20px ${hexA(ACCENT, 0.45)}` : undefined }}>
            <Play size={16} /> Počni igru
          </Button>
          {!allNamed && <p className="text-center text-xs text-white/30">Unesite ime za svakog igrača (min. 2 slova)</p>}
        </motion.div>

        {/* Rules */}
        <motion.div {...fadeIn(0.45)}>
          <div className="mb-3 text-lg font-extrabold tracking-[-0.3px] text-white">Kako se igra</div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            {RULES.map((rule, i) => (
              <div key={rule} className={`flex items-start gap-3 px-4 py-3.5 ${i ? 'border-t border-white/[0.06]' : ''}`}>
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #dc2626)` }}>
                  {i + 1}
                </div>
                <span className="text-sm leading-snug text-white/80">{rule}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
