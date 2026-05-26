'use client';

import { AliasRoom } from '@/lib/types/alias';
import { use, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { LobbyScreen } from '@/components/games/alias/LobbyScreen';
import { RoundStartScreen } from '@/components/games/alias/RoundStartScreen';
import { ExplainingScreen } from '@/components/games/alias/ExplainingScreen';
import { RoundEndScreen } from '@/components/games/alias/RoundEndScreen';
import { ScoreboardScreen } from '@/components/games/alias/ScoreboardScreen';
import { GameOverScreen } from '@/components/games/alias/GameOverScreen';
import { rejoinRoom, setPlayerDisconnected } from '@/lib/firestore/alias';
import { AnimatePresence, motion } from 'framer-motion';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom<AliasRoom>(code);
  const player = usePlayer();
  const hasRejoined = useRef(false);

  useEffect(() => {
    if (!player.id || !room || hasRejoined.current) return;
    const playerInRoom = room.players.find((p) => p.id === player.id);
    if (playerInRoom && !playerInRoom.isConnected) {
      hasRejoined.current = true;
      rejoinRoom(code, player.id);
    }
  }, [player.id, room, code]);

  useEffect(() => {
    if (!player.id) return;
    const pid = player.id;
    const handleBeforeUnload = () => setPlayerDisconnected(code, pid);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [player.id, code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 h-screen-safe">
        <div className="text-sm text-slate-400 animate-pulse">Učitavanje...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-screen-safe gap-4">
        <p className="text-sm text-slate-400">{error || 'Soba ne postoji.'}</p>
        <button onClick={() => router.push('/')} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">Nazad na početnu</button>
      </div>
    );
  }

  if (!player.id) {
    return (
      <div className="flex items-center justify-center flex-1 h-screen-safe">
        <div className="text-sm text-slate-400 animate-pulse">Učitavanje...</div>
      </div>
    );
  }

  const isInRoom = room.players.some((p) => p.id === player.id);
  if (!isInRoom) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-screen-safe gap-4">
        <p className="text-sm text-slate-400">Nisi u ovoj sobi.</p>
        <button onClick={() => router.push('/')} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">Nazad na početnu</button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={room.status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col flex-1"
      >
        {room.status === 'lobby' && <LobbyScreen room={room} playerId={player.id} />}
        {room.status === 'roundStart' && <RoundStartScreen room={room} playerId={player.id} />}
        {room.status === 'explaining' && <ExplainingScreen room={room} playerId={player.id} />}
        {room.status === 'roundEnd' && <RoundEndScreen room={room} playerId={player.id} />}
        {room.status === 'scoreboard' && <ScoreboardScreen room={room} playerId={player.id} />}
        {room.status === 'finished' && <GameOverScreen room={room} playerId={player.id} />}
      </motion.div>
    </AnimatePresence>
  );
}
