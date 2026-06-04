'use client';

import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CambioRoom, CambioPlayer, CambioCard, ActivePower } from '@/lib/types/cambio';
import { generatePlayerId, generateRoomCode } from '@/lib/utils';
import { createDeck, dealCards, reshuffleDiscardIntoDraw } from '@/components/games/cambio/deck';
import { getCardPower } from '@/components/games/cambio/constants';
import { computeScores } from '@/components/games/cambio/scoring';

import { roomRef, subscribeToRoom } from './core';

function newRoom(code: string, hostId: string, player: CambioPlayer): CambioRoom {
  return {
    code,
    status: 'lobby',
    hostId,
    gameType: 'cambio',
    players: [player],
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    drawnCard: null,
    cambioCalledBy: null,
    lastRoundRemaining: [],
    activePower: null,
    snapWindow: null,
    peekReady: [],
    roundNumber: 0,
    settings: {},
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  } as unknown as CambioRoom;
}

function makePlayer(playerId: string, name: string, isAI = false, isHost = false): CambioPlayer {
  return { id: playerId, name, isConnected: true, isHost, isAI, cards: [], penaltyCount: 0, finalScore: 0 };
}

function dedup(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;
  let n = 2;
  while (existing.includes(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

export async function createRoom(playerName: string): Promise<{ code: string; playerId: string }> {
  const playerId = generatePlayerId();
  const player = makePlayer(playerId, playerName, false, true);
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode();
    const ref = roomRef(code);
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, newRoom(code, playerId, player));
      return { code, playerId };
    }
  }
  throw new Error('Nije moguće kreirati sobu.');
}

export async function joinRoom(code: string, playerName: string): Promise<{ playerId: string; error?: string }> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return { playerId: '', error: 'Soba ne postoji.' };
  const room = snap.data() as CambioRoom;
  if (room.status !== 'lobby') return { playerId: '', error: 'Igra je već počela.' };
  if (room.players.filter(p => !p.isAI).length >= 4) return { playerId: '', error: 'Soba je puna.' };
  const name = dedup(playerName, room.players.map(p => p.name));
  const playerId = generatePlayerId();
  const newPlayer = makePlayer(playerId, name);
  const players = [...room.players, newPlayer];
  await updateDoc(roomRef(code), { players });
  return { playerId };
}

export async function addAI(code: string): Promise<void> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.data() as CambioRoom;
  if (room.players.length >= 4 || room.status !== 'lobby') return;
  const aiNames = ['Robot Marko', 'CPU Ana', 'Bot Petar', 'AI Jovana'];
  const usedNames = room.players.map(p => p.name);
  const aiName = aiNames.find(n => !usedNames.includes(n)) ?? `CPU ${room.players.length + 1}`;
  const aiId = generatePlayerId();
  const ai = makePlayer(aiId, aiName, true, false);
  await updateDoc(roomRef(code), { players: [...room.players, ai] });
}

export async function removePlayer(code: string, playerId: string): Promise<void> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.data() as CambioRoom;
  const players = room.players.filter(p => p.id !== playerId);
  if (!players.length) return;
  await updateDoc(roomRef(code), {
    players,
    hostId: room.hostId === playerId ? players[0].id : room.hostId,
  });
}

export async function rejoinRoom(code: string, playerId: string): Promise<void> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.data() as CambioRoom;
  const players = room.players.map(p => p.id === playerId ? { ...p, isConnected: true } : p);
  await updateDoc(roomRef(code), { players });
}

export async function setPlayerDisconnected(code: string, playerId: string): Promise<void> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.data() as CambioRoom;
  const players = room.players.map(p => p.id === playerId ? { ...p, isConnected: false } : p);
  const connected = players.filter(p => p.isConnected || p.isAI);
  const patch: Record<string, unknown> = { players };
  if (connected.length < 2 && room.status !== 'lobby' && room.status !== 'finished') {
    patch.status = 'finished';
  }
  await updateDoc(roomRef(code), patch);
}

export async function leaveRoom(code: string, playerId: string): Promise<void> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.data() as CambioRoom;
  const players = room.players.filter(p => p.id !== playerId);
  if (!players.length) return;
  await updateDoc(roomRef(code), {
    players,
    hostId: room.hostId === playerId ? players[0].id : room.hostId,
  });
}

export async function startGame(code: string): Promise<void> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.data() as CambioRoom;
  const deck = createDeck();
  const { hands, remaining } = dealCards(deck, room.players.length);

  let drawPile = remaining;
  const discardTop = drawPile.pop()!;
  const discardPile: CambioCard[] = [{ ...discardTop, knownBy: [] }];

  const players: CambioPlayer[] = room.players.map((p, i) => ({
    ...p,
    cards: hands[i],
    penaltyCount: 0,
    finalScore: 0,
  }));

  await updateDoc(roomRef(code), {
    status: 'initial_peek',
    players,
    drawPile,
    discardPile,
    currentPlayerIndex: 0,
    drawnCard: null,
    cambioCalledBy: null,
    lastRoundRemaining: [],
    activePower: null,
    snapWindow: null,
    peekReady: [],
    roundNumber: 0,
  });
}

export async function confirmInitialPeek(code: string, playerId: string, cardIndices: [number, number]): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    if (room.status !== 'initial_peek') return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const players = room.players.map((p, pi) => {
      if (pi !== playerIndex) return p;
      const cards = p.cards.map((c, ci) => {
        if (cardIndices.includes(ci as 0 | 1)) {
          return { ...c, knownBy: [...new Set([...c.knownBy, playerId])] };
        }
        return c;
      });
      return { ...p, cards };
    });

    const peekReady = [...new Set([...room.peekReady, playerId])];
    const allReady = room.players.every(p => p.isAI || peekReady.includes(p.id));

    const patch: Record<string, unknown> = { players, peekReady };
    if (allReady) patch.status = 'playing';
    tx.update(roomRef(code), patch);
  });
}

export async function drawCard(code: string, playerId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== room.currentPlayerIndex) return;
    if (room.drawnCard) return;

    let drawPile = [...room.drawPile];
    let discardPile = [...room.discardPile];

    if (drawPile.length === 0) {
      const reshuffled = reshuffleDiscardIntoDraw(discardPile);
      drawPile = reshuffled.newDrawPile;
      discardPile = reshuffled.newDiscardPile;
    }
    if (drawPile.length === 0) return;

    const drawnCard = { ...drawPile[drawPile.length - 1], knownBy: [playerId] };
    drawPile = drawPile.slice(0, -1);

    tx.update(roomRef(code), { drawPile, discardPile, drawnCard });
  });
}

export async function swapAndDiscard(code: string, playerId: string, cardIndex: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== room.currentPlayerIndex || !room.drawnCard) return;

    const player = room.players[playerIndex];
    const oldCard = { ...player.cards[cardIndex] };
    const newCard = { ...room.drawnCard, knownBy: [playerId] };

    const players = room.players.map((p, pi) => {
      if (pi !== playerIndex) return p;
      const cards = p.cards.map((c, ci) => ci === cardIndex ? newCard : c);
      return { ...p, cards };
    });

    const discardedCard = { ...oldCard, knownBy: [] };
    const discardPile = [...room.discardPile, discardedCard];

    const snapWindow = {
      open: true,
      discardedRank: discardedCard.rank,
      openedAt: Date.now(),
      winner: null,
    };

    tx.update(roomRef(code), {
      players,
      discardPile,
      drawnCard: null,
      snapWindow,
      activePower: null,
    });
  });
}

export async function discardDirectly(code: string, playerId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== room.currentPlayerIndex || !room.drawnCard) return;

    const drawnCard = room.drawnCard;
    const power = getCardPower(drawnCard.rank, drawnCard.suit);
    const discardedCard = { ...drawnCard, knownBy: [] };
    const discardPile = [...room.discardPile, discardedCard];

    let activePower: ActivePower | null = null;
    if (power) {
      activePower = {
        type: power,
        step: power === 'peek_and_swap' ? 'peek' : null,
        sourcePlayerIndex: playerIndex,
        sourceCardIndex: -1,
        targetPlayerIndex: null,
        targetCardIndex: null,
      };
    }

    const snapWindow = {
      open: true,
      discardedRank: discardedCard.rank,
      openedAt: Date.now(),
      winner: null,
    };

    tx.update(roomRef(code), {
      discardPile,
      drawnCard: null,
      activePower,
      snapWindow,
    });
  });
}

export async function peekCard(code: string, playerId: string, targetPlayerIndex: number, targetCardIndex: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    if (!room.activePower) return;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (room.activePower.sourcePlayerIndex !== playerIndex) return;

    const players = room.players.map((p, pi) => {
      if (pi !== targetPlayerIndex) return p;
      const cards = p.cards.map((c, ci) => {
        if (ci !== targetCardIndex) return c;
        return { ...c, knownBy: [...new Set([...c.knownBy, playerId])] };
      });
      return { ...p, cards };
    });

    const power = room.activePower;
    let newPower: ActivePower | null = null;

    if (power.type === 'peek_and_swap') {
      newPower = {
        ...power,
        step: 'swap',
        targetPlayerIndex,
        targetCardIndex,
      };
    }

    const patch: Record<string, unknown> = { players };

    if (newPower) {
      patch.activePower = newPower;
    } else {
      patch.activePower = null;
      patch.snapWindow = null;
      const patch2 = await advanceTurnPatch(room);
      Object.assign(patch, patch2);
    }

    tx.update(roomRef(code), patch);
  });
}

export async function blindSwap(code: string, playerId: string, myCardIndex: number, targetPlayerIndex: number, targetCardIndex: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    if (!room.activePower) return;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (room.activePower.sourcePlayerIndex !== playerIndex) return;

    const myCard = room.players[playerIndex].cards[myCardIndex];
    const theirCard = room.players[targetPlayerIndex].cards[targetCardIndex];

    const players = room.players.map((p, pi) => {
      if (pi === playerIndex) {
        const cards = p.cards.map((c, ci) => ci === myCardIndex ? { ...theirCard, knownBy: [] } : c);
        return { ...p, cards };
      }
      if (pi === targetPlayerIndex) {
        const cards = p.cards.map((c, ci) => ci === targetCardIndex ? { ...myCard, knownBy: [] } : c);
        return { ...p, cards };
      }
      return p;
    });

    const advancePatch = await advanceTurnPatch(room);
    tx.update(roomRef(code), { players, activePower: null, snapWindow: null, ...advancePatch });
  });
}

export async function peekAndSwap(code: string, playerId: string, myCardIndex: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    if (!room.activePower || room.activePower.step !== 'swap') return;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (room.activePower.sourcePlayerIndex !== playerIndex) return;

    const { targetPlayerIndex, targetCardIndex } = room.activePower;
    if (targetPlayerIndex === null || targetCardIndex === null) return;

    const myCard = room.players[playerIndex].cards[myCardIndex];
    const theirCard = room.players[targetPlayerIndex].cards[targetCardIndex];

    const players = room.players.map((p, pi) => {
      if (pi === playerIndex) {
        const cards = p.cards.map((c, ci) => ci === myCardIndex ? { ...theirCard, knownBy: [] } : c);
        return { ...p, cards };
      }
      if (pi === targetPlayerIndex) {
        const cards = p.cards.map((c, ci) => ci === targetCardIndex ? { ...myCard, knownBy: [] } : c);
        return { ...p, cards };
      }
      return p;
    });

    const advancePatch = await advanceTurnPatch(room);
    tx.update(roomRef(code), { players, activePower: null, snapWindow: null, ...advancePatch });
  });
}

export async function skipPower(code: string, playerId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    if (!room.activePower) return;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (room.activePower.sourcePlayerIndex !== playerIndex) return;
    const advancePatch = await advanceTurnPatch(room);
    tx.update(roomRef(code), { activePower: null, snapWindow: null, ...advancePatch });
  });
}

export async function callCambio(code: string, playerId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== room.currentPlayerIndex) return;
    if (room.drawnCard || room.cambioCalledBy) return;
    if (room.status !== 'playing' && room.status !== 'last_round') return;

    const lastRoundRemaining = room.players
      .filter(p => p.id !== playerId)
      .map(p => p.id);

    tx.update(roomRef(code), {
      cambioCalledBy: playerId,
      status: 'last_round',
      lastRoundRemaining,
      currentPlayerIndex: (playerIndex + 1) % room.players.length,
      roundNumber: room.roundNumber + 1,
    });
  });
}

export async function trySnap(code: string, playerId: string, cardIndex: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    if (!room.snapWindow?.open || room.snapWindow.winner) return;

    const now = Date.now();
    if (now - room.snapWindow.openedAt > 2500) return;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    const card = player.cards[cardIndex];
    const topDiscard = room.discardPile[room.discardPile.length - 1];

    if (!topDiscard || card.rank !== topDiscard.rank) {
      // Wrong snap — penalty card
      const penaltyCard: CambioCard = { rank: 'A', suit: '♠', knownBy: [] };
      let drawPile = [...room.drawPile];
      let discardPile = [...room.discardPile];
      if (drawPile.length > 0) {
        const penalty = { ...drawPile[drawPile.length - 1], knownBy: [] };
        drawPile = drawPile.slice(0, -1);
        const players = room.players.map((p, pi) => {
          if (pi !== playerIndex) return p;
          return { ...p, cards: [...p.cards, penalty], penaltyCount: p.penaltyCount + 1 };
        });
        tx.update(roomRef(code), { players, drawPile, discardPile, snapWindow: { ...room.snapWindow, winner: `penalty:${playerId}` } });
      } else {
        const players = room.players.map((p, pi) => {
          if (pi !== playerIndex) return p;
          return { ...p, cards: [...p.cards, penaltyCard], penaltyCount: p.penaltyCount + 1 };
        });
        tx.update(roomRef(code), { players, snapWindow: { ...room.snapWindow, winner: `penalty:${playerId}` } });
      }
      return;
    }

    // Successful snap — remove card from player, snap wins
    const snappedCard = player.cards[cardIndex];
    const remainingCards = player.cards.filter((_, ci) => ci !== cardIndex);
    const players = room.players.map((p, pi) => pi === playerIndex ? { ...p, cards: remainingCards } : p);
    const discardPile = [...room.discardPile, { ...snappedCard, knownBy: [] }];

    tx.update(roomRef(code), {
      players,
      discardPile,
      snapWindow: { ...room.snapWindow, winner: playerId },
    });
  });
}

export async function closeSnapWindow(code: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;
    if (!room.snapWindow?.open) return;
    if (room.activePower) {
      tx.update(roomRef(code), { snapWindow: null });
      return;
    }
    const advancePatch = await advanceTurnPatch(room);
    tx.update(roomRef(code), { snapWindow: null, ...advancePatch });
  });
}

export async function giveCardAfterSnap(code: string, snapWinnerId: string, targetPlayerId: string, cardIndex: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists()) return;
    const room = snap.data() as CambioRoom;

    const winnerIndex = room.players.findIndex(p => p.id === snapWinnerId);
    const targetIndex = room.players.findIndex(p => p.id === targetPlayerId);
    if (winnerIndex === -1 || targetIndex === -1) return;

    const winner = room.players[winnerIndex];
    if (cardIndex >= winner.cards.length) return;

    const cardToGive = winner.cards[cardIndex];
    const players = room.players.map((p, pi) => {
      if (pi === winnerIndex) return { ...p, cards: p.cards.filter((_, ci) => ci !== cardIndex) };
      if (pi === targetIndex) return { ...p, cards: [...p.cards, { ...cardToGive, knownBy: [] }] };
      return p;
    });

    const advancePatch = await advanceTurnPatch(room);
    tx.update(roomRef(code), { players, snapWindow: null, ...advancePatch });
  });
}

async function advanceTurnPatch(room: CambioRoom): Promise<Record<string, unknown>> {
  const patch: Record<string, unknown> = {};

  if (room.status === 'last_round') {
    const currentPlayer = room.players[room.currentPlayerIndex];
    const remaining = room.lastRoundRemaining.filter(id => id !== currentPlayer.id);

    if (remaining.length === 0) {
      const scores = computeScores(room.players, room.cambioCalledBy);
      const players = room.players.map(p => {
        const entry = scores.find(s => s.playerId === p.id);
        return { ...p, finalScore: entry?.total ?? 0 };
      });
      patch.status = 'scoring';
      patch.players = players;
      patch.lastRoundRemaining = [];
      return patch;
    }

    patch.lastRoundRemaining = remaining;
    // Find next player who still needs to play
    let next = (room.currentPlayerIndex + 1) % room.players.length;
    while (!remaining.includes(room.players[next].id)) {
      next = (next + 1) % room.players.length;
      if (next === room.currentPlayerIndex) break;
    }
    patch.currentPlayerIndex = next;
    patch.roundNumber = room.roundNumber + 1;
    return patch;
  }

  patch.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  patch.roundNumber = room.roundNumber + 1;
  return patch;
}

export async function playAgain(code: string): Promise<void> {
  const snap = await getDoc(roomRef(code));
  if (!snap.exists()) return;
  const room = snap.data() as CambioRoom;
  const players = room.players.map(p => ({ ...p, isConnected: true, cards: [], penaltyCount: 0, finalScore: 0 }));
  await updateDoc(roomRef(code), {
    status: 'lobby',
    players,
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    drawnCard: null,
    cambioCalledBy: null,
    lastRoundRemaining: [],
    activePower: null,
    snapWindow: null,
    peekReady: [],
    roundNumber: 0,
  });
}
