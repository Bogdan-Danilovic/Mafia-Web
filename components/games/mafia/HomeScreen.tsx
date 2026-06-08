'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GameIcon } from '@/components/GameIcon';
import { getGameById } from '@/lib/games/registry';
import { hexA } from '@/lib/utils';
import { createRoom, joinRoom } from '@/lib/firestore/mafia';
import { useAuth } from '@/hooks/useAuth';

const ACCENT = '#dc2626';
const ACCENT2 = '#ef4444';

const shake = {
  x: [0, -6, 6, -4, 4, -2, 2, 0],
  transition: { duration: 0.35 },
};

export function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const GAME = getGameById('mafia');

  const [name, setName] = useState('');
  useEffect(() => {
    if (profile?.displayName && name === '') setName(profile.displayName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.displayName]);

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
      router.push(`/games/mafia/room/${code}`);
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
      router.push(`/games/mafia/room/${code}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri pridruživanju.');
      setLoading(null);
    }
  }

  const rules = [
    'Mafija se budi noću — biraju koga eliminišu',
    'Danju svi diskutuju i glasaju koga lynchuju',
    'Mafija pobjeđuje kad su ≥ civila, civili kad mafia nestane',
  ];

  return (
    <div className="relative flex flex-col flex-1 px-5 h-screen-safe overflow-hidden">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors pt-6 pb-2 self-start"
      >
        <ArrowLeft size={16} />
        <span className="text-[12px]">Hub</span>
      </motion.button>

      <div className="flex flex-col items-center justify-center flex-1 pb-8">
        <div className="w-full max-w-[320px] flex flex-col gap-8">

          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${hexA(ACCENT, 0.15)}, ${hexA(ACCENT2, 0.08)})`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                {GAME && <GameIcon game={GAME} size={44} />}
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {GAME?.tags?.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 text-white/40 uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <h1 className="text-[36px] font-bold tracking-[-0.04em] text-white leading-none mb-2">
                {GAME?.name ?? 'Mafia'}
              </h1>
              <p className="text-[12px] text-white/40 leading-relaxed mb-5">
                Mafija ubija noću. Civili glasaju danju. Ko preživljava?
              </p>

              <div className="flex items-center gap-4 text-[11px] text-white/30">
                <span className="flex items-center gap-1.5">
                  <Users size={12} />
                  {GAME?.minPlayers ?? 6}–{GAME?.maxPlayers ?? 14} igrača
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {GAME?.avgDuration ?? '15–30 min'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Rules */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
            className="flex flex-col gap-2"
          >
            {rules.map((rule, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
              >
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{ background: hexA(ACCENT, 0.2), color: ACCENT2 }}
                >
                  {i + 1}
                </span>
                <p className="text-[12px] text-white/50 leading-relaxed">{rule}</p>
              </div>
            ))}
          </motion.div>

          {/* Name */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Input
              label="Tvoje ime"
              placeholder="Unesi ime"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="off"
              className="!rounded-2xl !border-white/10 !bg-white/[0.05] !text-white focus:!border-red-500/60 focus:!ring-red-500/25"
            />
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-3"
          >
            <Button
              fullWidth
              disabled={!nameValid || loading !== null}
              onClick={handleCreate}
              className="!rounded-2xl !text-white"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                boxShadow: `0 4px 16px ${hexA(ACCENT, 0.4)}`,
              }}
            >
              {loading === 'create' ? (
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                  Kreiranje...
                </motion.span>
              ) : 'Napravi sobu'}
            </Button>

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  label="Kod sobe"
                  placeholder="_ _ _ _ _"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="!rounded-2xl !border-white/10 !bg-white/[0.05] !text-white text-center tracking-[0.4em] uppercase font-bold text-[16px] focus:!border-red-500/60"
                />
              </div>
              <Button
                variant="secondary"
                disabled={!nameValid || roomCode.trim().length !== 5 || loading !== null}
                onClick={handleJoin}
                className="shrink-0 mb-[1px] !rounded-2xl"
              >
                {loading === 'join' ? '...' : 'Uđi'}
              </Button>
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
    </div>
  );
}
