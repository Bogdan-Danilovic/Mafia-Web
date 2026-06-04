'use client';

import { useEffect, useRef } from 'react';
import { GarticStroke } from '@/lib/types/gartic';

interface Props {
  onStrokesChange: (strokes: GarticStroke[]) => void;
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
  onClear?: () => void;
  externalClear?: number;
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: GarticStroke[], w: number, h: number) {
  strokes.forEach((stroke) => {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * Math.min(w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(stroke.points[0][0] * w, stroke.points[0][1] * h);
    stroke.points.slice(1).forEach(([x, y]) => ctx.lineTo(x * w, y * h));
    ctx.stroke();
  });
}

export function GarticCanvas({ onStrokesChange, color, width, tool, externalClear }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<GarticStroke[]>([]);
  const currentRef = useRef<[number, number][]>([]);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    strokesRef.current = [];
    currentRef.current = [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onStrokesChange([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalClear]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ro = new ResizeObserver(() => {
      const { width: w, height: h } = container.getBoundingClientRect();
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      drawStrokes(ctx, strokesRef.current, w, h);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  function repaint() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStrokes(ctx, strokesRef.current, canvas.width, canvas.height);
    if (currentRef.current.length >= 2) {
      const partial: GarticStroke = {
        points: currentRef.current,
        color: tool === 'eraser' ? '#ffffff' : color,
        width,
        tool,
      };
      drawStrokes(ctx, [partial], canvas.width, canvas.height);
    }
  }

  function getPos(e: React.MouseEvent | React.TouchEvent): [number, number] | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (clientX === undefined || clientY === undefined) return null;
    return [(clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height];
  }

  function onStart(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    isDrawingRef.current = true;
    currentRef.current = [pos];
    repaint();
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    currentRef.current.push(pos);
    repaint();
  }

  function onEnd() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentRef.current.length < 2) { currentRef.current = []; return; }
    const stroke: GarticStroke = {
      points: [...currentRef.current],
      color: tool === 'eraser' ? '#ffffff' : color,
      width,
      tool,
    };
    strokesRef.current = [...strokesRef.current, stroke];
    currentRef.current = [];
    onStrokesChange([...strokesRef.current]);
    repaint();
  }

  return (
    <div ref={containerRef} className="relative w-full h-full touch-none select-none"
      style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
    </div>
  );
}

export async function generateThumbnail(canvas: HTMLCanvasElement): Promise<string> {
  const thumb = document.createElement('canvas');
  thumb.width = 120;
  thumb.height = 90;
  const ctx = thumb.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 120, 90);
  ctx.drawImage(canvas, 0, 0, 120, 90);
  return thumb.toDataURL('image/jpeg', 0.7);
}

export function getCanvasElement(): HTMLCanvasElement | null {
  return document.querySelector('canvas');
}
