'use client';

import {
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ImpostorRoom, ImpostorPlayer, GameMode, Category, ImpostorSettings } from '@/lib/types/impostor';
import { generateRoomCode, generatePlayerId, selectImpostors, getImpostorCount, tallyVotes, checkWinCondition } from '@/lib/utils';
import { getRandomPrompt } from '@/lib/prompts/index';

import { roomRef, subscribeToRoom } from './core';

function newRoom(code: string, hostId: string, player: ImpostorPlayer): ImpostorRoom {
  return {
    code,
    status: 'lobby',
    hostId,
    gameType: 'impostor',
    gameMode: 'sentences',
    category: 'hrana',
    players: [player],
    impostorIds: [],
    currentPrompt: { crew: '', impostor: '' },
    settings: { impostorCount: 1, revealOnVote: true },
    votes: {},
    eliminatedId: null,
    winner: null,
    round: 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

export async function createRoom(
  playerName: string
): Promise<{ code: string; playerId: string }> {
  const playerId = generatePlayerId();
  const player: ImpostorPlayer = { id: playerId, name: playerName, isConnected: true, isAlive: true };

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

function deduplicateName(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;
  let n = 2;
  while (existing.includes(`${name} ${n}`)) n++;
  return `${name} ${n}`;
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

      const room = snap.data() as ImpostorRoom;
      if (room.status !== 'lobby') throw new Error('Igra je već u toku.');
      if (room.players.length >= 12) throw new Error('Soba je puna (max 12).');

      const existingNames = room.players.map((p) => p.name);
      const uniqueName = deduplicateName(playerName, existingNames);

      const id = generatePlayerId();
      const player: ImpostorPlayer = { id, name: uniqueName, isConnected: true, isAlive: true };
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
    const room = snap.data() as ImpostorRoom;
    tx.update(ref, {
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, isConnected: true } : p
      ),
    });
  });
}

export async function updateRoomSettings(
  code: string,
  updates: { gameMode?: GameMode; category?: Category; settings?: Partial<ImpostorSettings> }
): Promise<void> {
  const ref = roomRef(code);
  if (updates.settings) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as ImpostorRoom;
      tx.update(ref, { ...updates, settings: { ...room.settings, ...updates.settings } });
    });
  } else {
    await updateDoc(ref, updates);
  }
}

export async function shufflePrompt(code: string): Promise<void> {
  const ref = roomRef(code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data() as ImpostorRoom;
  let prompt = getRandomPrompt(room.category, room.gameMode);
  let retries = 0;
  while (prompt.crew === room.currentPrompt.crew && retries < 10) {
    prompt = getRandomPrompt(room.category, room.gameMode);
    retries++;
  }
  await updateDoc(ref, { currentPrompt: prompt });
}

export async function kickPlayer(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as ImpostorRoom;
    tx.update(ref, { players: room.players.filter((p) => p.id !== playerId) });
  });
}

export async function startGame(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as ImpostorRoom;
    const playerIds = room.players.map((p) => p.id);
    const impostorCount = getImpostorCount(playerIds.length, room.settings.impostorCount);
    const impostorIds = selectImpostors(playerIds, impostorCount);
    const prompt = getRandomPrompt(room.category, room.gameMode);
    const players = room.players.map((p) => ({ ...p, isAlive: true, isConnected: true }));

    tx.update(ref, {
      status: 'roleReveal',
      impostorIds,
      currentPrompt: prompt,
      players,
      votes: {},
      eliminatedId: null,
      winner: null,
      round: 1,
    });
  });
}

export async function advanceToDiscussion(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'discussion' });
}

export async function advanceToVoting(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'voting', votes: {} });
}

export async function castVote(
  code: string,
  voterId: string,
  votedForId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as ImpostorRoom;
    if (room.status !== 'voting') return;
    if (room.votes[voterId]) return;
    tx.update(ref, { [`votes.${voterId}`]: votedForId });
  });
}

export async function processVotes(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as ImpostorRoom;
    if (room.status !== 'voting') return;

    const { eliminatedId } = tallyVotes(room.votes);
    const players = eliminatedId
      ? room.players.map((p) => (p.id === eliminatedId ? { ...p, isAlive: false } : p))
      : room.players;
    const winner = eliminatedId ? checkWinCondition(players, room.impostorIds) : null;

    tx.update(ref, { status: 'reveal', eliminatedId, winner, players });
  });
}

export async function nextRound(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as ImpostorRoom;
    tx.update(ref, {
      status: 'discussion',
      votes: {},
      eliminatedId: null,
      round: room.round + 1,
    });
  });
}

export async function finishGame(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'finished' });
}

export async function playAgain(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as ImpostorRoom;

    tx.update(ref, {
      status: 'lobby',
      players: room.players.map((p) => ({ ...p, isAlive: true })),
      impostorIds: [],
      currentPrompt: { crew: '', impostor: '' },
      votes: {},
      eliminatedId: null,
      winner: null,
      round: 1,
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

    const room = snap.data() as ImpostorRoom;
    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: false } : p
    );

    const updates: Partial<ImpostorRoom> & { players: ImpostorPlayer[] } = { players };

    if (room.hostId === playerId) {
      const nextHost = players.find((p) => p.id !== playerId && p.isConnected);
      if (nextHost) updates.hostId = nextHost.id;
    }

    if (room.status !== 'lobby') {
      const connectedAlive = players.filter((p) => p.isConnected && p.isAlive);
      if (connectedAlive.length < 3) {
        updates.status = 'finished';
        updates.winner = null;
      } else if (room.impostorIds.includes(playerId)) {
        const remaining = room.impostorIds.filter((id) => id !== playerId);
        if (remaining.length === 0) {
          updates.status = 'finished';
          updates.winner = 'crew';
        }
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

    const room = snap.data() as ImpostorRoom;

    if (room.status === 'lobby') {
      const players = room.players.filter((p) => p.id !== playerId);
      if (players.length === 0) return;

      const updates: Partial<ImpostorRoom> & { players: ImpostorPlayer[] } = { players };
      if (room.hostId === playerId) updates.hostId = players[0].id;
      tx.update(ref, updates);
    } else {
      const players = room.players.map((p) =>
        p.id === playerId ? { ...p, isConnected: false } : p
      );
      const updates: Partial<ImpostorRoom> & { players: ImpostorPlayer[] } = { players };

      if (room.hostId === playerId) {
        const nextHost = players.find((p) => p.id !== playerId && p.isConnected);
        if (nextHost) updates.hostId = nextHost.id;
      }

      const connectedAlive = players.filter((p) => p.isConnected && p.isAlive);
      if (connectedAlive.length < 3) {
        updates.status = 'finished';
        updates.winner = null;
      } else if (room.impostorIds.includes(playerId)) {
        const remaining = room.impostorIds.filter((id) => id !== playerId);
        if (remaining.length === 0) {
          updates.status = 'finished';
          updates.winner = 'crew';
        }
      }

      tx.update(ref, updates);
    }
  });
}
