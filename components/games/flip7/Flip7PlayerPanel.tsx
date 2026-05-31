'use client';

import { motion } from 'framer-motion';
import { Flip7Player } from '@/lib/types/flip7';
import { Flip7Card } from '@/components/games/flip7/Flip7Card';
import { computePlayerRoundScore } from '@/lib/games/flip7/engine';

interface Props {
  player: Flip7Player;
  isSelf: boolean;
  focused: boolean;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  exited: { label: 'STAO', color: '#34d399' },
  busted: { label: 'PUKAO', color: '#f87171' },
  flip7: { label: 'FLIP 7!', color: '#fbbf24' },
};

export function Flip7PlayerPanel({ player, isSelf, focused }: Props) {
  const isOut = player.status === 'busted';
  const pot = computePlayerRoundScore(player);
  const status = STATUS_META[player.status];
  const cards = [...player.numberCards, ...player.modifierCards];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isOut ? 0.5 : 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className="rounded-2xl p-3"
      style={{
        border: `1px solid ${focused ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.07)'}`,
        background: focused
          ? 'linear-gradient(145deg, rgba(245,158,11,0.14), rgba(245,158,11,0.03))'
          : 'rgba(255,255,255,0.025)',
        boxShadow: focused ? '0 0 22px rgba(245,158,11,0.18)' : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: player.isConnected ? '#34d399' : '#475569' }}
          />
          <span className="text-[14px] font-semibold text-amber-50 truncate">{player.name}</span>
          {isSelf && (
            <span className="text-[9px] text-amber-400/70 tracking-[0.12em] uppercase flex-shrink-0">ti</span>
          )}
          {player.isDealer && (
            <span className="text-[9px] text-amber-200/40 tracking-[0.12em] uppercase flex-shrink-0">delilac</span>
          )}
          {focused && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="text-[9px] font-bold text-amber-400 tracking-[0.12em] uppercase flex-shrink-0"
            >
              · na potezu
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: `${status.color}22`, color: status.color }}
            >
              {status.label}
            </span>
          )}
          <div className="text-right">
            <span className="text-[15px] font-bold text-amber-100 tabular-nums">{player.totalScore}</span>
            {!isOut && pot > 0 && (
              <span className="text-[11px] font-semibold text-amber-400/80 tabular-nums ml-1">+{pot}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 min-h-[58px]">
        {cards.length === 0 ? (
          <span className="text-[11px] text-amber-100/25 italic">još bez karata</span>
        ) : (
          cards.map((c, i) => <Flip7Card key={c.id} card={c} size={38} index={i} />)
        )}
        {player.hasDrugaSansa && (
          <span
            className="flex-shrink-0 ml-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg"
            style={{ background: 'rgba(230,57,70,0.15)', color: '#fca5a5' }}
          >
            🛡️ 2. šansa
          </span>
        )}
      </div>
    </motion.div>
  );
}
