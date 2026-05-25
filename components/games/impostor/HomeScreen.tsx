'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { createRoom, joinRoom } from '@/lib/firestore/impostor';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const shake = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.4 },
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
  const canAct = nameValid;

  async function handleCreate() {
    if (!canAct) return;
    setError('');
    setLoading('create');
    try {
      const { code, playerId } = await createRoom(name.trim());
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', name.trim());
      router.push(`/games/impostor/room/${code}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri kreiranju sobe.');
      setLoading(null);
    }
  }

  function showError(msg: string) {
    setError(msg);
    setErrorKey((k) => k + 1);
  }

  async function handleJoin() {
    if (!canAct || roomCode.trim().length !== 5) return;
    setError('');
    setLoading('join');
    try {
      const { playerId, error: joinError } = await joinRoom(
        roomCode.trim().toUpperCase(),
        name.trim()
      );
      if (joinError) {
        showError(joinError);
        setLoading(null);
        return;
      }
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', name.trim());
      router.push(`/games/impostor/room/${roomCode.trim().toUpperCase()}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri pridruživanju.');
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 h-screen-safe">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="text-center flex flex-col items-center">
          <div className="text-6xl mb-3">🎭</div>
          <h1 className="text-4xl font-bold tracking-tight text-glow">
            <span className="text-violet-400">IM</span>
            <span className="text-slate-100">POSTOR</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 tracking-wide">
            Otkrij ko blefira
          </p>
        </motion.div>

        {/* Name input */}
        <motion.div variants={fadeUp} className="w-full">
          <Input
            label="Tvoje ime"
            placeholder="Unesi ime..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            autoComplete="off"
          />
        </motion.div>

        {/* Create room */}
        <motion.div variants={fadeUp} className="w-full">
          <Button
            fullWidth
            disabled={!canAct || loading !== null}
            onClick={handleCreate}
          >
            {loading === 'create' ? 'Kreiranje...' : 'Napravi sobu'}
          </Button>
        </motion.div>

        {/* Divider */}
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-4 w-full"
        >
          <div className="flex-1 h-px bg-slate-600/50" />
          <span className="text-xs text-slate-500 uppercase tracking-widest">
            ili
          </span>
          <div className="flex-1 h-px bg-slate-600/50" />
        </motion.div>

        {/* Join room */}
        <motion.div variants={fadeUp} className="w-full flex gap-3">
          <Input
            placeholder="KOD"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={5}
            className="text-center tracking-[0.3em] uppercase font-semibold"
          />
          <Button
            variant="secondary"
            disabled={!canAct || roomCode.trim().length !== 5 || loading !== null}
            onClick={handleJoin}
            className="shrink-0"
          >
            {loading === 'join' ? '...' : 'Uđi'}
          </Button>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.p
            key={errorKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, ...shake }}
            className="text-sm text-red-400 text-center"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
