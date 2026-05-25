'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyRoomRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/games/impostor/room/${code}`);
  }, [code, router]);

  return (
    <div className="flex items-center justify-center flex-1 h-screen-safe">
      <div className="text-sm text-slate-400 animate-pulse">Preusmeravanje...</div>
    </div>
  );
}
