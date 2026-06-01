import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Firebase Google sign-in koristi popup koji mora moći da komunicira sa
  // opener prozorom. Restriktivan COOP (same-origin) blokira window.close i
  // Firebase to prijavi kao auth/popup-blocked. same-origin-allow-popups
  // zadržava izolaciju ali dozvoljava popup auth flow.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
