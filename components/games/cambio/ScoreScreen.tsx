'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CambioRoom } from '@/lib/types/cambio';
import { CardComponent } from './CardComponent';
import { Button } from '@/components/shared/Button';
import { playAgain, leaveRoom } from '@/lib/firestore/cambio';
import { computeScores } from './scoring';
import { hexA } from '@/lib/utils';

const ACCENT = '#10b981';

export function ScoreScreen({ room, playerId }: { room: CambioRoom; playerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'again' | 'leave' | null>(null);
  const isHost = room.hostId === playerId;

  const scores = computeScores(room.players, room.cambioCalledBy);
  const winner = scores.find(s => s.isWinner);

  async function handlePlayAgain() {
    setLoading('again');
    await playAgain(room.code);
    setLoading(null);
  }

  async function handleLeave() {
    setLoading('leave');
    await leaveRoom(room.code, playerId);
    router.push('/');
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-5 px-5 pb-12 pt-12">

        {/* Winner banner */}
        {winner && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className="rounded-3xl p-6 text-center"
            style={{ background: `linear-gradient(160deg,${hexA(ACCENT, 0.3)} 0%,rgba(0,0,0,0.85) 100%)`, border: `1px solid ${hexA(ACCENT, 0.3)}`, boxShadow: `0 20px 60px ${hexA(ACCENT, 0.25)}` }}>
            <div className="text-5xl mb-2">🏆</div>
            <div className="text-2xl font-extrabold text-white">{winner.name}</div>
            <div className="text-sm text-white/60 mt-1">pobednik sa <span className="font-bold text-emerald-400">{winner.total}</span> bodova</div>
            {winner.playerId === playerId && (
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="mt-3 text-[13px] font-semibold text-emerald-400">
                🎉 Ti si pobedio!
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Scores */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/[0.05] overflow-hidden">
          {scores.map((entry, i) => {
            const player = room.players.find(p => p.id === entry.playerId)!;
            return (
              <div key={entry.playerId} className={`flex items-start gap-4 px-4 py-4 ${i > 0 ? 'border-t border-white/[0.07]' : ''}`}
                style={{ background: entry.isWinner ? hexA(ACCENT, 0.08) : 'transparent' }}>
                <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-[13px] font-extrabold"
                  style={{ background: i === 0 ? `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.7)})` : 'rgba(255,255,255,0.08)', color: i === 0 ? '#000' : 'rgba(255,255,255,0.5)' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${entry.playerId === playerId ? 'text-emerald-400' : 'text-white'}`}>{entry.name}</span>
                    {entry.calledCambio && <span className="text-[9px] rounded-full px-2 py-0.5 bg-yellow-500/20 text-yellow-400 uppercase tracking-wide">cambio</span>}
                    {player.isAI && <span className="text-[9px] text-blue-400/60 uppercase">cpu</span>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {player.cards.map((card, ci) => (
                      <CardComponent key={ci} card={card} playerId={entry.playerId} revealed size="sm" />
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2 text-[11px]">
                    <span className="text-white/40">Karte: <span className="text-white/70 font-semibold">{entry.cardScore}</span></span>
                    {entry.penalties > 0 && <span className="text-red-400">Kazne: +{entry.penalties}</span>}
                    <span className="font-bold" style={{ color: entry.isWinner ? ACCENT : 'rgba(255,255,255,0.7)' }}>Ukupno: {entry.total}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Cambio caller note */}
        {room.cambioCalledBy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-center text-[12px] text-white/30">
            Cambio pozvao: <span className="text-white/50">{room.players.find(p => p.id === room.cambioCalledBy)?.name}</span>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col gap-3">
          {isHost && (
            <Button fullWidth onClick={handlePlayAgain} disabled={loading !== null}
              className="!rounded-2xl !text-white"
              style={{ background: `linear-gradient(135deg,${ACCENT},${hexA(ACCENT, 0.8)})`, boxShadow: `0 4px 16px ${hexA(ACCENT, 0.4)}` }}>
              {loading === 'again' ? 'Resetovanje...' : 'Igraj ponovo'}
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={handleLeave} disabled={loading !== null} className="!text-emerald-100/40 hover:!text-emerald-100/70">
            Napusti sobu
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
