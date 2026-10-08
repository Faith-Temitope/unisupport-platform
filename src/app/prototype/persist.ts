"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "birdie:view:";

/**
 * useState that survives a page refresh (for this browser tab), so reloading brings you back to
 * the screen you were on instead of the start, like a real app. Restored right after mount.
 */
export function useViewState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [v, setV] = useState<T>(initial);
  const ready = useRef(false);
  useEffect(() => {
    void Promise.resolve().then(() => {
      try { const raw = sessionStorage.getItem(PREFIX + key); if (raw != null) setV(JSON.parse(raw) as T); } catch { /* storage blocked */ }
      ready.current = true;
    });
  }, [key]);
  useEffect(() => {
    if (!ready.current) return;
    try { sessionStorage.setItem(PREFIX + key, JSON.stringify(v)); } catch { /* storage blocked */ }
  }, [key, v]);
  return [v, setV];
}

/** Forget every saved screen (sign-out, reset). */
export function clearViewState() {
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith(PREFIX)) sessionStorage.removeItem(k); } catch { /* storage blocked */ }
}
