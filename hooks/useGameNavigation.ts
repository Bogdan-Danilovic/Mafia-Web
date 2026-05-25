'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { GameType } from '@/lib/types/core';

export function useGameNavigation() {
  const router = useRouter();

  const goToGame = useCallback(
    (gameType: GameType) => {
      router.push(`/games/${gameType}`);
    },
    [router]
  );

  const goToRoom = useCallback(
    (gameType: GameType, code: string) => {
      router.push(`/games/${gameType}/room/${code}`);
    },
    [router]
  );

  const goToHub = useCallback(() => {
    router.push('/');
  }, [router]);

  return { goToGame, goToRoom, goToHub };
}
