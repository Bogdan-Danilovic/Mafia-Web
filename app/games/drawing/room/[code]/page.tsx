'use client';
export const dynamic = 'force-dynamic';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { DrawingRoom } from '@/lib/types/drawing';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { usePresence } from '@/hooks/usePresence';
import { ScreenTransition } from '@/components/shared/ScreenTransition';
import { LobbyScreen } from '@/components/games/drawing/LobbyScreen';
import { WordSelectionScreen } from '@/components/games/drawing/WordSelectionScreen';
import { DrawingScreen } from '@/components/games/drawing/DrawingScreen';
import { RoundResultsScreen } from '@/components/games/drawing/RoundResultsScreen';
import { FinalScreen } from '@/components/games/drawing/FinalScreen';
import { rejoinRoom, setPlayerDisconnected } from '@/lib/firestore/drawing';

export default function DrawingRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom<DrawingRoom>(code);
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
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          Nazad na početnu
        </button>
      </div>
    );
  }

  return (
    <ScreenTransition screenKey={`${room.status}-${room.currentRound}`}>
      {room.status === 'lobby' && (
        <LobbyScreen room={room} playerId={player.id} />
      )}
      {room.status === 'word-selection' && (
        <WordSelectionScreen room={room} playerId={player.id} />
      )}
      {room.status === 'drawing' && (
        <DrawingScreen room={room} playerId={player.id} />
      )}
      {room.status === 'round-results' && (
        <RoundResultsScreen room={room} playerId={player.id} />
      )}
      {room.status === 'finished' && (
        <FinalScreen room={room} playerId={player.id} />
      )}
    </ScreenTransition>
  );
}
