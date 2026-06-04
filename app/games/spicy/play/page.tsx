'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SpicyPlayerSetup } from '@/lib/games/spicy/types';
import { SpicyGameScreen } from '@/components/games/spicy/GameScreen';

export default function SpicyPlayPage() {
  const router = useRouter();
  const [setups, setSetups] = useState<SpicyPlayerSetup[] | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('spicy_setups');
      if (!raw) { router.replace('/games/spicy'); return; }
      const parsed: SpicyPlayerSetup[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length < 2) { router.replace('/games/spicy'); return; }
      setSetups(parsed);
    } catch {
      router.replace('/games/spicy');
    }
  }, [router]);

  if (!setups) {
    return <div className="flex min-h-dvh items-center justify-center"><span className="text-white/40 text-sm">Učitavanje...</span></div>;
  }

  return <SpicyGameScreen setups={setups} />;
}
