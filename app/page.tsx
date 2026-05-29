import GameGallery from '@/components/hub/GameGallery';

export default function HubPage() {
  return (
    <main className="relative flex flex-col items-center min-h-dvh overflow-x-hidden">
      {/* Background: grid pattern + breathing orbs */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-grid" />
      <div
        aria-hidden
        className="breathing-orb"
        style={{
          width: 680,
          height: 680,
          top: '-15%',
          left: '-12%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.45), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="breathing-orb"
        style={{
          width: 520,
          height: 520,
          bottom: '-12%',
          right: '-12%',
          background: 'radial-gradient(circle, rgba(8,145,178,0.40), transparent 70%)',
          animationDelay: '3s',
        }}
      />

      {/* Heading */}
      <header className="relative z-10 text-center pt-28 pb-10 px-4">
        <h1
          data-text="Izaberi igru"
          className="glitch-hover text-glow-v"
          style={{ fontWeight: 700, fontSize: 32, color: '#f1f5f9', letterSpacing: '-0.02em' }}
        >
          Izaberi igru
        </h1>
        <p className="text-sm mt-2 tracking-wide" style={{ color: '#94a3b8' }}>
          Tvoj hub za društvene igre
        </p>
      </header>

      {/* Gallery */}
      <section className="relative z-10 w-full flex-1 flex items-center justify-center pb-24">
        <GameGallery />
      </section>
    </main>
  );
}
