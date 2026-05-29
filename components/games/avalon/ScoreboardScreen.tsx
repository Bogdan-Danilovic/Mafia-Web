'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvalonRoom, getMissionTeamSize, getSabotagesRequired } from '@/lib/types/avalon';
import { advanceFromScoreboard } from '@/lib/firestore/avalon';
import { Button } from '@/components/ui/Button';
import { LadyOfTheLakeToken } from './LadyOfTheLakeToken';
import { LadyOfTheLakeModal } from './LadyOfTheLakeModal';
import { LadyOfTheLakeLog } from './LadyOfTheLakeLog';

interface Props {
  room: AvalonRoom;
  playerId: string;
}

export function ScoreboardScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const [ladyOpen, setLadyOpen] = useState(false);

  const lady = room.lady;
  const gameContinuing = room.goodScore < 3 && room.evilScore < 3;
  const isHolder = lady?.enabled && lady.currentHolder === playerId;
  const holderName = lady?.currentHolder
    ? room.players.find((p) => p.id === lady.currentHolder)?.name
    : null;
  const hasEligibleTarget = room.players.some(
    (p) => p.isConnected && p.id !== lady?.currentHolder && !lady?.usedByPlayers.includes(p.id)
  );

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-y-auto py-10">
      <div className="relative w-full max-w-[360px] flex flex-col items-center gap-8">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-4">Pregled misija</p>

          <div className="flex gap-8 mb-6">
            <div className="text-center">
              <p className="text-[36px] font-bold text-blue-400" style={{ textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                {room.goodScore}
              </p>
              <p className="text-[11px] text-blue-400/60 uppercase tracking-wider">Dobro</p>
            </div>
            <div className="flex items-center">
              <div className="w-px h-12 bg-white/[0.06]" />
            </div>
            <div className="text-center">
              <p className="text-[36px] font-bold text-red-400" style={{ textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                {room.evilScore}
              </p>
              <p className="text-[11px] text-red-400/60 uppercase tracking-wider">Zlo</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full flex justify-center gap-4"
        >
          {[1, 2, 3, 4, 5].map((m) => {
            const result = room.missionResults.find((r) => r.missionNumber === m);
            const teamSize = getMissionTeamSize(room.players.length, m);
            const sabReq = getSabotagesRequired(room.players.length, m);
            return (
              <motion.div
                key={m}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + m * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold border-2 ${
                  result?.result === 'success'
                    ? 'bg-blue-500/20 border-blue-400 text-blue-400'
                    : result?.result === 'fail'
                      ? 'bg-red-500/20 border-red-400 text-red-400'
                      : 'border-slate-700 text-slate-600'
                }`}>
                  {result ? (result.result === 'success' ? '✓' : '✗') : m}
                </div>
                <p className="text-[9px] text-slate-600">
                  {teamSize}p{sabReq > 1 ? '*' : ''}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {room.missionResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full flex flex-col gap-3"
          >
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Historija</p>
            {room.missionResults.map((r) => (
              <div
                key={r.missionNumber}
                className={`flex items-center justify-between py-2.5 px-4 rounded-lg ${
                  r.result === 'success' ? 'bg-blue-500/5' : 'bg-red-500/5'
                }`}
              >
                <span className="text-[12px] text-slate-400">Misija {r.missionNumber}</span>
                <div className="flex items-center gap-3">
                  {r.sabotages > 0 && (
                    <span className="text-[11px] text-red-400/70">{r.sabotages} sab.</span>
                  )}
                  <span className={`text-[12px] font-bold ${
                    r.result === 'success' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {r.result === 'success' ? 'Uspjeh' : 'Neuspjeh'}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {lady?.enabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="w-full flex flex-col gap-4 pt-2"
          >
            {holderName && (
              <div className="flex items-center justify-center gap-2">
                <LadyOfTheLakeToken size="md" />
                <span className="text-[12px] text-slate-400">
                  Gospu drži <span className="text-cyan-300 font-semibold">{holderName}</span>
                </span>
              </div>
            )}

            <LadyOfTheLakeLog room={room} />

            {isHolder && gameContinuing && hasEligibleTarget && (
              <Button
                fullWidth
                onClick={() => setLadyOpen(true)}
                className="!bg-cyan-600/30 !text-cyan-200 hover:!bg-cyan-600/40"
              >
                💧 Koristi Gospu od Jezera
              </Button>
            )}
          </motion.div>
        )}

        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="w-full pt-4"
          >
            <Button
              fullWidth
              onClick={() => advanceFromScoreboard(room.code)}
              className="!bg-amber-600 hover:!bg-amber-500"
            >
              Nastavi →
            </Button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {ladyOpen && isHolder && (
          <LadyOfTheLakeModal
            room={room}
            holderId={playerId}
            onClose={() => setLadyOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
