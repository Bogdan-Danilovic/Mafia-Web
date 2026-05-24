/**
 * Generiše PWA ikone za manifest.
 * Pokreni: node scripts/generate-icons.mjs
 * Zahteva: canvas paket (npm install canvas --save-dev)
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;

  // Rounded rect
  const radius = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Mask emoji (theater masks)
  ctx.font = `${size * 0.45}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎭', size / 2, size * 0.42);

  // "IMPOSTOR" text
  ctx.fillStyle = '#a78bfa';
  ctx.font = `bold ${size * 0.09}px sans-serif`;
  ctx.letterSpacing = `${size * 0.01}px`;
  ctx.fillText('IMPOSTOR', size / 2, size * 0.75);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

generateIcon(192, 'public/icon-192.png');
generateIcon(512, 'public/icon-512.png');
console.log('Done!');
