'use client';

import { useReducer } from 'react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { SpicyPlayerSetup } from '@/lib/games/spicy/types';
import { createInitialState, spicyReducer } from '@/lib/games/spicy/gameEngine';
import { PlayingScreen } from '@/components/games/spicy/PlayingScreen';
import { ChallengeModal, ChallengeResultModal, TrophyModal } from '@/components/games/spicy/Modals';
import { SpicyScoreBoard } from '@/components/games/spicy/ScoreBoard';
import { Button } from '@/components/ui/Button';

interface Props { setups: SpicyPlayerSetup[]; }

export function SpicyGameScreen({ setups }: Props) {
  const [state, dispatch] = useReducer(spicyReducer, setups, createInitialState);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const lastCardPlayer = state.lastCardPlayerIndex !== null ? state.players[state.lastCardPlayerIndex] : null;

  if (state.phase === 'end') {
    return <SpicyScoreBoard players={state.players} winner={state.winner} dispatch={dispatch} />;
  }

  const challengePlayerIndex = state.phase === 'last_card_window' && state.lastCardPlayerIndex !== null
    ? state.lastCardPlayerIndex : state.currentPlayerIndex;

  return (
    <div className="relative min-h-dvh" style={{ background: '#080b14' }}>
      <AnimatePresence mode="wait">
        {state.phase === 'handoff' && (
          <motion.div key="handoff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex min-h-dvh flex-col items-center justify-center px-5" style={{ background: '#080b14' }}>
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-0"
              style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(239,68,68,0.07) 0%, transparent 70%)' }}
            />
            <div className="relative z-10 w-full max-w-sm text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400/70">Na potezu</div>
              <div className="mb-6 inline-block rounded-full px-6 py-3 text-2xl font-black text-white"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {currentPlayer.name}
              </div>
              <div className="mb-6 flex justify-center gap-4 text-xs text-white/40">
                <span>🏆 {currentPlayer.trophies} trofeja</span>
                <span>🃏 {currentPlayer.wonCards.length} osvajenih</span>
                <span>✋ {currentPlayer.hand.length} u ruci</span>
              </div>
              <div className="mb-6 flex gap-3 justify-center text-xs text-white/25">
                <span>Gomila: {state.pile.length}</span><span>·</span>
                <span>Špil: {state.drawPile.length}</span><span>·</span>
                <span>Trofeja: {state.trophiesLeft}</span>
              </div>
              <p className="mb-6 text-sm text-white/50">
                Predaj uređaj <span className="font-bold text-white">{currentPlayer.name}</span>, zatim otkrijte karte.
              </p>
              <Button fullWidth onClick={() => dispatch({ type: 'REVEAL_HAND' })}
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 8px 32px rgba(239,68,68,0.4)' }}
                className="!text-white !font-bold !text-base">
                🃏 Otkrij karte
              </Button>
            </div>
          </motion.div>
        )}

        {state.phase === 'playing' && (
          <PlayingScreen key="playing" state={state} dispatch={dispatch} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(state.phase === 'challenge_window' || state.phase === 'last_card_window') && state.lastClaim && (
          <ChallengeModal
            key="challenge"
            players={state.players}
            cardPlayerIndex={challengePlayerIndex}
            lastClaim={state.lastClaim}
            isLastCard={state.phase === 'last_card_window'}
            onChallenge={(ci, t) => dispatch({ type: 'CHALLENGE', challengerIndex: ci, challengeType: t })}
            onNoChallenge={() => dispatch({ type: 'NO_CHALLENGE' })}
          />
        )}
        {state.phase === 'challenge_result' && state.challengeResult && (
          <ChallengeResultModal key="result" result={state.challengeResult} players={state.players} onConfirm={() => dispatch({ type: 'CONFIRM_RESULT' })} />
        )}
        {state.phase === 'trophy' && lastCardPlayer && (
          <TrophyModal key="trophy" player={lastCardPlayer} trophiesLeft={state.trophiesLeft} onCollect={() => dispatch({ type: 'COLLECT_TROPHY' })} />
        )}
      </AnimatePresence>
    </div>
  );
}
