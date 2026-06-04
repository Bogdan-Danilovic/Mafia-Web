export const dynamic = 'force-dynamic';
import { HomeScreen } from '@/components/games/cambio/HomeScreen';

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#080b14] text-[#c8d0e0] overflow-hidden">
      <div className="breathing-orb w-[500px] h-[500px] bg-emerald-600/20 -top-40 -left-40" />
      <div className="breathing-orb w-[400px] h-[400px] bg-teal-600/15 -bottom-32 -right-32" style={{ animationDelay: '4s' }} />
      <div className="scanline" />
      <div className="relative flex-1 flex flex-col"><HomeScreen /></div>
    </div>
  );
}
