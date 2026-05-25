'use client';

import { useEffect, useState } from 'react';
import { ImpostorRoom } from '@/lib/types/impostor';
import { subscribeToImpostorRoom } from '@/lib/firestore/impostor';

export function useRoom(code: string) {
  const [room, setRoom] = useState<ImpostorRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToImpostorRoom(
      code,
      (data) => {
        setRoom(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [code]);

  return { room, loading, error };
}
