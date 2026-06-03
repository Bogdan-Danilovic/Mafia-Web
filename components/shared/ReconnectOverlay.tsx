'use client';

import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function ReconnectOverlay() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(8,11,20,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-full"
              style={{ background: 'rgba(139,92,246,0.4)', border: '1px solid rgba(139,92,246,0.6)' }}
            />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Konekcija prekinuta
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Pokušavam ponovo...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
