'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { GAMES, type GameDefinition } from '@/lib/games/registry';
import { HeroCard } from './HeroCard';
import { MoodChip } from './MoodChip';
import { GameRow } from './GameRow';

const MOOD_ACCENTS = ['#8b5cf6', '#0891b2', '#ef4444', '#f59e0b', '#059669', '#64d2ff', '#bf5af2', '#ff375f'];
const HERO_INTERVAL_MS = 3500;

/**
 * The "Igre" view: visual search, featured hero carousel (autoplay + dots),
 * mood filter chips, and the full game list. Tapping a game row routes straight
 * to its existing page (g.path) — routing unchanged.
 * Assumes a parent column with px-5 horizontal padding (full-bleed via -mx-5).
 */
export function HubScreen() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [activeMood, setActiveMood] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);

  const featured = useMemo(() => GAMES.filter((g) => g.available).slice(0, 3), []);
  const moods = useMemo(() => ['Sve', ...Array.from(new Set(GAMES.flatMap((g) => g.tags)))], []);
  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = activeMood === 0 ? GAMES : GAMES.filter((g) => g.tags.includes(moods[activeMood]));
    if (q) {
      base = base.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.shortDescription.toLowerCase().includes(q) ||
          g.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return base;
  }, [activeMood, moods, searchQuery]);

  useEffect(() => {
    if (reduce || featured.length <= 1) return;
    const id = window.setInterval(() => setHeroIndex((i) => (i + 1) % featured.length), HERO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduce, featured.length]);

  useEffect(() => {
    const el = heroRef.current;
    if (el) el.scrollTo({ left: heroIndex * el.offsetWidth, behavior: reduce ? 'auto' : 'smooth' });
  }, [heroIndex, reduce]);

  const enterGame = (game: GameDefinition) => {
    if (game.available) router.push(game.path);
  };

  return (
    <div className="w-full" style={{ animation: 'gh-slide 0.3s ease both' }}>
      {/* Search */}
      <label className="mb-7 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 focus-within:border-white/25 transition-colors">
        <Search size={16} strokeWidth={2} className="shrink-0 text-white/35" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setActiveMood(0); }}
          placeholder="Pretraži igrice…"
          className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/30 outline-none"
        />
      </label>

      {/* Featured hero carousel */}
      <div ref={heroRef} className="gh-noscroll -mx-5 mb-2.5 flex overflow-x-hidden">
        {featured.map((g, i) => (
          <HeroCard key={g.id} game={g} active={i === heroIndex} />
        ))}
      </div>
      <div className="mb-8 flex justify-center gap-1.5">
        {featured.map((g, i) => (
          <button
            key={g.id}
            type="button"
            aria-label={`Prikaži ${g.name}`}
            onClick={() => setHeroIndex(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === heroIndex ? 20 : 6,
              background: i === heroIndex ? '#fff' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </div>

      {/* Mood filter */}
      <div className="mb-7">
        <div className="mb-3.5 text-[22px] font-extrabold tracking-[-0.5px] text-white">Po raspoloženju</div>
        <div className="gh-noscroll -mx-5 flex gap-2.5 overflow-x-auto px-5">
          {moods.map((m, i) => (
            <MoodChip
              key={m}
              label={m}
              accent={MOOD_ACCENTS[i % MOOD_ACCENTS.length]}
              active={i === activeMood}
              onClick={() => setActiveMood(i)}
            />
          ))}
        </div>
      </div>

      {/* Game list */}
      <div className="mb-2 text-[22px] font-extrabold tracking-[-0.5px] text-white">Sve igrice</div>
      <div
        className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.06]"
        style={{ animation: 'gh-fade 0.4s ease both' }}
      >
        {visible.map((g, i) => (
          <div key={g.id}>
            <GameRow game={g} onOpen={enterGame} />
            {i < visible.length - 1 && <div className="ml-[86px] h-px bg-white/[0.09]" />}
          </div>
        ))}
      </div>
    </div>
  );
}
