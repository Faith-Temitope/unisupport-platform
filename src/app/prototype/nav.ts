"use client";

// The phone's Back button. Every screen change (tab + open chat + Discover screen + overlay) and every
// open sheet or sub-screen gets an entry in the browser history, so Back steps back one screen at a
// time, like WeChat. From a root screen Back goes to Chats first, and from Chats it leaves the app.
// In-app back arrows keep the browser history in step (they pop the matching entry quietly).
import { useEffect, useRef } from "react";

type Entry = { kind: "screen"; snap: string } | { kind: "layer"; id: number; close: () => void };

const stack: Entry[] = [];
let cur: string | null = null;
let restoring: string | null = null;
let ignore = 0;
let seq = 0;
let startedAt = 0;
let handlers: { apply: (snap: string) => void; isRoot: (snap: string) => boolean; rootOf: (snap: string) => string } | null = null;

let pending = 0;
// history.back() lands later, so a push made meanwhile waits for it (or the back would undo the push).
function push() { if (ignore > 0) { pending++; return; } try { history.pushState({ birdie: stack.length }, ""); } catch { /* ignore */ } }
function quietBack() { ignore++; history.back(); }

function onPop() {
  if (ignore > 0) { ignore--; if (ignore === 0) for (; pending > 0; pending--) push(); return; }
  const e = stack.pop();
  if (e?.kind === "layer") { e.close(); return; }
  if (e?.kind === "screen") { restoring = e.snap; handlers?.apply(e.snap); return; }
  // Nothing left in the app's own history: go up to the tab's root, then to Chats, then leave.
  if (!handlers || cur === null) { history.back(); return; }
  if (!handlers.isRoot(cur)) { const root = handlers.rootOf(cur); restoring = root; handlers.apply(root); push(); return; }
  if (!cur.startsWith('["chats"')) { const chats = '["chats",null,null,null]'; restoring = chats; handlers.apply(chats); push(); return; }
  history.back();
}

/** Called by the store with the current screen; wires up the Back button once. */
export function navInit(h: NonNullable<typeof handlers>) {
  handlers = h;
  if (startedAt) return () => {};
  startedAt = performance.now();
  push(); // one entry to catch the first Back press
  window.addEventListener("popstate", onPop);
  return () => { window.removeEventListener("popstate", onPop); startedAt = 0; };
}

/** Record a screen change. */
export function navScreen(snap: string) {
  if (cur === null || performance.now() - startedAt < 1500) { cur = snap; return; } // restoring the last screen after a reload
  if (snap === cur) return;
  if (restoring !== null) { cur = snap; restoring = null; return; }
  const top = stack[stack.length - 1];
  if (top?.kind === "screen" && top.snap === snap) { stack.pop(); cur = snap; quietBack(); return; } // in-app back arrow
  if (handlers?.isRoot(cur) && handlers.isRoot(snap)) { cur = snap; return; } // switching tabs
  stack.push({ kind: "screen", snap: cur }); cur = snap; push();
}

/** A sheet, menu or sub-screen that Back should close while `open`. */
export function useBackLayer(open: boolean, close: () => void) {
  const fn = useRef(close);
  useEffect(() => { fn.current = close; });
  useEffect(() => {
    if (!open) return;
    const id = ++seq;
    stack.push({ kind: "layer", id, close: () => fn.current() });
    push();
    return () => {
      const i = stack.findIndex((e) => e.kind === "layer" && e.id === id);
      if (i < 0) return; // already closed by Back
      const top = i === stack.length - 1;
      stack.splice(i, 1);
      if (top) quietBack();
    };
  }, [open]);
}

/** An in-app back arrow: the same as pressing the phone's Back button. */
export function navBack() { history.back(); }
