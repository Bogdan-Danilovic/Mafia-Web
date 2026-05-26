'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createRoom, joinRoom } from '@/lib/firestore/alias';

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const shake = {
  x: [0, -6, 6, -4, 4, -2, 2, 0],
  transition: { duration: 0.35 },
};

export function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);

  const NAME_REGEX = /^[\p{L}\p{N} ]+$/u;
  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2 && trimmedName.length <= 16 && NAME_REGEX.test(trimmedName);

  function showError(msg: string) {
    setError(msg);
    setErrorKey((k) => k + 1);
  }

  async function handleCreate() {
    if (!nameValid) return;
    setError('');
    setLoading('create');
    try {
      const { code, playerId } = await createRoom(trimmedName);
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', trimmedName);
      router.push(`/room/${code}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri kreiranju sobe.');
      setLoading(null);
    }
  }

  async function handleJoin() {
    if (!nameValid || roomCode.trim().length !== 5) return;
    setError('');
    setLoading('join');
    try {
      const code = roomCode.trim().toUpperCase();
      const { playerId, error: joinError } = await joinRoom(code, trimmedName);
      if (joinError) { showError(joinError); setLoading(null); return; }
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', trimmedName);
      router.push(`/room/${code}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri pridruživanju.');
      setLoading(null);
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      <div className="breathing-orb w-[300px] h-[300px] bg-cyan-500/10 top-[-80px] right-[-60px]" />
      <div className="breathing-orb w-[200px] h-[200px] bg-cyan-500/5 bottom-[10%] left-[-40px]" />

      <div className="relative w-full max-w-[320px] flex flex-col gap-12">
        <motion.div {...fadeIn(0.2)} className="flex flex-col items-start gap-6">
          <motion.div
            className="text-4xl"
            animate={{ rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            💬
          </motion.div>
          <div>
            <h1 className="text-[48px] font-bold tracking-[-0.04em] leading-[0.9] text-white">
              Alias
            </h1>
            <p className="mt-3 text-[13px] text-slate-500 leading-relaxed max-w-[260px]">
              Objasni što više riječi za 60 sekundi. Tvoj tim mora da pogodi.
            </p>
          </div>
        </motion.div>

        <motion.div {...fadeIn(0.4)}>
          <label className="block text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">Tvoje ime</label>
          <input
            type="text"
            placeholder="Unesi ime"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            autoComplete="off"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-[14px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/40 transition-colors"
          />
        </motion.div>

        <motion.div {...fadeIn(0.6)} className="flex flex-col gap-4">
          <button
            disabled={!nameValid || loading !== null}
            onClick={handleCreate}
            className="w-full py-3.5 rounded-lg text-[13px] font-semibold bg-cyan-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-500 transition-colors shadow-[0_0_20px_rgba(8,145,178,0.3)]"
          >
            {loading === 'create' ? (
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                Kreiranje...
              </motion.span>
            ) : 'Napravi sobu'}
          </button>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-2">Kod sobe</label>
              <input
                type="text"
                placeholder="_ _ _ _ _"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-center tracking-[0.4em] uppercase font-bold text-[16px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
            <button
              disabled={!nameValid || roomCode.trim().length !== 5 || loading !== null}
              onClick={handleJoin}
              className="shrink-0 mb-[1px] px-5 py-3 rounded-lg text-[13px] font-semibold bg-white/[0.04] text-slate-300 border border-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.08] transition-colors"
            >
              {loading === 'join' ? '...' : 'Uđi'}
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.p
            key={errorKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, ...shake }}
            className="text-[13px] text-red-400/90 -mt-4"
          >
            {error}
          </motion.p>
        )}
      </div>
    </div>
  );
}
