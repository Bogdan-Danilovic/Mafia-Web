'use client';
export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function Redirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/games/spicy'); }, [router]);
  return null;
}
