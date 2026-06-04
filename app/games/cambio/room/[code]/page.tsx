'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CambioRoom } from '@/lib/types/cambio';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { usePresence } from '@/hooks/usePresence';
import { setPlayerDisconnected, rejoinRoom } from '@/lib/firestore/cambio';
import { ScreenTransition } from '@/components/shared/ScreenTransition';
import { LobbyScreen } from '@/components/games/cambio/LobbyScreen';
import { InitialPeekScreen } from '@/components/games/cambio/InitialPeekScreen';
import { GameScreen } from '@/components/games/cambio/GameScreen';
import { ScoreScreen } from '@/components/games/cambio/ScoreScreen';

interface Props { params: Promise<{ code: string }> }

export default function RoomPage({ params }: Props) {
  const { code } = use(params);
  const router = useRouter();
  const { id: playerId } = usePlayer();
  const { room, loading, error } = useRoom<CambioRoom>(code);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  usePresence(code, playerId, setPlayerDisconnected, rejoinRoom);

  useEffect(() => {
    if (!loading && !room) router.push('/');
  }, [loading, room, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b14]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <span className="text-[13px] text-white/30">Učitavanje...</span>
        </div>
      </div>
    );
  }

  if (error || !room || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b14]">
        <div className="text-center">
          <p className="text-white/50 mb-4">{error ?? 'Soba nije pronađena'}</p>
          <button onClick={() => router.push('/')} className="text-emerald-400 underline text-sm">Nazad</button>
        </div>
      </div>
    );
  }

  const isInRoom = room.players.some(p => p.id === playerId);
  if (!isInRoom) { router.push('/'); return null; }

  const isHost = room.hostId === playerId;

  const screenKey = room.status === 'playing' || room.status === 'last_round' ? 'game' : room.status;

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[#080b14] text-[#c8d0e0] overflow-hidden">
      {room.status !== 'playing' && room.status !== 'last_round' && (
        <>
          <div className="breathing-orb w-[400px] h-[400px] bg-emerald-600/15 -top-32 -left-32" />
          <div className="breathing-orb w-[300px] h-[300px] bg-teal-600/10 -bottom-24 -right-24" style={{ animationDelay: '3s' }} />
          <div className="scanline" />
        </>
      )}
      <div className="relative flex-1 flex flex-col">
        <ScreenTransition screenKey={screenKey}>
          {room.status === 'lobby' && <LobbyScreen room={room} playerId={playerId} />}
          {room.status === 'initial_peek' && <InitialPeekScreen room={room} playerId={playerId} />}
          {(room.status === 'playing' || room.status === 'last_round') && (
            <GameScreen room={room} playerId={playerId} isHost={isHost} />
          )}
          {(room.status === 'scoring' || room.status === 'finished') && (
            <ScoreScreen room={room} playerId={playerId} />
          )}
        </ScreenTransition>
      </div>
    </div>
  );
}
