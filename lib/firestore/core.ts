'use client';

import {
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { BaseRoom } from '../types/core';

export function roomRef(code: string) {
  return doc(db, 'rooms', code);
}

export function subscribeToRoom<T extends BaseRoom>(
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
