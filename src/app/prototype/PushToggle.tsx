"use client";

import { BellRing, X } from "lucide-react";
import { useEffect, useState } from "react";
import { disablePush, enablePush, isSubscribed, needsHomeScreen, pushState } from "./push";
import { useApp } from "./store";
import { Toggle } from "./ui";

/** Settings > Notifications: phone notifications on/off for this phone. */
export function PushToggle() {
  const { flash, auth } = useApp();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void isSubscribed().then(setOn); }, []);
  if (auth.status !== "in") return null;
  const blocked = pushState() === "denied";
  return (
    <Toggle on={on} onChange={async (v) => {
      if (busy) return; setBusy(true);
      if (v) { const err = await enablePush(); if (err) flash(err); else { setOn(true); flash("Notifications are on for this phone"); } }
      else { await disablePush(); setOn(false); flash("Notifications are off for this phone"); }
      setBusy(false);
    }} label="Phone notifications" sub={blocked ? "Blocked in your phone settings. Allow notifications for Birdie there." : needsHomeScreen() ? "On iPhone, add Birdie to your Home Screen first." : "Messages, Unisupport replies, orders and study reminders on your notification bar, even when Birdie is closed"} />
  );
}

const SEEN = "birdie-push-asked";
/** A one-time friendly nudge to turn notifications on (shown once, dismissible). */
export function PushNudge() {
  const { auth, flash } = useApp();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (auth.status !== "in" || pushState() !== "default") return;
    try { if (localStorage.getItem(SEEN)) return; } catch { return; }
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [auth.status]);
  if (!show) return null;
  const done = () => { setShow(false); try { localStorage.setItem(SEEN, "1"); } catch { /* ignore */ } };
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--birdie-soft)] text-[var(--birdie-text)]"><BellRing size={17} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold">Don&apos;t miss a message</div>
        <p className="text-[12px] leading-snug text-[var(--dim)]">Get chats, Unisupport replies, orders and your buddy&apos;s study reminders on your phone.</p>
        <button onClick={async () => { const err = await enablePush(); done(); flash(err ?? "Notifications are on"); }} className="mt-2 rounded-lg bg-[var(--birdie)] px-3 py-1.5 text-[12.5px] font-semibold text-white active:scale-95">Turn on</button>
      </div>
      <button onClick={done} aria-label="Not now" className="text-[var(--dim)]"><X size={16} /></button>
    </div>
  );
}
