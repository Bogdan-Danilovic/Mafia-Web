'use client';

import {
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AliasRoom, AliasPlayer, AliasSettings } from '@/lib/types/alias';
import { generateRoomCode, generatePlayerId, shuffleArray } from '@/lib/utils';
import { getRandomWords } from '@/lib/prompts/alias';

import { roomRef, subscribeToRoom } from './core';

function newRoom(code: string, hostId: string, player: AliasPlayer): AliasRoom {
  return {
    code,
    status: 'lobby',
    gameType: 'alias',
    hostId,
    players: [player],
    settings: { roundDuration: 60, targetScore: 30 },
    teams: { a: [], b: [] },
    scores: { a: 0, b: 0 },
    currentTeam: 'a',
    currentExplainerIndex: { a: 0, b: 0 },
    currentWord: null,
    wordsQueue: [],
    roundResults: [],
    round: 1,
    roundEndTime: null,
    createdAt: Date.now(),
  };
}

export async function createRoom(
  playerName: string
): Promise<{ code: string; playerId: string }> {
  const playerId = generatePlayerId();
  const player: AliasPlayer = {
    id: playerId,
    name: playerName,
    isConnected: true,
    teamId: null,
  };

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

      const room = snap.data() as AliasRoom;
      if (room.status !== 'lobby') throw new Error('Igra je već u toku.');
      if (room.players.length >= 16) throw new Error('Soba je puna (max 16).');

      const existingNames = room.players.map((p) => p.name);
      const uniqueName = deduplicateName(playerName, existingNames);

      const id = generatePlayerId();
      const player: AliasPlayer = {
        id,
        name: uniqueName,
        isConnected: true,
        teamId: null,
      };
      tx.update(ref, { players: [...room.players, player] });
      return id;
    });

    return { playerId };
  } catch (err) {
    return {
      playerId: '',
      error: err instanceof Error ? err.message : 'Greška.',
    };
  }
}

export async function rejoinRoom(
  code: string,
  playerId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;
    tx.update(ref, {
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, isConnected: true } : p
      ),
    });
  });
}

export async function updateSettings(
  code: string,
  settings: Partial<AliasSettings>
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;
    tx.update(ref, { settings: { ...room.settings, ...settings } });
  });
}

export async function kickPlayer(
  code: string,
  playerId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;
    tx.update(ref, {
      players: room.players.filter((p) => p.id !== playerId),
    });
  });
}

export async function startGame(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AliasRoom;
    const playerIds = shuffleArray(room.players.map((p) => p.id));
    const half = Math.ceil(playerIds.length / 2);
    const teamA = playerIds.slice(0, half);
    const teamB = playerIds.slice(half);

    const players = room.players.map((p) => ({
      ...p,
      isConnected: true,
      teamId: (teamA.includes(p.id) ? 'a' : 'b') as 'a' | 'b',
    }));

    const words = getRandomWords(50);

    tx.update(ref, {
      status: 'roundStart',
      players,
      teams: { a: teamA, b: teamB },
      scores: { a: 0, b: 0 },
      currentTeam: 'a',
      currentExplainerIndex: { a: 0, b: 0 },
      currentWord: null,
      wordsQueue: words,
      roundResults: [],
      round: 1,
      roundEndTime: null,
    });
  });
}

export async function advanceToExplaining(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;

    const queue = [...room.wordsQueue];
    const word = queue.shift() || null;

    tx.update(ref, {
      status: 'explaining',
      currentWord: word,
      wordsQueue: queue,
      roundResults: [],
      roundEndTime: Date.now() + room.settings.roundDuration * 1000,
    });
  });
}

export async function scoreWord(
  code: string,
  result: 'correct' | 'wrong'
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;
    if (!room.currentWord) return;

    const team = room.currentTeam;
    const delta = result === 'correct' ? 1 : -1;

    const queue = [...room.wordsQueue];
    const nextWord = queue.shift() || null;

    if (queue.length < 5) {
      queue.push(...getRandomWords(30));
    }

    tx.update(ref, {
      roundResults: [
        ...room.roundResults,
        { word: room.currentWord, result },
      ],
      scores: { ...room.scores, [team]: room.scores[team] + delta },
      currentWord: nextWord,
      wordsQueue: queue,
    });
  });
}

export async function skipWord(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;
    if (!room.currentWord) return;

    const queue = [...room.wordsQueue];
    const nextWord = queue.shift() || null;

    if (queue.length < 5) {
      queue.push(...getRandomWords(30));
    }

    tx.update(ref, {
      roundResults: [
        ...room.roundResults,
        { word: room.currentWord, result: 'skipped' as const },
      ],
      currentWord: nextWord,
      wordsQueue: queue,
    });
  });
}

export async function endRound(code: string): Promise<void> {
  await updateDoc(roomRef(code), {
    status: 'roundEnd',
    currentWord: null,
    roundEndTime: null,
  });
}

export async function advanceToScoreboard(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'scoreboard' });
}

export async function nextRound(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;

    if (
      room.scores.a >= room.settings.targetScore ||
      room.scores.b >= room.settings.targetScore
    ) {
      tx.update(ref, { status: 'finished' });
      return;
    }

    const currentTeam = room.currentTeam;
    const nextTeam: 'a' | 'b' = currentTeam === 'a' ? 'b' : 'a';

    const nextExplainerIndex = {
      ...room.currentExplainerIndex,
      [currentTeam]:
        (room.currentExplainerIndex[currentTeam] + 1) %
        room.teams[currentTeam].length,
    };

    const words = getRandomWords(50);

    tx.update(ref, {
      status: 'roundStart',
      currentTeam: nextTeam,
      currentExplainerIndex: nextExplainerIndex,
      currentWord: null,
      wordsQueue: words,
      roundResults: [],
      round: room.round + 1,
      roundEndTime: null,
    });
  });
}

export async function playAgain(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AliasRoom;

    tx.update(ref, {
      status: 'lobby',
      players: room.players.map((p) => ({ ...p, teamId: null })),
      teams: { a: [], b: [] },
      scores: { a: 0, b: 0 },
      currentTeam: 'a',
      currentExplainerIndex: { a: 0, b: 0 },
      currentWord: null,
      wordsQueue: [],
      roundResults: [],
      round: 1,
      roundEndTime: null,
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

    const room = snap.data() as AliasRoom;
    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: false } : p
    );

    const updates: Record<string, unknown> = { players };

    if (room.hostId === playerId) {
      const nextHost = players.find(
        (p) => p.id !== playerId && p.isConnected
      );
      if (nextHost) updates.hostId = nextHost.id;
    }

    if (room.status !== 'lobby') {
      const connectedCount = players.filter((p) => p.isConnected).length;
      if (connectedCount < 3) {
        updates.status = 'finished';
      }
    }

    tx.update(ref, updates);
  });
}

export async function leaveRoom(
  code: string,
  playerId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AliasRoom;

    if (room.status === 'lobby') {
      const players = room.players.filter((p) => p.id !== playerId);
      if (players.length === 0) return;

      const updates: Record<string, unknown> = { players };
      if (room.hostId === playerId) updates.hostId = players[0].id;
      tx.update(ref, updates);
    } else {
      const players = room.players.map((p) =>
        p.id === playerId ? { ...p, isConnected: false } : p
      );
      const updates: Record<string, unknown> = { players };

      if (room.hostId === playerId) {
        const nextHost = players.find(
          (p) => p.id !== playerId && p.isConnected
        );
        if (nextHost) updates.hostId = nextHost.id;
      }

      const connectedCount = players.filter((p) => p.isConnected).length;
      if (connectedCount < 3) {
        updates.status = 'finished';
      }

      tx.update(ref, updates);
    }
  });
}
