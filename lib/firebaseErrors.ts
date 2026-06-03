export const FIREBASE_ERROR_MAP: Record<string, string> = {
  'permission-denied': 'Nemate pristup ovoj sobi.',
  'not-found': 'Soba nije pronađena.',
  unavailable: 'Firebase servis je nedostupan. Pokušajte za nekoliko sekundi.',
  cancelled: 'Operacija je otkazana.',
  'already-exists': 'Soba sa ovim kodom već postoji.',
  unauthenticated: 'Morate biti prijavljeni za ovu akciju.',
  'resource-exhausted': 'Previše zahtjeva. Pokušajte za trenutak.',
  'failed-precondition': 'Akcija nije moguća u trenutnom stanju igre.',
  internal: 'Interna greška servera. Pokušajte ponovo.',
};

export function getFirebaseErrorMessage(code: string): string {
  return FIREBASE_ERROR_MAP[code] ?? 'Neočekivana greška. Pokušajte ponovo.';
}
