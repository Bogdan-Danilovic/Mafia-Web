'use client';

import { use, useEffect, useRef } from 'react';
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

export default function ImpostorRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom(code);
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setPlayerDisconnected(code, pid);
      } else {
        rejoinRoom(code, pid);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
        <button
          onClick={() => router.push('/games/impostor')}
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
          onClick={() => router.push('/games/impostor')}
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
