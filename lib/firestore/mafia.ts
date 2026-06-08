'use client';

import {
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  MafiaRoom,
  MafiaPlayer,
  MafiaSettings,
  MafiaStatus,
  getRolesForCount,
} from '@/lib/types/mafia';
import { generateRoomCode, generatePlayerId, shuffleArray } from '@/lib/utils';
import { roomRef } from './core';

export function subscribeToRoom<T = MafiaRoom>(
  code: string,
  callback: (room: T | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    roomRef(code),
    (snap) => callback(snap.exists() ? (snap.data() as T) : null),
    (err) => onError?.(err)
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultSettings: MafiaSettings = {
  showRoleOnEliminate: true,
};

export function createMafiaPlayer(name: string, isHost: boolean = false): MafiaPlayer {
  return {
    id: generatePlayerId(),
    name,
    isConnected: true,
    isHost,
    role: null,
    isAlive: true,
    hasSeenRole: false,
  };
}

// ─── LOBBY ACTIONS ────────────────────────────────────────────────────────────

export async function createRoom(hostName: string): Promise<{ code: string; playerId: string }> {
  const code = generateRoomCode();
  const host = createMafiaPlayer(hostName, true);

  const room: MafiaRoom = {
    code,
    status: 'lobby',
    hostId: host.id,
    gameType: 'mafia',
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    players: { [host.id]: host },
    winner: null,
    settings: defaultSettings,
  };

  await setDoc(roomRef(code), room);
  return { code, playerId: host.id };
}

export async function joinRoom(code: string, playerName: string): Promise<string> {
  let newPlayerId = '';
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Soba ne postoji.');

    const room = snap.data() as MafiaRoom;
    if (room.status !== 'lobby') throw new Error('Igra je već počela.');
    if (Object.keys(room.players).length >= 15) throw new Error('Soba je puna.');

    const player = createMafiaPlayer(playerName);
    newPlayerId = player.id;
    room.players[newPlayerId] = player;

    tx.update(ref, { players: room.players });
  });
  return newPlayerId;
}

export async function rejoinRoom(code: string, playerId: string): Promise<void> {
  await updateDoc(roomRef(code), {
    [`players.${playerId}.isConnected`]: true,
  });
}

export async function leaveRoom(code: string, playerId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as MafiaRoom;
    if (!room.players[playerId]) return;

    delete room.players[playerId];

    // If empty, let it expire (or delete). If host leaves, assign new host.
    const remainingIds = Object.keys(room.players);
    if (remainingIds.length > 0 && room.hostId === playerId) {
      room.hostId = remainingIds[0];
      room.players[remainingIds[0]].isHost = true;
    }

    tx.update(ref, {
      players: room.players,
      hostId: room.hostId,
    });
  });
}

export async function setPlayerDisconnected(code: string, playerId: string): Promise<void> {
  try {
    await updateDoc(roomRef(code), {
      [`players.${playerId}.isConnected`]: false,
    });
  } catch (e) {
    // ignore
  }
}

// ─── GAME STATE ACTIONS ───────────────────────────────────────────────────────

export async function startGame(code: string) {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as MafiaRoom;
    const playerIds = Object.keys(room.players);
    if (playerIds.length < 6) throw new Error('Treba bar 6 igrača.');

    const roles = getRolesForCount(playerIds.length);
    shuffleArray(roles);

    playerIds.forEach((id, index) => {
      room.players[id].role = roles[index];
      room.players[id].isAlive = true;
      room.players[id].hasSeenRole = false;
    });

    tx.update(ref, {
      status: 'role-reveal',
      players: room.players,
      winner: null,
    });
  });
}

export async function setSeenRole(code: string, playerId: string) {
  await updateDoc(roomRef(code), {
    [`players.${playerId}.hasSeenRole`]: true,
  });
}

export async function advanceToPlaying(code: string) {
  await updateDoc(roomRef(code), { status: 'playing' });
}

export async function killPlayer(code: string, targetId: string) {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as MafiaRoom;
    if (!room.players[targetId] || !room.players[targetId].isAlive) return;

    room.players[targetId].isAlive = false;

    tx.update(ref, { players: room.players });
  });
}

export async function finishGame(code: string, winner: 'mafia' | 'civilians') {
  await updateDoc(roomRef(code), {
    status: 'finished',
    winner,
  });
}

export async function playAgain(code: string) {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as MafiaRoom;
    
    // Reset all players
    Object.values(room.players).forEach((p) => {
      p.role = null;
      p.isAlive = true;
      p.hasSeenRole = false;
    });

    tx.update(ref, {
      status: 'lobby',
      players: room.players,
      winner: null,
    });
  });
}
