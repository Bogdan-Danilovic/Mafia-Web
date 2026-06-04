'use client';
export const dynamic = 'force-dynamic';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { GarticRoom } from '@/lib/types/gartic';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { usePresence } from '@/hooks/usePresence';
import { ScreenTransition } from '@/components/shared/ScreenTransition';
import { LobbyScreen } from '@/components/games/gartic/LobbyScreen';
import { WritingScreen } from '@/components/games/gartic/WritingScreen';
import { WaitingScreen } from '@/components/games/gartic/WaitingScreen';
import { DrawingScreen } from '@/components/games/gartic/DrawingScreen';
import { DescribingScreen } from '@/components/games/gartic/DescribingScreen';
import { RevealScreen } from '@/components/games/gartic/RevealScreen';
import { FinalScreen } from '@/components/games/gartic/FinalScreen';
import { rejoinRoom, setPlayerDisconnected } from '@/lib/firestore/gartic';

export default function GarticRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom<GarticRoom>(code);
  const player = usePlayer();

  usePresence(code, player.id, setPlayerDisconnected, rejoinRoom);

  if (loading || !player.id) {
    return <div className="flex items-center justify-center flex-1"><div className="text-sm text-slate-400 animate-pulse">Učitavanje...</div></div>;
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-sm text-slate-400">{error || 'Soba ne postoji.'}</p>
        <button onClick={() => router.push('/')} className="text-sm text-pink-400 hover:text-pink-300 transition-colors">Nazad na početnu</button>
      </div>
    );
  }

  if (!room.players.some((p) => p.id === player.id)) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-sm text-slate-400">Nisi u ovoj sobi.</p>
        <button onClick={() => router.push('/')} className="text-sm text-pink-400 hover:text-pink-300 transition-colors">Nazad na početnu</button>
      </div>
    );
  }

  const isReady = room.readyPlayers.includes(player.id);
  const inActiveStep = room.status === 'writing' || room.status === 'drawing';

  function renderScreen() {
    if (room!.status === 'lobby') return <LobbyScreen room={room!} playerId={player.id!} />;
    if (room!.status === 'reveal') return <RevealScreen room={room!} playerId={player.id!} />;
    if (room!.status === 'finished') return <FinalScreen room={room!} playerId={player.id!} />;
    if (inActiveStep && isReady) return <WaitingScreen room={room!} playerId={player.id!} />;
    if (room!.status === 'writing') {
      return room!.currentStep === 0
        ? <WritingScreen room={room!} playerId={player.id!} />
        : <DescribingScreen room={room!} playerId={player.id!} />;
    }
    if (room!.status === 'drawing') return <DrawingScreen room={room!} playerId={player.id!} />;
    return null;
  }

  return (
    <ScreenTransition screenKey={`${room.status}-${room.currentStep}-${isReady}`}>
      {renderScreen()}
    </ScreenTransition>
  );
}
