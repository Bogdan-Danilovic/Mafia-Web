'use client';

import { getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Flip7Room, Flip7Player, Flip7Settings } from '@/lib/types/flip7';
import { generateRoomCode, generatePlayerId } from '@/lib/utils';
import { createShuffledFlip7Deck } from '@/lib/games/flip7/deck';
import {
  applyDealtCard,
  calculateRoundScores,
  activePlayerCount,
  nextActiveIndex,
  drawCard,
  makeDrugaSansaCard,
} from '@/lib/games/flip7/engine';

import { roomRef, subscribeToRoom } from './core';

export { subscribeToRoom };

const MAX_PLAYERS = 18;
const MIN_PLAYERS = 2;
const DEFAULT_TARGET = 200;

function newPlayer(id: string, name: string): Flip7Player {
  return {
    id,
    name,
    isConnected: true,
    numberCards: [],
    modifierCards: [],
    hasDrugaSansa: false,
    status: 'active',
    roundScore: 0,
    totalScore: 0,
    isDealer: false,
  };
}

function newRoom(code: string, hostId: string, player: Flip7Player): Flip7Room {
  return {
    code,
    status: 'lobby',
    gameType: 'flip7',
    hostId,
    players: [player],
    settings: { targetScore: DEFAULT_TARGET },
    deck: [],
    discardPile: [],
    currentDealerIndex: 0,
    currentTargetIndex: 0,
    winnerId: null,
    pendingAction: { type: null, byPlayerId: null },
    lastEvent: null,
    roundNumber: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

function deduplicateName(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;
  let n = 2;
  while (existing.includes(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

function nextConnectedDealer(players: Flip7Player[], from: number): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const j = (from + i) % n;
    if (players[j].isConnected) return j;
  }
  return (from + 1) % n;
}

function highestScorerId(players: Flip7Player[]): string | null {
  const connected = players.filter((p) => p.isConnected);
  const pool = connected.length > 0 ? connected : players;
  if (pool.length === 0) return null;
  return pool.reduce((best, p) => (p.totalScore > best.totalScore ? p : best), pool[0]).id;
}

export async function createRoom(
  playerName: string
): Promise<{ code: string; playerId: string }> {
  const playerId = generatePlayerId();
  const player = newPlayer(playerId, playerName);

  let attempts = 0;
  while (attempts < 5) {
    const code = generateRoomCode();
    const ref = roomRef(code);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, newRoom(code, playerId, player));
      return { code, playerId };
    }
    attempts++;
  }
  throw new Error('Nije moguće kreirati sobu. Pokušaj ponovo.');
}

export async function joinRoom(
  code: string,
  playerName: string
): Promise<{ playerId: string; error?: string }> {
  const ref = roomRef(code);

  try {
    const playerId = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Soba ne postoji.');

      const room = snap.data() as Flip7Room;
      if (room.status !== 'lobby') throw new Error('Igra je već u toku.');
      if (room.players.length >= MAX_PLAYERS)
        throw new Error(`Soba je puna (max ${MAX_PLAYERS}).`);

      const existingNames = room.players.map((p) => p.name);
      const id = generatePlayerId();
      const player = newPlayer(id, deduplicateName(playerName, existingNames));
      tx.update(ref, { players: [...room.players, player] });
      return id;
    });

    return { playerId };
  } catch (err) {
    return { playerId: '', error: err instanceof Error ? err.message : 'Greška.' };
  }
}

export async function rejoinRoom(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as Flip7Room;
    tx.update(ref, {
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, isConnected: true } : p
      ),
    });
  });
}

export async function updateSettings(
  code: string,
  settings: Partial<Flip7Settings>
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as Flip7Room;
    tx.update(ref, { settings: { ...room.settings, ...settings } });
  });
}

export async function kickPlayer(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as Flip7Room;
    tx.update(ref, { players: room.players.filter((p) => p.id !== playerId) });
  });
}

export async function startGame(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    if (room.players.length < MIN_PLAYERS)
      throw new Error(`Potrebno je najmanje ${MIN_PLAYERS} igrača.`);

    const dealerIndex = Math.floor(Math.random() * room.players.length);
    const players = room.players.map((p, i) => ({
      ...p,
      isConnected: true,
      numberCards: [],
      modifierCards: [],
      hasDrugaSansa: false,
      status: 'active' as const,
      roundScore: 0,
      totalScore: 0,
      isDealer: i === dealerIndex,
    }));

    tx.update(ref, {
      status: 'playing',
      players,
      deck: createShuffledFlip7Deck(),
      discardPile: [],
      currentDealerIndex: dealerIndex,
      currentTargetIndex: dealerIndex,
      pendingAction: { type: null, byPlayerId: null },
      winnerId: null,
      roundNumber: 1,
      lastEvent: `Runda 1 počinje. Delilac: ${players[dealerIndex].name}.`,
    });
  });
}

export async function sayDosta(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    if (room.status !== 'playing' || room.pendingAction.type !== null) return;

    const idx = room.currentTargetIndex;
    const p = room.players[idx];
    if (!p || p.id !== playerId || p.status !== 'active') return;

    const players = room.players.map((q, i) =>
      i === idx ? { ...q, status: 'exited' as const } : q
    );

    const updates: Record<string, unknown> = {
      players,
      lastEvent: `${p.name} kaže Dosta i izlazi iz runde.`,
    };

    if (activePlayerCount(players) === 0) {
      updates.players = calculateRoundScores(players);
      updates.status = 'round_end';
    } else {
      updates.currentTargetIndex = nextActiveIndex(players, idx);
    }

    tx.update(ref, updates);
  });
}

export async function sayJosJednu(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    if (room.status !== 'playing' || room.pendingAction.type !== null) return;

    const idx = room.currentTargetIndex;
    const p = room.players[idx];
    if (!p || p.id !== playerId || p.status !== 'active') return;

    const drawn = drawCard(room.deck, room.discardPile);
    if (!drawn.card) {
      tx.update(ref, {
        players: calculateRoundScores(room.players),
        status: 'round_end',
        lastEvent: 'Nema više karata — runda se završava.',
      });
      return;
    }

    const res = applyDealtCard(room.players, idx, drawn.card, drawn.discard, false);

    const updates: Record<string, unknown> = {
      deck: drawn.deck,
      discardPile: res.discard,
      players: res.players,
      lastEvent: res.event,
    };

    if (res.flip7) {
      updates.players = calculateRoundScores(res.players);
      updates.status = 'round_end';
    } else if (res.pendingStop) {
      updates.pendingAction = { type: 'stop', byPlayerId: playerId };
    } else if (res.pendingOkreniTri) {
      updates.pendingAction = { type: 'okreni_tri', byPlayerId: playerId };
    } else if (activePlayerCount(res.players) === 0) {
      updates.players = calculateRoundScores(res.players);
      updates.status = 'round_end';
    } else {
      updates.currentTargetIndex = nextActiveIndex(res.players, idx);
    }

    tx.update(ref, updates);
  });
}

export async function applyStop(code: string, targetId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    if (room.status !== 'playing' || room.pendingAction.type !== 'stop') return;

    const target = room.players.find((p) => p.id === targetId);
    if (!target || target.status !== 'active') return;

    const players = room.players.map((p) =>
      p.id === targetId ? { ...p, status: 'exited' as const } : p
    );

    const updates: Record<string, unknown> = {
      players,
      pendingAction: { type: null, byPlayerId: null },
      lastEvent: `${target.name} je zaustavljen i bezbedno izlazi.`,
    };

    if (activePlayerCount(players) === 0) {
      updates.players = calculateRoundScores(players);
      updates.status = 'round_end';
    } else {
      updates.currentTargetIndex = nextActiveIndex(players, room.currentTargetIndex);
    }

    tx.update(ref, updates);
  });
}

export async function applyOkreniTri(code: string, targetId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    if (room.status !== 'playing' || room.pendingAction.type !== 'okreni_tri') return;

    const tIdx = room.players.findIndex((p) => p.id === targetId);
    if (tIdx < 0 || room.players[tIdx].status !== 'active') return;

    let players = room.players;
    let deck = room.deck;
    let discard = room.discardPile;
    let deferredStop = false;
    let flip7 = false;
    const events: string[] = [`Okreni tri: ${room.players[tIdx].name}.`];

    for (let k = 0; k < 3; k++) {
      const drawn = drawCard(deck, discard);
      if (!drawn.card) break;
      deck = drawn.deck;
      discard = drawn.discard;

      const res = applyDealtCard(players, tIdx, drawn.card, discard, true);
      players = res.players;
      discard = res.discard;
      events.push(res.event);

      if (res.pendingStop) deferredStop = true;
      if (res.flip7) {
        flip7 = true;
        break;
      }
      if (res.busted) break;
    }

    const updates: Record<string, unknown> = {
      deck,
      discardPile: discard,
      players,
      lastEvent: events.join(' '),
    };

    const targetStillActive = players[tIdx].status === 'active';

    if (flip7) {
      updates.players = calculateRoundScores(players);
      updates.status = 'round_end';
      updates.pendingAction = { type: null, byPlayerId: null };
    } else if (deferredStop && targetStillActive) {
      updates.pendingAction = { type: 'stop', byPlayerId: targetId };
    } else {
      updates.pendingAction = { type: null, byPlayerId: null };
      if (activePlayerCount(players) === 0) {
        updates.players = calculateRoundScores(players);
        updates.status = 'round_end';
      } else {
        updates.currentTargetIndex = nextActiveIndex(players, room.currentTargetIndex);
      }
    }

    tx.update(ref, updates);
  });
}

/**
 * Host-only escape hatch for the disconnect-stall edge: when the player the game
 * is waiting on (the current target, or the chooser of a pending Stop/Okreni tri)
 * has dropped offline, the host forces them to exit the round safely (banking
 * their points, like "Dosta"), clears any pending action, and advances the turn.
 */
export async function hostSkipTarget(code: string, hostId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    if (room.status !== 'playing') return;
    if (room.hostId !== hostId) return;

    const blockerId =
      room.pendingAction.type !== null
        ? room.pendingAction.byPlayerId
        : (room.players[room.currentTargetIndex]?.id ?? null);
    if (!blockerId) return;

    const blocker = room.players.find((p) => p.id === blockerId);
    if (!blocker || blocker.isConnected) return;

    const players = room.players.map((p) =>
      p.id === blockerId && p.status === 'active' ? { ...p, status: 'exited' as const } : p
    );

    const updates: Record<string, unknown> = {
      players,
      pendingAction: { type: null, byPlayerId: null },
      lastEvent: `Domaćin je preskočio igrača ${blocker.name} (nije povezan).`,
    };

    if (activePlayerCount(players) === 0) {
      updates.players = calculateRoundScores(players);
      updates.status = 'round_end';
    } else {
      updates.currentTargetIndex = nextActiveIndex(players, room.currentTargetIndex);
    }

    tx.update(ref, updates);
  });
}

export async function nextRound(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    if (room.status !== 'round_end') return;

    const target = room.settings.targetScore ?? DEFAULT_TARGET;
    const maxScore = Math.max(...room.players.map((p) => p.totalScore));

    if (maxScore >= target) {
      const leaders = room.players.filter((p) => p.totalScore === maxScore);
      if (leaders.length === 1) {
        tx.update(ref, {
          status: 'finished',
          winnerId: leaders[0].id,
          lastEvent: `${leaders[0].name} pobeđuje sa ${maxScore} poena!`,
        });
        return;
      }
    }

    const discard = [...room.discardPile];
    for (const p of room.players) {
      discard.push(...p.numberCards, ...p.modifierCards);
      if (p.hasDrugaSansa) discard.push(makeDrugaSansaCard());
    }

    const dealerIndex = nextConnectedDealer(room.players, room.currentDealerIndex);
    const players = room.players.map((p, i) => ({
      ...p,
      numberCards: [],
      modifierCards: [],
      hasDrugaSansa: false,
      status: 'active' as const,
      roundScore: 0,
      isDealer: i === dealerIndex,
    }));

    tx.update(ref, {
      status: 'playing',
      players,
      discardPile: discard,
      currentDealerIndex: dealerIndex,
      currentTargetIndex: dealerIndex,
      pendingAction: { type: null, byPlayerId: null },
      roundNumber: room.roundNumber + 1,
      lastEvent: `Runda ${room.roundNumber + 1} počinje. Delilac: ${players[dealerIndex].name}.`,
    });
  });
}

export async function playAgain(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    const players = room.players.map((p) => ({
      ...p,
      numberCards: [],
      modifierCards: [],
      hasDrugaSansa: false,
      status: 'active' as const,
      roundScore: 0,
      totalScore: 0,
      isDealer: false,
    }));

    tx.update(ref, {
      status: 'lobby',
      players,
      deck: [],
      discardPile: [],
      currentDealerIndex: 0,
      currentTargetIndex: 0,
      pendingAction: { type: null, byPlayerId: null },
      winnerId: null,
      lastEvent: null,
      roundNumber: 0,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  });
}

export async function setPlayerDisconnected(
  code: string,
  playerId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;
    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: false } : p
    );

    const updates: Record<string, unknown> = { players };

    if (room.hostId === playerId) {
      const nextHost = players.find((p) => p.id !== playerId && p.isConnected);
      if (nextHost) updates.hostId = nextHost.id;
    }

    if (room.status !== 'lobby' && room.status !== 'finished') {
      const connected = players.filter((p) => p.isConnected);
      if (connected.length < MIN_PLAYERS) {
        updates.status = 'finished';
        updates.winnerId = highestScorerId(players);
        updates.lastEvent = 'Premalo igrača — igra je završena.';
      }
    }

    tx.update(ref, updates);
  });
}

export async function leaveRoom(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as Flip7Room;

    if (room.status === 'lobby') {
      const players = room.players.filter((p) => p.id !== playerId);
      if (players.length === 0) return;

      const updates: Record<string, unknown> = { players };
      if (room.hostId === playerId) updates.hostId = players[0].id;
      tx.update(ref, updates);
      return;
    }

    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: false } : p
    );
    const updates: Record<string, unknown> = { players };

    if (room.hostId === playerId) {
      const nextHost = players.find((p) => p.id !== playerId && p.isConnected);
      if (nextHost) updates.hostId = nextHost.id;
    }

    if (room.status !== 'finished') {
      const connected = players.filter((p) => p.isConnected);
      if (connected.length < MIN_PLAYERS) {
        updates.status = 'finished';
        updates.winnerId = highestScorerId(players);
        updates.lastEvent = 'Premalo igrača — igra je završena.';
      }
    }

    tx.update(ref, updates);
  });
}
