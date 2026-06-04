'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import { SpicyCard, SpicyClaim, Spice } from '@/lib/games/spicy/types';
import { isValidClaim } from '@/lib/games/spicy/claimValidator';
import { SpicyCardComponent } from '@/components/games/spicy/SpicyCard';
import { SPICE_CFG } from '@/components/games/spicy/SpiceChip';
import { Button } from '@/components/ui/Button';

const SPICES: Spice[] = ['chili', 'wasabi', 'pepper'];
const VALUES = Array.from({ length: 10 }, (_, i) => i + 1);

interface Props {
  hand: SpicyCard[];
  lastClaim: SpicyClaim | null;
  isFirstOnPile: boolean;
  onConfirm: (cardId: string, claim: SpicyClaim) => void;
  onClose: () => void;
}

export function ClaimModal({ hand, lastClaim, isFirstOnPile, onConfirm, onClose }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [spice, setSpice] = useState<Spice>('chili');
  const [value, setValue] = useState(1);
  const claim: SpicyClaim = { spice, value };
  const valid = selectedCardId !== null && isValidClaim(claim, lastClaim, isFirstOnPile);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl"
        style={{ background: '#0f1320', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="text-base font-bold text-white">Odigraj kartu</div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/50" style={{ background: 'rgba(255,255,255,0.08)' }}><X size={16} /></button>
        </div>
        <div className="px-5 pb-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Izaberi kartu</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {hand.map((c) => <SpicyCardComponent key={c.id} card={c} faceUp selected={selectedCardId === c.id} onClick={() => setSelectedCardId(c.id)} />)}
          </div>
        </div>
        <div className="px-5 pb-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Objavi začin</p>
          <div className="flex gap-2">
            {SPICES.map((s) => {
              const cfg = SPICE_CFG[s]; const active = spice === s;
              return (
                <button key={s} onClick={() => setSpice(s)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
                  style={{ background: active ? `${cfg.color}22` : 'rgba(255,255,255,0.05)', border: `1.5px solid ${active ? cfg.color : 'rgba(255,255,255,0.1)'}`, color: active ? cfg.color : '#94a3b8' }}>
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-5 pb-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Objavi broj</p>
          <div className="grid grid-cols-5 gap-2">
            {VALUES.map((v) => {
              const avail = isValidClaim({ spice, value: v }, lastClaim, isFirstOnPile);
              const active = value === v;
              return (
                <button key={v} onClick={() => avail && setValue(v)} disabled={!avail}
                  className="rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-30"
                  style={{ background: active ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${active ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, color: active ? '#ef4444' : '#e2e8f0' }}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>
        {selectedCardId && (
          <div className="mx-5 mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <span className="text-white/60">Objava: </span>
            <span className="font-bold text-white">{value} </span>
            <span style={{ color: SPICE_CFG[spice].color }}>{SPICE_CFG[spice].emoji} {SPICE_CFG[spice].label}</span>
            {valid ? <CheckCircle size={14} className="ml-2 inline text-green-400" /> : <span className="ml-2 text-red-400 text-xs">Nevažeća objava</span>}
          </div>
        )}
        <div className="px-5 pb-8">
          <Button fullWidth disabled={!valid} onClick={() => valid && selectedCardId && onConfirm(selectedCardId, claim)}
            style={{ background: valid ? 'linear-gradient(135deg,#ef4444,#dc2626)' : undefined, boxShadow: valid ? '0 4px 16px rgba(239,68,68,0.4)' : undefined }}>
            Odigraj
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
