'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Nešto je pošlo po krivu
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {error.message || 'Neočekivana greška aplikacije.'}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Pokušaj ponovo
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
          >
            Početna
          </button>
        </div>
      </div>
    </div>
  );
}
