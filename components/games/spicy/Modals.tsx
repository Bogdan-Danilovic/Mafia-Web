'use client';

import { motion } from 'framer-motion';
import { SpicyChallengeResult, SpicyPlayer, SpicyClaim } from '@/lib/games/spicy/types';
import { SpicyCardComponent } from '@/components/games/spicy/SpicyCard';
import { SpiceChip, SPICE_CFG } from '@/components/games/spicy/SpiceChip';
import { Button } from '@/components/ui/Button';

// ─── ChallengeModal ───────────────────────────────────────────────────────────
interface ChallengeProps {
  players: SpicyPlayer[];
  cardPlayerIndex: number;
  lastClaim: SpicyClaim;
  isLastCard?: boolean;
  onChallenge: (challengerIndex: number, type: 'spice' | 'number') => void;
  onNoChallenge: () => void;
}

export function ChallengeModal({ players, cardPlayerIndex, lastClaim, isLastCard, onChallenge, onNoChallenge }: ChallengeProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-5">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: '#0f1320', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="mb-6 text-center">
          {isLastCard && <div className="mb-2 text-2xl">🏆</div>}
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400">{isLastCard ? 'Poslednja karta!' : 'Objava'}</div>
          <div className="text-lg font-bold text-white">{players[cardPlayerIndex].name} objavljuje</div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-3xl font-black text-white">{lastClaim.value}</span>
            <SpiceChip spice={lastClaim.spice} size="lg" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <p className="text-xs uppercase tracking-wider text-white/40 text-center mb-3">Ko izaziva?</p>
          {players.map((p, i) => i === cardPlayerIndex ? null : (
            <div key={p.id} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="mb-2 text-sm font-semibold text-white">{p.name}</div>
              <div className="flex gap-2">
                <button onClick={() => onChallenge(i, 'number')} className="flex-1 rounded-xl py-2 text-xs font-bold"
                  style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}>
                  Nije {lastClaim.value}!
                </button>
                <button onClick={() => onChallenge(i, 'spice')} className="flex-1 rounded-xl py-2 text-xs font-bold"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  Nije začin!
                </button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="ghost" fullWidth onClick={onNoChallenge} className="!text-white/50">
          {isLastCard ? 'Ne izazivam' : 'Nastavi'}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── ChallengeResultModal ─────────────────────────────────────────────────────
interface ResultProps {
  result: SpicyChallengeResult;
  players: SpicyPlayer[];
  onConfirm: () => void;
}

export function ChallengeResultModal({ result, players, onConfirm }: ResultProps) {
  const winner = players[result.winnerIndex];
  const loser = players[result.loserIndex];
  const challenger = players[result.challengerIndex];
  const cardPlayer = players[result.playerIndex];
  const challengerWon = result.outcome === 'challenger_wins';
  const cfg = result.topCard.spice ? SPICE_CFG[result.topCard.spice] : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-5">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{ background: '#0f1320', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Otkrivena karta</p>
        <div className="flex justify-center mb-2">
          <motion.div initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
            <SpicyCardComponent card={result.topCard} faceUp size="lg" />
          </motion.div>
        </div>
        {result.topCard.type === 'spicy' && cfg && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xl font-black text-white">{result.topCard.value}</span>
            <SpiceChip spice={result.topCard.spice!} size="md" />
          </div>
        )}
        {result.topCard.type === 'joker_spice' && <p className="mb-3 text-sm text-white/60">Džoker (začin)</p>}
        {result.topCard.type === 'joker_number' && <p className="mb-3 text-sm text-white/60">Džoker (broj)</p>}
        <p className="mb-4 text-sm text-white/50">
          {challenger.name} izazvao <span className="font-semibold text-white">{result.challengeType === 'number' ? 'broj' : 'začin'}</span> od {cardPlayer.name}
        </p>
        <div className="mb-5 rounded-2xl px-4 py-3" style={{ background: challengerWon ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${challengerWon ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
          <div className={`text-xl font-black mb-1 ${challengerWon ? 'text-red-400' : 'text-green-400'}`}>{challengerWon ? '❌ Uhvaćen blef!' : '✅ Objava tačna!'}</div>
          <div className="text-sm text-white/80"><span className="font-semibold text-white">{winner.name}</span> pobedio!</div>
        </div>
        <div className="mb-5 space-y-2 text-sm">
          {[
            { label: `${winner.name} uzima`, val: `${result.pileCardsCount} karte`, color: 'text-white' },
            { label: `${loser.name} vuče`, val: '2 karte', color: 'text-orange-400' },
            { label: 'Novu gomilu počinje', val: loser.name, color: 'text-white' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <span className="text-white/60">{label}</span>
              <span className={`font-bold ${color}`}>{val}</span>
            </div>
          ))}
        </div>
        <Button fullWidth onClick={onConfirm} style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>Nastavi</Button>
      </motion.div>
    </motion.div>
  );
}

// ─── TrophyModal ──────────────────────────────────────────────────────────────
interface TrophyProps { player: SpicyPlayer; trophiesLeft: number; onCollect: () => void; }

export function TrophyModal({ player, trophiesLeft, onCollect }: TrophyProps) {
  const newCount = player.trophies + 1;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-5">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{ background: '#0f1320', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 20px 60px rgba(251,191,36,0.15)' }}>
        <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.6, delay: 0.2 }} className="mb-4 text-6xl">🏆</motion.div>
        <div className="mb-2 text-2xl font-black text-white">{player.name}</div>
        <div className="mb-1 text-sm text-white/60">osvaja trofej!</div>
        <div className="mb-6 text-4xl">{'🏆'.repeat(newCount)}{'⬜'.repeat(2 - newCount)}</div>
        {trophiesLeft > 1 && <p className="mb-4 text-xs text-white/40">Preostala trofeja: {trophiesLeft - 1} · Vuče 6 novih karata</p>}
        {newCount >= 2 && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-4 text-sm font-bold text-yellow-400">
            2 trofeja — automatska pobeda! 🎉
          </motion.p>
        )}
        <Button fullWidth onClick={onCollect}
          style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}
          className="!text-black font-black">
          {newCount >= 2 ? 'Pogledaj rezultate' : 'Nastavi igru'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
