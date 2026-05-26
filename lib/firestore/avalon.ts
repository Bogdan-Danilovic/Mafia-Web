'use client';

import {
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  AvalonRoom,
  AvalonPlayer,
  AvalonSettings,
  AvalonRole,
  Loyalty,
  MissionResult,
  TeamVote,
  QuestVote,
  PLAYER_DISTRIBUTION,
  getMissionTeamSize,
  getSabotagesRequired,
} from '@/lib/types/avalon';
import { generateRoomCode, generatePlayerId, shuffleArray } from '@/lib/utils';

import { roomRef, subscribeToRoom } from './core';

export { subscribeToRoom };

function newRoom(code: string, hostId: string, player: AvalonPlayer): AvalonRoom {
  return {
    code,
    status: 'lobby',
    gameType: 'avalon',
    hostId,
    players: [player],
    settings: {
      enablePercival: false,
      enableMordred: false,
      enableMorgana: false,
      enableOberon: false,
    },
    currentMission: 1,
    missionResults: [],
    goodScore: 0,
    evilScore: 0,
    leaderIndex: 0,
    consecutiveRejects: 0,
    proposedTeam: [],
    teamVotes: {},
    questVotes: {},
    assassinTarget: null,
    winner: null,
    winReason: null,
    createdAt: Date.now(),
  };
}

function newPlayer(id: string, name: string): AvalonPlayer {
  return {
    id,
    name,
    isConnected: true,
    role: null,
    loyalty: null,
    isOnMission: false,
    hasVoted: false,
    isLeader: false,
  };
}

function deduplicateName(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;
  let n = 2;
  while (existing.includes(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

function assignRoles(
  players: AvalonPlayer[],
  settings: AvalonSettings
): AvalonPlayer[] {
  const count = players.length;
  const dist = PLAYER_DISTRIBUTION[count];
  if (!dist) return players;

  const indices = players.map((_, i) => i);
  const shuffled = shuffleArray(indices);

  const evilIndices = shuffled.slice(0, dist.evil);
  const goodIndices = shuffled.slice(dist.evil);

  const evilRoles: AvalonRole[] = ['assassin'];
  if (settings.enableMordred && evilIndices.length > evilRoles.length) evilRoles.push('mordred');
  if (settings.enableMorgana && evilIndices.length > evilRoles.length) evilRoles.push('morgana');
  if (settings.enableOberon && evilIndices.length > evilRoles.length) evilRoles.push('oberon');
  while (evilRoles.length < evilIndices.length) evilRoles.push('evil');

  const goodRoles: AvalonRole[] = ['merlin'];
  if (settings.enablePercival && goodIndices.length > goodRoles.length) goodRoles.push('percival');
  while (goodRoles.length < goodIndices.length) goodRoles.push('good');

  const roleMap = new Map<number, { role: AvalonRole; loyalty: Loyalty }>();
  evilIndices.forEach((idx, i) => {
    roleMap.set(idx, { role: evilRoles[i], loyalty: 'evil' });
  });
  goodIndices.forEach((idx, i) => {
    roleMap.set(idx, { role: goodRoles[i], loyalty: 'good' });
  });

  return players.map((p, i) => {
    const assignment = roleMap.get(i);
    return {
      ...p,
      role: assignment?.role ?? 'good',
      loyalty: assignment?.loyalty ?? 'good',
      isConnected: true,
      isOnMission: false,
      hasVoted: false,
      isLeader: false,
    };
  });
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

      const room = snap.data() as AvalonRoom;
      if (room.status !== 'lobby') throw new Error('Igra je već u toku.');
      if (room.players.length >= 10) throw new Error('Soba je puna (max 10).');

      const existingNames = room.players.map((p) => p.name);
      const uniqueName = deduplicateName(playerName, existingNames);

      const id = generatePlayerId();
      const player = newPlayer(id, uniqueName);
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
    const room = snap.data() as AvalonRoom;
    tx.update(ref, {
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, isConnected: true } : p
      ),
    });
  });
}

export async function updateRoomSettings(
  code: string,
  updates: { settings?: Partial<AvalonSettings> }
): Promise<void> {
  const ref = roomRef(code);
  if (updates.settings) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const room = snap.data() as AvalonRoom;
      tx.update(ref, { settings: { ...room.settings, ...updates.settings } });
    });
  }
}

export async function kickPlayer(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as AvalonRoom;
    tx.update(ref, { players: room.players.filter((p) => p.id !== playerId) });
  });
}

export async function startGame(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    if (room.players.length < 5) throw new Error('Potrebno je najmanje 5 igrača.');

    const players = assignRoles(room.players, room.settings);
    const leaderIndex = Math.floor(Math.random() * players.length);
    const leadered = players.map((p, i) => ({ ...p, isLeader: i === leaderIndex }));

    tx.update(ref, {
      status: 'nightPhase',
      players: leadered,
      currentMission: 1,
      missionResults: [],
      goodScore: 0,
      evilScore: 0,
      leaderIndex,
      consecutiveRejects: 0,
      proposedTeam: [],
      teamVotes: {},
      questVotes: {},
      assassinTarget: null,
      winner: null,
      winReason: null,
    });
  });
}

export async function advanceFromNight(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'roleReveal' });
}

export async function advanceFromRoleReveal(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'missionPropose' });
}

export async function proposeTeam(code: string, teamIds: string[]): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    const expected = getMissionTeamSize(room.players.length, room.currentMission);
    if (teamIds.length !== expected) throw new Error(`Tim mora imati ${expected} igrača.`);

    const players = room.players.map((p) => ({
      ...p,
      isOnMission: teamIds.includes(p.id),
      hasVoted: false,
    }));

    tx.update(ref, {
      proposedTeam: teamIds,
      teamVotes: {},
      players,
      status: 'missionVote',
    });
  });
}

export async function castTeamVote(
  code: string,
  playerId: string,
  vote: TeamVote
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, hasVoted: true } : p
    );

    tx.update(ref, {
      [`teamVotes.${playerId}`]: vote,
      players,
    });
  });
}

export async function resolveTeamVote(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    const connected = room.players.filter((p) => p.isConnected);
    const votes = Object.values(room.teamVotes);

    const approves = votes.filter((v) => v === 'approve').length;
    const approved = approves > connected.length / 2;

    if (approved) {
      tx.update(ref, {
        status: 'voteResult',
        consecutiveRejects: 0,
      });
    } else {
      const newRejects = room.consecutiveRejects + 1;

      if (newRejects >= 5) {
        tx.update(ref, {
          status: 'finished',
          winner: 'evil',
          winReason: 'rejects',
          consecutiveRejects: newRejects,
        });
        return;
      }

      const nextLeaderIndex = (room.leaderIndex + 1) % room.players.length;
      const players = room.players.map((p, i) => ({
        ...p,
        isLeader: i === nextLeaderIndex,
        isOnMission: false,
        hasVoted: false,
      }));

      tx.update(ref, {
        status: 'voteResult',
        consecutiveRejects: newRejects,
        leaderIndex: nextLeaderIndex,
        proposedTeam: [],
        teamVotes: {},
        players,
      });
    }
  });
}

export async function advanceFromVoteResult(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;

    if (room.status === 'finished') return;

    const votes = Object.values(room.teamVotes);
    const connected = room.players.filter((p) => p.isConnected);
    const approves = votes.filter((v) => v === 'approve').length;
    const approved = approves > connected.length / 2;

    if (approved) {
      const players = room.players.map((p) => ({ ...p, hasVoted: false }));
      tx.update(ref, { status: 'questPhase', questVotes: {}, players });
    } else {
      tx.update(ref, { status: 'missionPropose' });
    }
  });
}

export async function castQuestVote(
  code: string,
  playerId: string,
  vote: QuestVote
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    const player = room.players.find((p) => p.id === playerId);
    if (!player?.isOnMission) throw new Error('Nisi na ovoj misiji.');

    if (player.loyalty === 'good' && vote === 'sabotage') {
      throw new Error('Dobri igrači moraju glasati Uspjeh.');
    }

    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, hasVoted: true } : p
    );

    tx.update(ref, {
      [`questVotes.${playerId}`]: vote,
      players,
    });
  });
}

export async function resolveQuest(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    const votes = Object.values(room.questVotes);
    const sabotages = votes.filter((v) => v === 'sabotage').length;
    const successes = votes.filter((v) => v === 'success').length;
    const required = getSabotagesRequired(room.players.length, room.currentMission);

    const missionFailed = sabotages >= required;
    const result: MissionResult = {
      missionNumber: room.currentMission,
      team: [...room.proposedTeam],
      successes,
      sabotages,
      result: missionFailed ? 'fail' : 'success',
    };

    const newResults = [...room.missionResults, result];
    const newGoodScore = missionFailed ? room.goodScore : room.goodScore + 1;
    const newEvilScore = missionFailed ? room.evilScore + 1 : room.evilScore;

    tx.update(ref, {
      status: 'questResult',
      missionResults: newResults,
      goodScore: newGoodScore,
      evilScore: newEvilScore,
    });
  });
}

export async function advanceFromQuestResult(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'scoreboard' });
}

export async function advanceFromScoreboard(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;

    if (room.evilScore >= 3) {
      tx.update(ref, {
        status: 'finished',
        winner: 'evil',
        winReason: 'missions',
      });
      return;
    }

    if (room.goodScore >= 3) {
      tx.update(ref, { status: 'assassinate' });
      return;
    }

    const nextMission = room.currentMission + 1;
    const nextLeaderIndex = (room.leaderIndex + 1) % room.players.length;
    const players = room.players.map((p, i) => ({
      ...p,
      isLeader: i === nextLeaderIndex,
      isOnMission: false,
      hasVoted: false,
    }));

    tx.update(ref, {
      status: 'missionPropose',
      currentMission: nextMission,
      leaderIndex: nextLeaderIndex,
      consecutiveRejects: 0,
      proposedTeam: [],
      teamVotes: {},
      questVotes: {},
      players,
    });
  });
}

export async function castAssassinVote(
  code: string,
  targetId: string
): Promise<void> {
  await updateDoc(roomRef(code), { assassinTarget: targetId });
}

export async function resolveAssassination(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    if (!room.assassinTarget) return;

    const target = room.players.find((p) => p.id === room.assassinTarget);
    const merlinKilled = target?.role === 'merlin';

    tx.update(ref, {
      status: 'finished',
      winner: merlinKilled ? 'evil' : 'good',
      winReason: merlinKilled ? 'assassin' : 'missions',
    });
  });
}

export async function playAgain(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    const players = room.players.map((p) => ({
      ...p,
      role: null,
      loyalty: null,
      isOnMission: false,
      hasVoted: false,
      isLeader: false,
    }));

    tx.update(ref, {
      status: 'lobby',
      players,
      currentMission: 1,
      missionResults: [],
      goodScore: 0,
      evilScore: 0,
      leaderIndex: 0,
      consecutiveRejects: 0,
      proposedTeam: [],
      teamVotes: {},
      questVotes: {},
      assassinTarget: null,
      winner: null,
      winReason: null,
    });
  });
}

export async function finishGame(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'finished' });
}

export async function setPlayerDisconnected(
  code: string,
  playerId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const room = snap.data() as AvalonRoom;
    const players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: false } : p
    );

    const updates: Partial<AvalonRoom> & { players: AvalonPlayer[] } = { players };

    if (room.hostId === playerId) {
      const nextHost = players.find((p) => p.id !== playerId && p.isConnected);
      if (nextHost) updates.hostId = nextHost.id;
    }

    if (room.status !== 'lobby') {
      const connected = players.filter((p) => p.isConnected);
      if (connected.length < 5) {
        updates.status = 'finished';
        updates.winner = null;
        updates.winReason = null;
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

    const room = snap.data() as AvalonRoom;

    if (room.status === 'lobby') {
      const players = room.players.filter((p) => p.id !== playerId);
      if (players.length === 0) return;

      const updates: Partial<AvalonRoom> & { players: AvalonPlayer[] } = { players };
      if (room.hostId === playerId) updates.hostId = players[0].id;
      tx.update(ref, updates);
    } else {
      const players = room.players.map((p) =>
        p.id === playerId ? { ...p, isConnected: false } : p
      );
      const updates: Partial<AvalonRoom> & { players: AvalonPlayer[] } = { players };

      if (room.hostId === playerId) {
        const nextHost = players.find((p) => p.id !== playerId && p.isConnected);
        if (nextHost) updates.hostId = nextHost.id;
      }

      const connected = players.filter((p) => p.isConnected);
      if (connected.length < 5) {
        updates.status = 'finished';
        updates.winner = null;
        updates.winReason = null;
      }

      tx.update(ref, updates);
    }
  });
}
