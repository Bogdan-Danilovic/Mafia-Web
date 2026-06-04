import { Spice } from '@/lib/games/spicy/types';

export const SPICE_CFG: Record<Spice, { label: string; emoji: string; color: string; bg: string }> = {
  chili: { label: 'Čili', emoji: '🌶️', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  wasabi: { label: 'Vasabi', emoji: '🟢', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  pepper: { label: 'Biber', emoji: '⚫', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

export function SpiceChip({ spice, size = 'md' }: { spice: Spice; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = SPICE_CFG[spice];
  const textSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-xs';
  const px = size === 'sm' ? 'px-2 py-0.5' : size === 'lg' ? 'px-4 py-1.5' : 'px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${textSize} ${px}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
      <span>{cfg.emoji}</span><span>{cfg.label}</span>
    </span>
  );
}
