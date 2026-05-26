'use client';

import { motion } from 'framer-motion';
import { AvalonRoom, getSabotagesRequired } from '@/lib/types/avalon';
import { advanceFromQuestResult } from '@/lib/firestore/avalon';
import { Button } from '@/components/ui/Button';

interface Props {
  room: AvalonRoom;
  playerId: string;
}

export function QuestResultScreen({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;
  const lastResult = room.missionResults[room.missionResults.length - 1];
  const success = lastResult?.result === 'success';
  const required = getSabotagesRequired(room.players.length, lastResult?.missionNumber ?? 1);

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 px-8 h-screen-safe overflow-hidden">
      <motion.div
        className="fixed inset-0 pointer-events-none"
        animate={{
          background: success
            ? 'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, transparent 70%)',
        }}
        transition={{ duration: 0.8 }}
      />

      <div className="relative w-full max-w-[320px] flex flex-col items-center gap-8">

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase mb-4">
            Misija {lastResult?.missionNumber ?? room.currentMission}
          </p>

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring' as const, stiffness: 150, damping: 12 }}
            className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              success ? 'bg-blue-500/20 border-2 border-blue-400' : 'bg-red-500/20 border-2 border-red-400'
            }`}
          >
            <span className="text-4xl">{success ? '🛡️' : '💀'}</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-[32px] font-bold ${success ? 'text-blue-400' : 'text-red-400'}`}
            style={{ textShadow: `0 0 20px ${success ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)'}` }}
          >
            {success ? 'Uspjeh!' : 'Sabotirano!'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="text-[13px] text-slate-400">
            Sabotaže: <span className={lastResult?.sabotages ? 'text-red-400 font-bold' : 'text-slate-300'}>{lastResult?.sabotages ?? 0}</span>
            {required > 1 && <span className="text-slate-600"> (potrebno {required})</span>}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-8"
        >
          <div className="text-center">
            <p className="text-[28px] font-bold text-blue-400">{room.goodScore}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Dobro</p>
          </div>
          <div className="w-px bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-[28px] font-bold text-red-400">{room.evilScore}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Zlo</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex gap-3"
        >
          {[1, 2, 3, 4, 5].map((m) => {
            const result = room.missionResults.find((r) => r.missionNumber === m);
            return (
              <div
                key={m}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 ${
                  result?.result === 'success'
                    ? 'bg-blue-500/20 border-blue-400 text-blue-400'
                    : result?.result === 'fail'
                      ? 'bg-red-500/20 border-red-400 text-red-400'
                      : 'border-slate-700 text-slate-600'
                }`}
              >
                {m}
              </div>
            );
          })}
        </motion.div>

        {isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="w-full"
          >
            <Button
              fullWidth
              onClick={() => advanceFromQuestResult(room.code)}
              className="!bg-amber-600 hover:!bg-amber-500"
            >
              Nastavi →
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
