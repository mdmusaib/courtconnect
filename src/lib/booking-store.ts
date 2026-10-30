"use client";

import { useSyncExternalStore } from "react";

export interface BookingSessionState {
  venueId: string | null;
  courtId: string | null;
  dateKey: string | null;
  startIso: string | null;
  hours: number;
}

const STORAGE_KEY = "courtconnect_booking_session";

let currentState: BookingSessionState = {
  venueId: null,
  courtId: null,
  dateKey: null,
  startIso: null,
  hours: 1,
};

// Initialize from sessionStorage if in browser
if (typeof window !== "undefined") {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      currentState = { ...currentState, ...parsed };
    }
  } catch {
    // Ignore storage parse issues
  }
}

const listeners = new Set<() => void>();

function emitChange() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch {
      // Storage quota or private mode fallback
    }
  }
  for (const listener of listeners) {
    listener();
  }
}

export function setBookingSession(update: Partial<BookingSessionState>) {
  currentState = { ...currentState, ...update };
  emitChange();
}

export function clearBookingSlot() {
  currentState = { ...currentState, startIso: null, hours: 1 };
  emitChange();
}

export function getBookingSessionSnapshot(): BookingSessionState {
  return currentState;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useBookingSession() {
  const state = useSyncExternalStore(
    subscribe,
    getBookingSessionSnapshot,
    () => currentState,
  );

  return {
    ...state,
    setSession: setBookingSession,
    clearSlot: clearBookingSlot,
  };
}
