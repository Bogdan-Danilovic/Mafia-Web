import { toast } from 'sonner';

export const gameToast = {
  playerJoined: (name: string) =>
    toast(`${name} se pridružio/la`, { icon: '🟢', duration: 3000 }),

  playerLeft: (name: string) =>
    toast(`${name} napustio/la igru`, { icon: '🔴', duration: 3000 }),

  gameStarted: () =>
    toast('Igra počinje!', {
      icon: '🎮',
      duration: 4000,
      style: { borderColor: 'rgba(139,92,246,0.8)' },
    }),

  connectionLost: () =>
    toast.error('Konekcija prekinuta — pokušavam ponovo...', {
      duration: Infinity,
      id: 'connection-lost',
    }),

  connectionRestored: () => {
    toast.dismiss('connection-lost');
    toast.success('Konekcija obnovljena', { duration: 3000 });
  },

  roomNotFound: (code: string) =>
    toast.error(`Soba "${code}" ne postoji ili je zatvorena`, { duration: 5000 }),

  error: (message: string) =>
    toast.error(message, { duration: 4000 }),
};
