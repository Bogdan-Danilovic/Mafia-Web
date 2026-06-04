import { SpicyGameState, SpicyPlayer, SpicyCard, SpicyClaim, SpicyPlayerSetup } from '@/lib/games/spicy/types';
import { createAndDeal } from '@/lib/games/spicy/cardFactory';
import { resolveChallenge } from '@/lib/games/spicy/challengeResolver';
import { determineWinner } from '@/lib/games/spicy/scoring';
import { generatePlayerId } from '@/lib/utils';

export type SpicyAction =
  | { type: 'REVEAL_HAND' }
  | { type: 'PLAY_CARD'; cardId: string; claim: SpicyClaim }
  | { type: 'PASS' }
  | { type: 'CHALLENGE'; challengerIndex: number; challengeType: 'spice' | 'number' }
  | { type: 'NO_CHALLENGE' }
  | { type: 'CONFIRM_RESULT' }
  | { type: 'COLLECT_TROPHY' }
  | { type: 'RESTART' };

export function createInitialState(setups: SpicyPlayerSetup[]): SpicyGameState {
  const { hands, drawPile } = createAndDeal(setups.length);
  const players: SpicyPlayer[] = setups.map((s, i) => ({
    id: s.id, name: s.name, hand: hands[i], wonCards: [], trophies: 0,
  }));
  return { players, drawPile, pile: [], lastClaim: null, isFirstOnPile: true, currentPlayerIndex: 0, trophiesLeft: 3, phase: 'handoff', challengeResult: null, lastCardPlayerIndex: null, lastCardChallengeWon: null, winner: null };
}

function drawOne(state: SpicyGameState, idx: number): { state: SpicyGameState; card: SpicyCard; gameEnded: boolean } {
  const [card, ...rest] = state.drawPile;
  if (card.type === 'enough') {
    const winner = determineWinner(state.players);
    return { state: { ...state, drawPile: rest, phase: 'end', winner }, card, gameEnded: true };
  }
  const players = state.players.map((p, i) => i === idx ? { ...p, hand: [...p.hand, card] } : p);
  return { state: { ...state, drawPile: rest, players }, card, gameEnded: false };
}

function drawMany(state: SpicyGameState, idx: number, count: number): { state: SpicyGameState; gameEnded: boolean } {
  let s = state;
  for (let i = 0; i < count; i++) {
    const r = drawOne(s, idx);
    s = r.state;
    if (r.gameEnded) return { state: s, gameEnded: true };
  }
  return { state: s, gameEnded: false };
}

const nextIdx = (s: SpicyGameState) => (s.currentPlayerIndex + 1) % s.players.length;

export function spicyReducer(state: SpicyGameState, action: SpicyAction): SpicyGameState {
  switch (action.type) {
    case 'REVEAL_HAND':
      return state.phase !== 'handoff' ? state : { ...state, phase: 'playing' };

    case 'PLAY_CARD': {
      if (state.phase !== 'playing') return state;
      const player = state.players[state.currentPlayerIndex];
      const cardIdx = player.hand.findIndex((c) => c.id === action.cardId);
      if (cardIdx === -1) return state;
      const card = player.hand[cardIdx];
      const newHand = player.hand.filter((_, i) => i !== cardIdx);
      const players = state.players.map((p, i) => i === state.currentPlayerIndex ? { ...p, hand: newHand } : p);
      const base = { ...state, players, pile: [...state.pile, card], lastClaim: action.claim, isFirstOnPile: false, challengeResult: null };
      if (newHand.length === 0) return { ...base, phase: 'last_card_window', lastCardPlayerIndex: state.currentPlayerIndex, lastCardChallengeWon: null };
      return { ...base, phase: 'challenge_window' };
    }

    case 'PASS': {
      if (state.phase !== 'playing') return state;
      const { state: s2, gameEnded } = drawOne(state, state.currentPlayerIndex);
      if (gameEnded) return s2;
      return { ...s2, currentPlayerIndex: nextIdx(s2), phase: 'handoff' };
    }

    case 'CHALLENGE': {
      if (state.phase !== 'challenge_window' && state.phase !== 'last_card_window') return state;
      if (!state.lastClaim || state.pile.length === 0) return state;
      const topCard = state.pile[state.pile.length - 1];
      const cardPlayerIdx = state.phase === 'last_card_window' ? (state.lastCardPlayerIndex ?? state.currentPlayerIndex) : state.currentPlayerIndex;
      const outcome = resolveChallenge(topCard, state.lastClaim, action.challengeType);
      const winnerIdx = outcome === 'challenger_wins' ? action.challengerIndex : cardPlayerIdx;
      const loserIdx = outcome === 'challenger_wins' ? cardPlayerIdx : action.challengerIndex;
      const pileCards = [...state.pile];
      let s: SpicyGameState = {
        ...state,
        challengeResult: { topCard, challengeType: action.challengeType, outcome, challengerIndex: action.challengerIndex, playerIndex: cardPlayerIdx, winnerIndex: winnerIdx, loserIndex: loserIdx, pileCardsCount: pileCards.length },
        phase: 'challenge_result',
        players: state.players.map((p, i) => i === winnerIdx ? { ...p, wonCards: [...p.wonCards, ...pileCards] } : p),
        pile: [],
      };
      const dr = drawMany(s, loserIdx, 2);
      s = dr.state;
      if (dr.gameEnded) return s;
      s = { ...s, currentPlayerIndex: loserIdx, isFirstOnPile: true, lastClaim: null };
      if (state.phase === 'last_card_window') s = { ...s, lastCardChallengeWon: outcome === 'player_wins' };
      return s;
    }

    case 'NO_CHALLENGE':
      if (state.phase === 'challenge_window') return { ...state, currentPlayerIndex: nextIdx(state), phase: 'handoff' };
      if (state.phase === 'last_card_window') return { ...state, lastCardChallengeWon: null, phase: 'trophy' };
      return state;

    case 'CONFIRM_RESULT': {
      if (state.phase !== 'challenge_result') return state;
      const isLastCard = state.lastCardPlayerIndex !== null && state.lastCardChallengeWon !== null;
      if (isLastCard) {
        if (state.lastCardChallengeWon) return { ...state, phase: 'trophy' };
        return { ...state, phase: 'handoff', lastCardPlayerIndex: null, lastCardChallengeWon: null };
      }
      return { ...state, phase: 'handoff' };
    }

    case 'COLLECT_TROPHY': {
      if (state.phase !== 'trophy') return state;
      const tIdx = state.lastCardPlayerIndex ?? state.currentPlayerIndex;
      const players = state.players.map((p, i) => i === tIdx ? { ...p, trophies: p.trophies + 1 } : p);
      const trophiesLeft = state.trophiesLeft - 1;
      const tp = players[tIdx];
      if (tp.trophies >= 2) return { ...state, players, trophiesLeft, phase: 'end', winner: tp };
      if (trophiesLeft === 0) return { ...state, players, trophiesLeft, phase: 'end', winner: determineWinner(players) };
      let s: SpicyGameState = { ...state, players, trophiesLeft, challengeResult: null, lastCardPlayerIndex: null, lastCardChallengeWon: null };
      const dr = drawMany(s, tIdx, 6);
      s = dr.state;
      if (dr.gameEnded) return s;
      return { ...s, currentPlayerIndex: tIdx, phase: 'handoff' };
    }

    case 'RESTART':
      return createInitialState(state.players.map((p) => ({ id: generatePlayerId(), name: p.name })));

    default:
      return state;
  }
}
