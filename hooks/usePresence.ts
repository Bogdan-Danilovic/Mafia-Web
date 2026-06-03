'use client';

import { useEffect, useRef } from 'react';
import { gameToast } from '@/lib/toast';

export function usePresence(
  code: string,
  playerId: string | null | undefined,
  onDisconnect: (code: string, playerId: string) => Promise<void>,
  onReconnect: (code: string, playerId: string) => Promise<void>
) {
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!playerId) return;
    const pid = playerId;

    onReconnect(code, pid);

    const handleVisibility = () => {
      if (document.hidden) {
        onDisconnect(code, pid);
      } else {
        onReconnect(code, pid);
        if (wasOfflineRef.current) {
          gameToast.connectionRestored();
          wasOfflineRef.current = false;
        }
      }
    };

    const handleOnline = () => {
      onReconnect(code, pid);
      if (wasOfflineRef.current) {
        gameToast.connectionRestored();
        wasOfflineRef.current = false;
      }
    };

    const handleOffline = () => {
      wasOfflineRef.current = true;
      gameToast.connectionLost();
      onDisconnect(code, pid);
    };

    const handleBeforeUnload = () => onDisconnect(code, pid);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      onDisconnect(code, pid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId]);
}
