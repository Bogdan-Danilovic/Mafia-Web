'use client';
export const dynamic = 'force-dynamic';

import { MafiaRoom } from '@/lib/types/mafia';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/hooks/usePlayer';
import { ScreenTransition } from '@/components/shared/ScreenTransition';
import { LobbyScreen } from '@/components/games/mafia/LobbyScreen';
import { RoleRevealScreen } from '@/components/games/mafia/RoleRevealScreen';
import { PlayingScreen } from '@/components/games/mafia/PlayingScreen';
import { FinishedScreen } from '@/components/games/mafia/FinishedScreen';
import { rejoinRoom, setPlayerDisconnected, subscribeToRoom } from '@/lib/firestore/mafia';
import { usePresence } from '@/hooks/usePresence';

function useMafiaRoom(code: string) {
  const [room, setRoom] = useState<MafiaRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToRoom<MafiaRoom>(
      code,
      (data) => { setRoom(data); setLoading(false); },
      (err) => { setError(err.message); setLoading(false); }
    );
    return () => unsubscribe();
  }, [code]);

  return { room, loading, error };
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useMafiaRoom(code);
  const player = usePlayer();

  usePresence(code, player.id, setPlayerDisconnected, rejoinRoom);

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
        <button
          onClick={() => router.push('/')}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Nazad na početnu
        </button>
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

  const isInRoom = room.players && player.id in room.players;
  if (!isInRoom) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-screen-safe gap-4">
        <p className="text-sm text-slate-400">Nisi u ovoj sobi.</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Nazad na početnu
        </button>
      </div>
    );
  }

  return (
    <ScreenTransition screenKey={room.status}>
      {room.status === 'lobby' && <LobbyScreen room={room} playerId={player.id} />}
      {room.status === 'role-reveal' && <RoleRevealScreen room={room} playerId={player.id} />}
      {room.status === 'playing' && <PlayingScreen room={room} playerId={player.id} />}
      {room.status === 'finished' && <FinishedScreen room={room} playerId={player.id} />}
    </ScreenTransition>
  );
}
