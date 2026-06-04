'use client';

import { motion } from 'framer-motion';
import { SpicyCard } from '@/lib/games/spicy/types';
import { SPICE_CFG } from '@/components/games/spicy/SpiceChip';

interface Props {
  card: SpicyCard;
  faceUp?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function SpicyCardComponent({ card, faceUp = true, selected, onClick, size = 'md' }: Props) {
  const w = size === 'sm' ? 'w-10' : size === 'lg' ? 'w-20' : 'w-14';
  const h = size === 'sm' ? 'h-14' : size === 'lg' ? 'h-28' : 'h-20';
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-2xl' : 'text-sm';
  const cfg = card.spice ? SPICE_CFG[card.spice] : null;

  const front = () => {
    if (card.type === 'joker_spice') return <div className="flex flex-col items-center gap-0.5"><span className="text-[8px] text-white/50 uppercase tracking-wide">joker</span><span>🌶️🟢⚫</span></div>;
    if (card.type === 'joker_number') return <div className="flex flex-col items-center gap-0.5"><span className="text-[8px] text-white/50 uppercase tracking-wide">joker</span><span className={`${textSize} font-black text-white`}>1–10</span></div>;
    if (card.type === 'enough') return <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">DOSTA</span>;
    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`${textSize} font-black`} style={{ color: cfg?.color ?? '#fff' }}>{card.value}</span>
        {size !== 'sm' && cfg && <span className="text-[9px]" style={{ color: cfg.color }}>{cfg.emoji}</span>}
      </div>
    );
  };

  const borderColor = selected ? '#ef4444' : cfg ? cfg.color : 'rgba(255,255,255,0.15)';

  return (
    <motion.button type="button" onClick={onClick}
      whileHover={onClick ? { scale: 1.08, y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`${w} ${h} rounded-xl flex items-center justify-center border-2 ${selected ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-transparent' : ''} ${onClick ? '' : 'cursor-default'}`}
      style={{ background: faceUp ? 'linear-gradient(160deg,#1a1f2e,#0f1320)' : 'linear-gradient(160deg,#1a0a0a,#0f0808)', borderColor, boxShadow: selected ? `0 0 16px ${borderColor}60` : undefined }}
    >
      {faceUp ? front() : <span className="text-xl">🌶️</span>}
    </motion.button>
  );
}
