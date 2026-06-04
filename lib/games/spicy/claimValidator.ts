import { SpicyClaim } from '@/lib/games/spicy/types';

export function isValidClaim(claim: SpicyClaim, lastClaim: SpicyClaim | null, isFirstOnPile: boolean): boolean {
  if (isFirstOnPile) return claim.value >= 1 && claim.value <= 3;
  if (!lastClaim) return false;
  if (claim.spice !== lastClaim.spice) return false;
  if (claim.value > lastClaim.value) return true;
  if (lastClaim.value === 10 && claim.value >= 1 && claim.value <= 3) return true;
  return false;
}
