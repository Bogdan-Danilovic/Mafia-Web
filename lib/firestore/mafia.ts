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
  NightAction,
  NightResult,
  ROLE_TEAM,
  getRolesForCount,
  checkWinCondition,
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

function newPlayer(id: string, name: string): MafiaPlayer {
  return {
    id,
    name,
    isConnected: true,
    role: null,
    isAlive: true,
    isSilenced: false,
    isProtected: false,
    hasVoted: false,
    currentVote: null,
    nightActionSubmitted: false,
    avengerPowerActive: true,
    selfProtectUsed: false,
    isRevealed: false,
  };
}

function newRoom(code: string, hostId: string, player: MafiaPlayer): MafiaRoom {
  return {
    code,
    status: 'lobby' as MafiaStatus,
    gameType: 'mafia',
    hostId,
    players: { [player.id]: player },
    settings: {
      allowSelfProtect: false,
      showEliminatedRole: true,
      dayDuration: 90,
      nightDuration: 45,
    },
    round: 1,
    nightPhase: 0,
    nightActions: [],
    nightResult: null,
    votes: [],
    eliminatedThisRound: null,
    revengeAvailable: false,
    revengeTarget: null,
    winner: null,
    winnerIds: [],
    nightActionsReady: {},
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

// ─── Room lifecycle ───────────────────────────────────────────────────────────

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
      const room = snap.data() as MafiaRoom;
      if (room.status !== 'lobby') throw new Error('Igra je već u toku.');
      const playerCount = Object.keys(room.players).length;
      if (playerCount >= 14) throw new Error('Soba je puna (max 14).');

      const existingNames = Object.values(room.players).map((p) => p.name);
      const uniqueName = deduplicateName(playerName, existingNames);

      const id = generatePlayerId();
      const player = newPlayer(id, uniqueName);
      tx.update(ref, { [`players.${id}`]: player });
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
    tx.update(ref, { [`players.${playerId}.isConnected`]: true });
  });
}

export async function leaveRoom(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;

    if (room.status === 'lobby') {
      // Remove from lobby
      const players = { ...room.players };
      delete players[playerId];
      if (Object.keys(players).length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = { players };
      if (room.hostId === playerId) {
        const nextHost = Object.values(players)[0];
        if (nextHost) updates.hostId = nextHost.id;
      }
      tx.update(ref, updates);
    } else {
      // Mark disconnected mid-game
      tx.update(ref, { [`players.${playerId}.isConnected`]: false });

      // Re-read to check graceful end
      const updated = { ...room.players, [playerId]: { ...room.players[playerId], isConnected: false } };
      const connectedAlive = Object.values(updated).filter((p) => p.isAlive && p.isConnected);
      if (connectedAlive.length < 3) {
        tx.update(ref, { status: 'finished', winner: null, winnerIds: [] });
      }
    }
  });
}

export async function setPlayerDisconnected(code: string, playerId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { [`players.${playerId}.isConnected`]: false };

    if (room.hostId === playerId) {
      const nextHost = Object.values(room.players).find(
        (p) => p.id !== playerId && p.isConnected
      );
      if (nextHost) updates.hostId = nextHost.id;
    }

    if (room.status !== 'lobby') {
      const connectedAlive = Object.values(room.players).filter(
        (p) => p.id !== playerId && p.isAlive && p.isConnected
      );
      if (connectedAlive.length < 3) {
        updates.status = 'finished';
        updates.winner = null;
        updates.winnerIds = [];
      }
    }

    tx.update(ref, updates);
  });
}

// ─── Start game ───────────────────────────────────────────────────────────────

export async function startGame(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;

    const playerList = Object.values(room.players);
    if (playerList.length < 6) throw new Error('Potrebno je najmanje 6 igrača.');

    const roles = getRolesForCount(playerList.length);
    const shuffledRoles = shuffleArray(roles);

    // Build updated players map
    const updatedPlayers: Record<string, MafiaPlayer> = {};
    playerList.forEach((p, i) => {
      updatedPlayers[p.id] = {
        ...p,
        role: shuffledRoles[i],
        isAlive: true,
        isSilenced: false,
        isProtected: false,
        hasVoted: false,
        currentVote: null,
        nightActionSubmitted: false,
        avengerPowerActive: true,
        selfProtectUsed: false,
        isRevealed: false,
        isConnected: true,
      };
    });

    tx.update(ref, {
      status: 'role-reveal',
      players: updatedPlayers,
      round: 1,
      nightPhase: 0,
      nightActions: [],
      nightResult: null,
      votes: [],
      eliminatedThisRound: null,
      revengeAvailable: false,
      revengeTarget: null,
      winner: null,
      winnerIds: [],
      nightActionsReady: {},
    });
  });
}

// ─── Role reveal ──────────────────────────────────────────────────────────────

export async function advanceToNight(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;
    const newNightPhase = room.nightPhase + 1;

    // Reset night state for all players
    const updatedPlayers: Record<string, MafiaPlayer> = {};
    for (const [id, p] of Object.entries(room.players)) {
      updatedPlayers[id] = {
        ...p,
        isSilenced: false,
        isProtected: false,
        hasVoted: false,
        currentVote: null,
        nightActionSubmitted: false,
      };
    }

    tx.update(ref, {
      status: 'night',
      nightPhase: newNightPhase,
      nightActions: [],
      nightResult: null,
      nightActionsReady: {},
      players: updatedPlayers,
    });
  });
}

// ─── Night actions ────────────────────────────────────────────────────────────

export async function submitNightAction(
  code: string,
  action: NightAction
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;
    if (room.status !== 'night') return;

    // Check if actor already submitted
    if (room.nightActionsReady[action.actorId]) return;

    const newActions = [...room.nightActions.filter((a) => a.actorId !== action.actorId), action];

    tx.update(ref, {
      nightActions: newActions,
      [`nightActionsReady.${action.actorId}`]: true,
      [`players.${action.actorId}.nightActionSubmitted`]: true,
    });
  });
}

// ─── Night processing (host only) ─────────────────────────────────────────────

export async function processNightActions(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;
    if (room.status !== 'night') return;

    const players = { ...room.players };
    const actions = room.nightActions;

    // Find actions by type
    const damaAction = actions.find((a) => {
      const p = players[a.actorId];
      return p?.role === 'dama' && a.actionType === 'silence';
    });
    const doktorAction = actions.find((a) => {
      const p = players[a.actorId];
      return p?.role === 'doktor' && a.actionType === 'protect';
    });
    const mafiaAction = actions.find((a) => a.actionType === 'kill');
    const avengerAction = actions.find((a) => {
      const p = players[a.actorId];
      return p?.role === 'osvetnik' && (a.actionType === 'avenge' || a.actionType === 'skip');
    });
    const policeAction = actions.find((a) => {
      const p = players[a.actorId];
      return p?.role === 'policajac' && a.actionType === 'investigate';
    });

    const result: NightResult = {
      killed: [],
      saved: [],
      silenced: [],
      investigation: null,
      avengerDied: false,
      mafiaKillerDied: false,
      avengerLostPower: false,
      message: 'Mirna noć.',
    };

    // 1. Dama silences
    if (damaAction?.targetId) {
      const target = players[damaAction.targetId];
      if (target?.isAlive) {
        players[damaAction.targetId] = { ...target, isSilenced: true };
        result.silenced.push(damaAction.targetId);
      }
    }

    // 2. Doktor protects
    if (doktorAction?.targetId) {
      const target = players[doktorAction.targetId];
      if (target?.isAlive) {
        players[doktorAction.targetId] = { ...target, isProtected: true };
        if (doktorAction.targetId === doktorAction.actorId) {
          players[doktorAction.actorId] = { ...players[doktorAction.actorId], selfProtectUsed: true };
        }
      }
    }

    // 3. Mafia kills
    if (mafiaAction?.targetId) {
      const target = players[mafiaAction.targetId];
      if (target?.isAlive) {
        if (target.isProtected) {
          // Doktor saved them
          result.saved.push(mafiaAction.targetId);
        } else if (target.role === 'osvetnik') {
          // Avenger passive: both die
          const avengerPlayer = players[mafiaAction.targetId];
          if (avengerPlayer.isProtected) {
            // Doktor protected avenger: avenger survives, mafia attacker dies
            result.mafiaKillerDied = true;
            result.killed.push(mafiaAction.actorId);
            if (players[mafiaAction.actorId]) {
              players[mafiaAction.actorId] = { ...players[mafiaAction.actorId], isAlive: false, isRevealed: true };
            }
          } else {
            // Both die
            result.avengerDied = true;
            result.mafiaKillerDied = true;
            result.killed.push(mafiaAction.targetId, mafiaAction.actorId);
            players[mafiaAction.targetId] = { ...players[mafiaAction.targetId], isAlive: false, isRevealed: true };
            if (players[mafiaAction.actorId]) {
              players[mafiaAction.actorId] = { ...players[mafiaAction.actorId], isAlive: false, isRevealed: true };
            }
          }
        } else {
          // Normal kill
          result.killed.push(mafiaAction.targetId);
          players[mafiaAction.targetId] = { ...players[mafiaAction.targetId], isAlive: false, isRevealed: true };
        }
      }
    }

    // 4. Avenger attacks
    if (avengerAction?.actionType === 'avenge' && avengerAction.targetId) {
      const avenger = players[avengerAction.actorId];
      const target = players[avengerAction.targetId];

      if (avenger?.isAlive && avenger.avengerPowerActive && target?.isAlive) {
        const targetRole = target.role;
        const targetTeam = targetRole ? ROLE_TEAM[targetRole] : null;

        if (targetTeam === 'mafia') {
          // HIT: target dies, avenger loses power (stays alive)
          if (!result.killed.includes(avengerAction.targetId)) {
            result.killed.push(avengerAction.targetId);
            players[avengerAction.targetId] = { ...players[avengerAction.targetId], isAlive: false, isRevealed: true };
          }
          result.avengerLostPower = true;
          players[avengerAction.actorId] = { ...players[avengerAction.actorId], avengerPowerActive: false };
        } else {
          // MISS: avenger dies, target survives
          if (!result.killed.includes(avengerAction.actorId)) {
            result.killed.push(avengerAction.actorId);
            players[avengerAction.actorId] = { ...players[avengerAction.actorId], isAlive: false, isRevealed: true };
          }
        }
      }
    }

    // 5. Police investigation (private, stored in nightResult)
    if (policeAction?.targetId) {
      const target = players[policeAction.targetId];
      if (target) {
        const isMafia = target.role === 'mafia'; // boss always appears innocent
        result.investigation = {
          targetId: policeAction.targetId,
          result: isMafia ? 'mafia' : 'innocent',
        };
      }
    }

    // Build public message
    if (result.killed.length === 0 && result.saved.length === 0) {
      result.message = 'Mirna noć — niko nije stradao.';
    } else if (result.saved.length > 0 && result.killed.length === 0) {
      result.message = 'Mirna noć — neko je zaštićen.';
    } else if (result.killed.length === 1) {
      const killedName = players[result.killed[0]]?.name ?? 'Igrač';
      result.message = `${killedName} nije preživio/la noć.`;
    } else if (result.killed.length === 2 && result.avengerDied && result.mafiaKillerDied) {
      result.message = 'Dve osobe nisu preživjele noć.';
    } else {
      result.message = `${result.killed.length} igrača nije preživjelo noć.`;
    }

    // Check win condition
    const winCheck = checkWinCondition(players);
    const winnerIds = winCheck
      ? Object.values(players)
          .filter((p) => {
            if (winCheck === 'mafia') return p.role && ROLE_TEAM[p.role] === 'mafia';
            if (winCheck === 'civilians') return p.role && ROLE_TEAM[p.role] !== 'mafia';
            if (winCheck === 'avenger') return p.role === 'osvetnik';
            return false;
          })
          .map((p) => p.id)
      : [];

    tx.update(ref, {
      status: winCheck ? 'finished' : 'night-processing',
      players,
      nightResult: result,
      winner: winCheck,
      winnerIds,
    });
  });
}

export async function advanceToDayResults(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'day-results' });
}

// ─── Day voting ───────────────────────────────────────────────────────────────

export async function advanceToDayVote(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;

    // Reset hasVoted for alive players
    const updatedPlayers: Record<string, MafiaPlayer> = {};
    for (const [id, p] of Object.entries(room.players)) {
      updatedPlayers[id] = { ...p, hasVoted: false, currentVote: null };
    }

    tx.update(ref, {
      status: 'day-vote',
      votes: [],
      eliminatedThisRound: null,
      players: updatedPlayers,
    });
  });
}

export async function submitVote(
  code: string,
  voterId: string,
  targetId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;
    if (room.status !== 'day-vote') return;

    const voter = room.players[voterId];
    if (!voter?.isAlive || voter.isSilenced || voter.hasVoted) return;

    const existingVotes = room.votes.filter((v) => v.voterId !== voterId);
    const newVote = { voterId, targetId, round: room.round };

    tx.update(ref, {
      votes: [...existingVotes, newVote],
      [`players.${voterId}.hasVoted`]: true,
      [`players.${voterId}.currentVote`]: targetId,
    });
  });
}

export async function processVotes(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;
    if (room.status !== 'day-vote') return;

    // Count votes
    const voteCounts: Record<string, number> = {};
    for (const vote of room.votes) {
      voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
    }

    let maxVotes = 0;
    let maxIds: string[] = [];
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        maxIds = [id];
      } else if (count === maxVotes) {
        maxIds.push(id);
      }
    }

    // Tie = no elimination
    const eliminatedId = maxIds.length === 1 ? maxIds[0] : null;
    const players = { ...room.players };

    if (eliminatedId) {
      players[eliminatedId] = { ...players[eliminatedId], isAlive: false, isRevealed: true };
    }

    const winCheck = eliminatedId ? checkWinCondition(players) : null;
    const winnerIds = winCheck
      ? Object.values(players)
          .filter((p) => {
            if (winCheck === 'mafia') return p.role && ROLE_TEAM[p.role] === 'mafia';
            if (winCheck === 'civilians') return p.role && ROLE_TEAM[p.role] !== 'mafia';
            if (winCheck === 'avenger') return p.role === 'osvetnik';
            return false;
          })
          .map((p) => p.id)
      : [];

    // Check if eliminated player is the Osvetnik
    const isAvenger = eliminatedId && players[eliminatedId]?.role === 'osvetnik';
    const revengeAvailable = Boolean(isAvenger && !winCheck);

    const nextStatus: MafiaStatus = winCheck
      ? 'finished'
      : revengeAvailable
        ? 'revenge'
        : 'vote-results';

    tx.update(ref, {
      status: nextStatus,
      players,
      eliminatedThisRound: eliminatedId,
      revengeAvailable,
      winner: winCheck,
      winnerIds,
    });
  });
}

// ─── Revenge ──────────────────────────────────────────────────────────────────

export async function submitRevenge(
  code: string,
  avengerTargetId: string
): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;
    if (room.status !== 'revenge') return;

    const players = { ...room.players };
    players[avengerTargetId] = { ...players[avengerTargetId], isAlive: false, isRevealed: true };

    const winCheck = checkWinCondition(players);
    const winnerIds = winCheck
      ? Object.values(players)
          .filter((p) => {
            if (winCheck === 'mafia') return p.role && ROLE_TEAM[p.role] === 'mafia';
            if (winCheck === 'civilians') return p.role && ROLE_TEAM[p.role] !== 'mafia';
            if (winCheck === 'avenger') return p.role === 'osvetnik';
            return false;
          })
          .map((p) => p.id)
      : [];

    tx.update(ref, {
      status: winCheck ? 'finished' : 'vote-results',
      players,
      revengeTarget: avengerTargetId,
      revengeAvailable: false,
      winner: winCheck,
      winnerIds,
    });
  });
}

export async function skipRevenge(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;
    const winCheck = checkWinCondition(room.players);
    const winnerIds = winCheck
      ? Object.values(room.players)
          .filter((p) => {
            if (winCheck === 'mafia') return p.role && ROLE_TEAM[p.role] === 'mafia';
            if (winCheck === 'civilians') return p.role && ROLE_TEAM[p.role] !== 'mafia';
            if (winCheck === 'avenger') return p.role === 'osvetnik';
            return false;
          })
          .map((p) => p.id)
      : [];

    tx.update(ref, {
      status: winCheck ? 'finished' : 'vote-results',
      revengeAvailable: false,
      winner: winCheck,
      winnerIds,
    });
  });
}

export async function advanceToNextNight(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;

    tx.update(ref, {
      round: room.round + 1,
    });
  });
  // Then advance to night
  await advanceToNight(code);
}

// ─── Play again ───────────────────────────────────────────────────────────────

export async function playAgain(code: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as MafiaRoom;

    const resetPlayers: Record<string, MafiaPlayer> = {};
    for (const [id, p] of Object.entries(room.players)) {
      resetPlayers[id] = {
        ...p,
        role: null,
        isAlive: true,
        isSilenced: false,
        isProtected: false,
        hasVoted: false,
        currentVote: null,
        nightActionSubmitted: false,
        avengerPowerActive: true,
        selfProtectUsed: false,
        isRevealed: false,
      };
    }

    tx.update(ref, {
      status: 'lobby',
      players: resetPlayers,
      round: 1,
      nightPhase: 0,
      nightActions: [],
      nightResult: null,
      votes: [],
      eliminatedThisRound: null,
      revengeAvailable: false,
      revengeTarget: null,
      winner: null,
      winnerIds: [],
      nightActionsReady: {},
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  });
}
