import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '36px',
          gap: '6px',
        }}
      >
        <div style={{ fontSize: 80, lineHeight: 1 }}>🎭</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#a78bfa',
          }}
        >
          IMPOSTOR
        </div>
      </div>
    ),
    { ...size }
  );
}
