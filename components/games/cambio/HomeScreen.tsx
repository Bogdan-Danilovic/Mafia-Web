'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, Users } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { hexA } from '@/lib/utils';
import { createRoom, joinRoom } from '@/lib/firestore/cambio';

const ACCENT = '#10b981';
const RULES = [
  'Svako dobija 4 karte licem nadole — pogledaj samo 2.',
  'Vučeš kartu i zameniš je ili baciš direktno.',
  'Specijalne karte ti daju moći — špijunaža i zamena.',
  'Kada misliš da imaš najmanji zbir — pozovi Cambio!',
];
const fadeIn = (delay = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } });
const shake = { x: [0, -6, 6, -4, 4, -2, 2, 0], transition: { duration: 0.35 } };

export function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2 && trimmedName.length <= 16 && /^[\p{L}\p{N} ]+$/u.test(trimmedName);

  function showError(msg: string) { setError(msg); setErrorKey(k => k + 1); }

  async function handleCreate() {
    if (!nameValid) return;
    setError(''); setLoading('create');
    try {
      const { code, playerId } = await createRoom(trimmedName);
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', trimmedName);
      router.push(`/games/cambio/room/${code}`);
    } catch (err) { showError(err instanceof Error ? err.message : 'Greška.'); setLoading(null); }
  }

  async function handleJoin() {
    if (!nameValid || roomCode.trim().length !== 5) return;
    setError(''); setLoading('join');
    try {
      const code = roomCode.trim().toUpperCase();
      const { playerId, error: e } = await joinRoom(code, trimmedName);
      if (e) { showError(e); setLoading(null); return; }
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', trimmedName);
      router.push(`/games/cambio/room/${code}`);
    } catch (err) { showError(err instanceof Error ? err.message : 'Greška.'); setLoading(null); }
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6 px-5 pb-14 pt-20">

        <motion.div {...fadeIn(0.15)} className="rounded-3xl p-6"
          style={{ background: `linear-gradient(160deg,${hexA(ACCENT, 0.28)} 0%,rgba(0,0,0,0.85) 100%)`, border: `1px solid ${hexA(ACCENT, 0.25)}`, boxShadow: `0 20px 60px ${hexA(ACCENT, 0.25)}` }}>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex shrink-0 select-none items-center justify-center text-[35px]"
              style={{ width: 64, height: 64, borderRadius: 64 * 0.39, background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.55)})`, boxShadow: `inset 0 1px 1px rgba(255,255,255,0.35),0 6px 18px ${hexA(ACCENT, 0.34)}` }}>🃏</div>
            <div className="min-w-0 flex-1">
              <div className="text-[26px] font-extrabold tracking-[-0.5px] text-white">Cambio</div>
              <div className="mt-1 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#30d158', boxShadow: '0 0 6px #30d158', animation: 'gh-pulse 2s ease-in-out infinite' }} />
                <span className="text-[13px] font-semibold" style={{ color: '#30d158' }}>Dostupno</span>
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/70">Kartaška igra pamćenja za 2–4 igrača. Skupi što manje bodova — ali ne znaš šta imaš!</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[13px] font-semibold text-white"><Users size={14} strokeWidth={2} />2–4</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[13px] font-semibold text-white"><Clock size={14} strokeWidth={2} />15-30 min</span>
            {['karte', 'pamćenje', 'strategija'].map(t => (
              <span key={t} className="rounded-full px-3 py-1.5 text-[13px] font-semibold capitalize text-white" style={{ background: hexA(ACCENT, 0.18), border: `1px solid ${hexA(ACCENT, 0.35)}` }}>{t}</span>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeIn(0.3)} className="flex flex-col gap-4">
          <Input label="Tvoje ime" placeholder="Unesi ime" value={name} onChange={e => setName(e.target.value)} maxLength={16} autoComplete="off" />
          <Button fullWidth disabled={!nameValid || loading !== null} onClick={handleCreate}
            className="!rounded-2xl !text-white"
            style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})`, boxShadow: `0 4px 16px ${hexA(ACCENT, 0.4)}` }}>
            {loading === 'create' ? <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>Kreiranje...</motion.span> : 'Napravi sobu'}
          </Button>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input label="Kod sobe" placeholder="_ _ _ _ _" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={5} className="text-center text-[16px] font-bold uppercase tracking-[0.4em]" />
            </div>
            <Button variant="secondary" disabled={!nameValid || roomCode.trim().length !== 5 || loading !== null} onClick={handleJoin} className="mb-[1px] shrink-0 !rounded-2xl">
              {loading === 'join' ? '...' : 'Uđi'}
            </Button>
          </div>
          {error && <motion.p key={errorKey} initial={{ opacity: 0 }} animate={{ opacity: 1, ...shake }} className="text-[13px] text-red-400/90">{error}</motion.p>}
        </motion.div>

        <motion.div {...fadeIn(0.45)}>
          <div className="mb-3 text-lg font-extrabold tracking-[-0.3px] text-white">Kako se igra</div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
            {RULES.map((rule, i) => (
              <div key={rule} className={`flex items-center gap-3 px-4 py-3.5 ${i ? 'border-t border-white/[0.07]' : ''}`}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white" style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.7)})` }}>{i + 1}</div>
                <span className="text-sm leading-snug text-white/85">{rule}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeIn(0.55)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/60">Vrednosti karata</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
            {[['🃏 Džoker', '0'], ['A (As)', '1'], ['2 – 6', '2–6'], ['7, 8', '7, 8 + moć'], ['9, 10', '9, 10 + moć'], ['J, Q', '10 + moć'], ['K ♠♣ (crni)', '10 + moć'], ['K ♥♦ (crveni)', '-1 ⭐']].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-white/50">{k}</span>
                <span className="font-semibold text-white/80">{v}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
