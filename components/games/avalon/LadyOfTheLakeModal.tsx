'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvalonRoom, Loyalty } from '@/lib/types/avalon';
import { useLadyOfTheLake } from '@/lib/firestore/avalon';
import { Button } from '@/components/ui/Button';

interface Props {
  room: AvalonRoom;
  holderId: string;
  onClose: () => void;
}

export function LadyOfTheLakeModal({ room, holderId, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [actual, setActual] = useState<Loyalty | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const eligible = room.players.filter(
    (p) => p.isConnected && p.id !== holderId && !room.lady.usedByPlayers.includes(p.id)
  );
  const targetName = room.players.find((p) => p.id === targetId)?.name ?? '';

  function selectTarget(id: string) {
    const loyalty = room.players.find((p) => p.id === id)?.loyalty ?? 'good';
    setTargetId(id);
    setActual(loyalty);
    setStep(2);
  }

  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => {
      setActual(null);
      setStep(3);
    }, 3000);
    return () => clearTimeout(t);
  }, [step]);

  async function declare(alignment: Loyalty) {
    if (!targetId || submitting) return;
    setSubmitting(true);
    await useLadyOfTheLake(room.code, holderId, targetId, alignment);
    setStep(4);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 px-8"
    >
      <div className="w-full max-w-[320px] flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl">💧</span>
          <p className="text-[10px] text-cyan-400/70 tracking-[0.2em] uppercase">Gospa od Jezera</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full flex flex-col gap-2"
            >
              <p className="text-[13px] text-slate-400 text-center mb-2">Koga ćeš istražiti?</p>
              {eligible.map((p) => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => selectTarget(p.id)}
                  className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white/[0.02] border border-transparent hover:bg-cyan-500/[0.06] hover:border-cyan-400/20 transition-all duration-200"
                >
                  <span className="text-[14px] font-medium text-slate-300">{p.name}</span>
                </motion.button>
              ))}
              <button
                onClick={onClose}
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors mt-3"
              >
                Otkaži
              </button>
            </motion.div>
          )}

          {step === 2 && actual && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-4 py-4"
            >
              <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Tajna istina · samo ti</p>
              <h2
                className={`text-[40px] font-bold ${actual === 'good' ? 'text-blue-400' : 'text-red-400'}`}
                style={{
                  textShadow: `0 0 24px ${actual === 'good' ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)'}`,
                }}
              >
                {actual === 'good' ? 'DOBAR' : 'LOŠ'}
              </h2>
              <p className="text-[12px] text-slate-500">{targetName}</p>
              <motion.div
                className="h-0.5 bg-cyan-400/60 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3, ease: 'linear' }}
              />
              <p className="text-[10px] text-slate-600">Nestaje za 3s — zapamti</p>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full flex flex-col gap-3"
            >
              <p className="text-[13px] text-slate-400 text-center mb-1">
                Šta javno izjavljuješ za {targetName}?
              </p>
              <p className="text-[10px] text-slate-600 text-center mb-3">Možeš slagati.</p>
              <Button
                fullWidth
                disabled={submitting}
                onClick={() => declare('good')}
                className="!bg-blue-600/20 !text-blue-300 !border !border-blue-500/30 hover:!bg-blue-600/30"
              >
                Izjavi: DOBAR
              </Button>
              <Button
                fullWidth
                disabled={submitting}
                onClick={() => declare('evil')}
                className="!bg-red-600/20 !text-red-300 !border !border-red-500/30 hover:!bg-red-600/30"
              >
                Izjavi: LOŠ
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-5 py-2"
            >
              <p className="text-[13px] text-slate-400 text-center">
                Token Gospe prelazi na <span className="text-cyan-300 font-semibold">{targetName}</span>.
              </p>
              <Button
                fullWidth
                onClick={onClose}
                className="!bg-cyan-600/30 !text-cyan-200 hover:!bg-cyan-600/40"
              >
                Zatvori
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
