'use client';

import { motion } from 'framer-motion';

interface Props {
  size?: 'sm' | 'md';
}

export function LadyOfTheLakeToken({ size = 'sm' }: Props) {
  const sizing = size === 'md' ? 'text-[15px] px-2.5 py-1' : 'text-[11px] px-2 py-0.5';
  return (
    <motion.span
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring' as const, stiffness: 400, damping: 18 }}
      className={`inline-flex items-center gap-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 leading-none ${sizing}`}
      style={{ boxShadow: '0 0 12px rgba(34,211,238,0.25)' }}
      title="Gospa od Jezera"
    >
      💧
    </motion.span>
  );
}
