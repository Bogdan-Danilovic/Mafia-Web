import { SpicyCard, SpicyClaim, ChallengeOutcome } from '@/lib/games/spicy/types';

export function resolveChallenge(topCard: SpicyCard, claim: SpicyClaim, challenged: 'spice' | 'number'): ChallengeOutcome {
  if (topCard.type === 'joker_spice' && challenged === 'spice') return 'challenger_wins';
  if (topCard.type === 'joker_number' && challenged === 'number') return 'challenger_wins';
  if (challenged === 'spice') return topCard.spice !== claim.spice ? 'challenger_wins' : 'player_wins';
  return topCard.value !== claim.value ? 'challenger_wins' : 'player_wins';
}
