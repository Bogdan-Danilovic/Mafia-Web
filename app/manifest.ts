import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Impostor',
    short_name: 'Impostor',
    description: 'Igra socijalnog snalaženja — otkrij ko je impostor!',
    start_url: '/',
    display: 'standalone',
    background_color: '#1e293b',
    theme_color: '#8b5cf6',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
