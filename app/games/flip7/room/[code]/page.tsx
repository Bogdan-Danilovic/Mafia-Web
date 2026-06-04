'use client';
export const dynamic = 'force-dynamic';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Flip7Room } from '@/lib/types/flip7';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { ScreenTransition } from '@/components/shared/ScreenTransition';
import { LobbyScreen } from '@/components/games/flip7/LobbyScreen';
import { GameScreen } from '@/components/games/flip7/GameScreen';
import { RoundEndScreen } from '@/components/games/flip7/RoundEndScreen';
import { GameOverScreen } from '@/components/games/flip7/GameOverScreen';
import { rejoinRoom, setPlayerDisconnected } from '@/lib/firestore/flip7';
import { usePresence } from '@/hooks/usePresence';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom<Flip7Room>(code);
  const player = usePlayer();

  usePresence(code, player.id, setPlayerDisconnected, rejoinRoom);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 h-screen-safe">
        <div className="text-sm text-amber-200/50 animate-pulse">Učitavanje...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-screen-safe gap-4">
        <p className="text-sm text-amber-100/60">{error || 'Soba ne postoji.'}</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          Nazad na početnu
        </button>
      </div>
    );
  }

  if (!player.id) {
    return (
      <div className="flex items-center justify-center flex-1 h-screen-safe">
        <div className="text-sm text-amber-200/50 animate-pulse">Učitavanje...</div>
      </div>
    );
  }

  const isInRoom = room.players.some((p) => p.id === player.id);
  if (!isInRoom) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-screen-safe gap-4">
        <p className="text-sm text-amber-100/60">Nisi u ovoj sobi.</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          Nazad na početnu
        </button>
      </div>
    );
  }

  return (
    <ScreenTransition screenKey={room.status}>
      {room.status === 'lobby' && <LobbyScreen room={room} playerId={player.id} />}
      {room.status === 'playing' && <GameScreen room={room} playerId={player.id} />}
      {room.status === 'round_end' && <RoundEndScreen room={room} playerId={player.id} />}
      {room.status === 'finished' && <GameOverScreen room={room} playerId={player.id} />}
    </ScreenTransition>
  );
}
