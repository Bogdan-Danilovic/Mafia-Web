'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseErrorMessage } from '@/lib/firebaseErrors';

export default function AliasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AliasError]', error);
  }, [error]);

  const router = useRouter();
  const message = getFirebaseErrorMessage(error.message);

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        <h2 className="text-2xl font-bold text-white">Greška u igri</h2>
        <p className="text-sm text-slate-400">{message}</p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}
          >
            Pokušaj ponovo
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            Početna
          </button>
        </div>
      </div>
    </div>
  );
}
