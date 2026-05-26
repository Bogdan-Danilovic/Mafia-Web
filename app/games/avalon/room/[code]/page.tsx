'use client';

import { AvalonRoom } from '@/lib/types/avalon';
import { use, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { ScreenTransition } from '@/components/shared/ScreenTransition';
import { LobbyScreen } from '@/components/games/avalon/LobbyScreen';
import { NightPhaseScreen } from '@/components/games/avalon/NightPhaseScreen';
import { RoleRevealScreen } from '@/components/games/avalon/RoleRevealScreen';
import { MissionProposeScreen } from '@/components/games/avalon/MissionProposeScreen';
import { MissionVoteScreen } from '@/components/games/avalon/MissionVoteScreen';
import { VoteResultScreen } from '@/components/games/avalon/VoteResultScreen';
import { QuestPhaseScreen } from '@/components/games/avalon/QuestPhaseScreen';
import { QuestResultScreen } from '@/components/games/avalon/QuestResultScreen';
import { ScoreboardScreen } from '@/components/games/avalon/ScoreboardScreen';
import { AssassinateScreen } from '@/components/games/avalon/AssassinateScreen';
import { GameOverScreen } from '@/components/games/avalon/GameOverScreen';
import { rejoinRoom, setPlayerDisconnected } from '@/lib/firestore/avalon';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom<AvalonRoom>(code);
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
    <ScreenTransition screenKey={room.status}>
      {room.status === 'lobby' && <LobbyScreen room={room} playerId={player.id} />}
      {room.status === 'nightPhase' && <NightPhaseScreen room={room} playerId={player.id} />}
      {room.status === 'roleReveal' && <RoleRevealScreen room={room} playerId={player.id} />}
      {room.status === 'missionPropose' && <MissionProposeScreen room={room} playerId={player.id} />}
      {room.status === 'missionVote' && <MissionVoteScreen room={room} playerId={player.id} />}
      {room.status === 'voteResult' && <VoteResultScreen room={room} playerId={player.id} />}
      {room.status === 'questPhase' && <QuestPhaseScreen room={room} playerId={player.id} />}
      {room.status === 'questResult' && <QuestResultScreen room={room} playerId={player.id} />}
      {room.status === 'scoreboard' && <ScoreboardScreen room={room} playerId={player.id} />}
      {room.status === 'assassinate' && <AssassinateScreen room={room} playerId={player.id} />}
      {room.status === 'finished' && <GameOverScreen room={room} playerId={player.id} />}
    </ScreenTransition>
  );
}
