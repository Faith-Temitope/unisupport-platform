"use client";

// Signals for going easy on weak phones and expensive or slow data. Used to shorten animations,
// load smaller pictures and skip work the student won't notice.

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
const nav = () => (typeof navigator === "undefined" ? null : (navigator as Nav));

/** A low-memory or few-core phone (most budget Androids): fewer, lighter animations. */
export function isLowEndDevice(): boolean {
  const n = nav(); if (!n) return false;
  return (n.deviceMemory !== undefined && n.deviceMemory <= 3) || (n.hardwareConcurrency !== undefined && n.hardwareConcurrency <= 4) || !!n.connection?.saveData;
}

/** Slow or metered connection (2G/3G or Data Saver on): smaller pictures, no video previews. */
export function isSlowNetwork(): boolean {
  const c = nav()?.connection;
  return !!c && (!!c.saveData || ["slow-2g", "2g", "3g"].includes(c.effectiveType ?? ""));
}

/** Run a repeating check only while the app is on screen (saves data and battery). */
export function whileVisible(fn: () => void): () => void {
  return () => { if (typeof document === "undefined" || !document.hidden) fn(); };
}
