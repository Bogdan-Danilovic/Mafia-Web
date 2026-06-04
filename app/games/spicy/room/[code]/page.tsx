'use client';
export const dynamic = 'force-dynamic';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { SpicyRoom } from '@/lib/games/spicy/firestoreTypes';
import { setConnected } from '@/lib/firestore/spicy';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import { usePresence } from '@/hooks/usePresence';
import { SpicyLobbyScreen } from '@/components/games/spicy/LobbyScreen';
import { SpicyMultiplayerGameScreen } from '@/components/games/spicy/MultiplayerGameScreen';

const GAME_STATUSES = ['playing', 'challenge_window', 'challenge_result', 'last_card_window', 'spicy_trophy', 'finished'];

export default function SpicyRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { room, loading, error } = useRoom<SpicyRoom>(code);
  const player = usePlayer();

  usePresence(
    code,
    player.id ?? '',
    (c, id) => setConnected(c, id, false),
    (c, id) => setConnected(c, id, true)
  );

  if (loading || !player.id) {
    return <div className="flex min-h-dvh items-center justify-center"><span className="text-white/40 text-sm animate-pulse">Učitavanje...</span></div>;
  }

  if (error || !room) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p className="text-sm text-white/60">{error ?? 'Soba ne postoji.'}</p>
        <button onClick={() => router.push('/games/spicy')} className="text-sm text-red-400">Nazad</button>
      </div>
    );
  }

  const inRoom = room.players.some((p) => p.id === player.id);
  if (!inRoom) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5">
        <p className="text-sm text-white/60">Nisi u ovoj sobi.</p>
        <button onClick={() => router.push('/games/spicy')} className="text-sm text-red-400">Nazad</button>
      </div>
    );
  }

  if (room.status === 'lobby') {
    return <SpicyLobbyScreen room={room} playerId={player.id} />;
  }

  if (GAME_STATUSES.includes(room.status)) {
    return <SpicyMultiplayerGameScreen room={room} playerId={player.id} />;
  }

  return <div className="flex min-h-dvh items-center justify-center"><span className="text-white/40 text-sm">Učitavanje...</span></div>;
}
