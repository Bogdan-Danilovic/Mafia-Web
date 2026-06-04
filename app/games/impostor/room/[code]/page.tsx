'use client';
export const dynamic = 'force-dynamic';

import { ImpostorRoom } from '@/lib/types/impostor';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { ScreenTransition } from '@/components/shared/ScreenTransition';
import { LobbyScreen } from '@/components/games/impostor/LobbyScreen';
import { RoleRevealScreen } from '@/components/games/impostor/RoleRevealScreen';
import { DiscussionScreen } from '@/components/games/impostor/DiscussionScreen';
import { VotingScreen } from '@/components/games/impostor/VotingScreen';
import { RevealScreen } from '@/components/games/impostor/RevealScreen';
import { GameOverScreen } from '@/components/games/impostor/GameOverScreen';
import { rejoinRoom, setPlayerDisconnected } from '@/lib/firestore/impostor';
import { usePresence } from '@/hooks/usePresence';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom<ImpostorRoom>(code);
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
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
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

  const isInRoom = room.players.some((p) => p.id === player.id);
  if (!isInRoom) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-screen-safe gap-4">
        <p className="text-sm text-slate-400">Nisi u ovoj sobi.</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          Nazad na početnu
        </button>
      </div>
    );
  }

  return (
    <ScreenTransition screenKey={room.status}>
      {room.status === 'lobby' && (
        <LobbyScreen room={room} playerId={player.id} />
      )}
      {room.status === 'roleReveal' && (
        <RoleRevealScreen room={room} playerId={player.id} />
      )}
      {room.status === 'discussion' && (
        <DiscussionScreen room={room} playerId={player.id} />
      )}
      {room.status === 'voting' && (
        <VotingScreen room={room} playerId={player.id} />
      )}
      {room.status === 'reveal' && (
        <RevealScreen room={room} playerId={player.id} />
      )}
      {room.status === 'finished' && (
        <GameOverScreen room={room} playerId={player.id} />
      )}
    </ScreenTransition>
  );
}
