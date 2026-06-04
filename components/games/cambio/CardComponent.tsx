'use client';

import { motion } from 'framer-motion';
import { CambioCard } from '@/lib/types/cambio';
import { getCardValue } from './constants';

interface Props {
  card: CambioCard;
  playerId: string;
  revealed?: boolean;
  selected?: boolean;
  selectable?: boolean;
  peek?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

const ACCENT = '#10b981';

function isRedSuit(suit: string) { return suit === '♥' || suit === '♦'; }

export function CardComponent({ card, playerId, revealed, selected, selectable, peek, onClick, size = 'md' }: Props) {
  const isKnown = revealed || card.knownBy.includes(playerId);
  const isPeeking = peek && !revealed;
  const showFace = isKnown || isPeeking;
  const isRed = isRedSuit(card.suit);
  const value = getCardValue(card.rank, card.suit);

  const w = size === 'sm' ? 'w-[48px]' : 'w-[60px]';
  const h = size === 'sm' ? 'h-[68px]' : 'h-[84px]';
  const rankSize = size === 'sm' ? 'text-[14px]' : 'text-[18px]';
  const suitSize = size === 'sm' ? 'text-[10px]' : 'text-[13px]';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!selectable && !onClick}
      whileHover={selectable ? { scale: 1.08, y: -4 } : undefined}
      whileTap={selectable ? { scale: 0.95 } : undefined}
      animate={selected ? { scale: 1.1, y: -6 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative ${w} ${h} rounded-lg overflow-hidden cursor-${selectable ? 'pointer' : 'default'} select-none`}
      style={{
        boxShadow: selected
          ? `0 0 0 2px ${ACCENT}, 0 8px 20px rgba(16,185,129,0.4)`
          : '0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      {showFace ? (
        <motion.div
          key="face"
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 rounded-lg flex flex-col justify-between p-1.5"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className={`${rankSize} font-extrabold leading-none`} style={{ color: isRed ? '#f87171' : '#f1f5f9' }}>
            {card.rank}
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            {card.rank === 'JOKER' ? (
              <span className="text-[20px]">🃏</span>
            ) : (
              <>
                <span className={`${suitSize} leading-none`} style={{ color: isRed ? '#f87171' : '#f1f5f9' }}>{card.suit}</span>
                {size !== 'sm' && (
                  <span className="text-[10px] font-bold mt-0.5" style={{ color: value < 0 ? '#34d399' : value === 0 ? '#818cf8' : 'rgba(255,255,255,0.4)' }}>
                    {value > 0 ? `+${value}` : value}
                  </span>
                )}
              </>
            )}
          </div>
          <div className={`${rankSize} font-extrabold leading-none self-end rotate-180`} style={{ color: isRed ? '#f87171' : '#f1f5f9' }}>
            {card.rank}
          </div>
        </motion.div>
      ) : (
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #0f1320 0%, #161b2e 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Card back pattern */}
          <div className="absolute inset-[3px] rounded-md opacity-20"
            style={{ background: `repeating-linear-gradient(45deg, ${ACCENT} 0px, ${ACCENT} 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, ${ACCENT} 0px, ${ACCENT} 1px, transparent 1px, transparent 6px)` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[16px] opacity-40">🃏</span>
          </div>
          {card.knownBy.includes(playerId) && !revealed && (
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 4px ${ACCENT}` }} />
          )}
        </div>
      )}
    </motion.button>
  );
}
