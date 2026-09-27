"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useApp } from "./store";

/** Bottom sheet that always covers the whole phone screen (portalled into the phone). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const { phone } = useApp();
  if (!phone) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-[70] flex items-end bg-[#12121A]/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="no-scrollbar max-h-[90%] w-full overflow-y-auto rounded-t-[26px] bg-[var(--paper)] px-5 pb-8 pt-3"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)]" />
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h3 className="disp text-[18px] font-bold text-[var(--text)]">{title}</h3>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--paper-dim)] text-[var(--dim)]" aria-label="Close"><X size={16} /></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    phone,
  );
}

export function Avatar({ initials, color, size = 40, online }: { initials: string; color: string; size?: number; online?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="disp flex h-full w-full items-center justify-center rounded-full font-bold text-white" style={{ background: color, fontSize: size * 0.36 }}>{initials}</div>
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--paper)] bg-[#3FB56B]" />}
    </div>
  );
}

export function Btn({ children, onClick, variant = "uni", disabled, className = "" }: { children: ReactNode; onClick?: () => void; variant?: "uni" | "ink" | "ghost" | "birdie" | "study"; disabled?: boolean; className?: string }) {
  const styles = {
    uni: "bg-[var(--uni)] text-white shadow-[0_10px_20px_-8px_rgba(166,63,189,0.7)]",
    ink: "bg-[var(--ink)] text-[var(--paper)]",
    ghost: "bg-[var(--paper-dim)] text-[var(--text)]",
    birdie: "bg-[var(--birdie)] text-white",
    study: "bg-[var(--study)] text-white",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">{children}</div>;
}

export function TopBar({ title, left, right }: { title: ReactNode; left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-2">
      <div className="flex min-w-0 items-center gap-3">{left}<div className="min-w-0">{title}</div></div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

export function IconBtn({ children, onClick, label }: { children: ReactNode; onClick?: () => void; label: string }) {
  return <button onClick={onClick} aria-label={label} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--paper-dim)] text-[var(--text)] transition active:scale-90">{children}</button>;
}

/** Renders children into the demo-controls column beside the phone. */
export function DemoControls({ active, title, children }: { active: boolean; title: string; children: ReactNode }) {
  const { slot } = useApp();
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  if (!ok || !slot || !active) return null;
  return createPortal(
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">{title}</div>
      <div className="space-y-2.5">{children}</div>
    </div>,
    slot,
  );
}

export function useTicker(running: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    setS(0);
    const i = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [running]);
  return s;
}
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-[var(--line)] px-6 py-8 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--paper-dim)] text-[var(--birdie)]">{icon}</div>}
      <div className="disp text-[15px] font-bold text-[var(--text)]">{title}</div>
      <p className="mt-1 text-[13px] leading-snug text-[var(--dim)]">{text}</p>
      {action && <div className="mt-4 w-full">{action}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (b: boolean) => void; label: string; sub?: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left last:border-0 active:opacity-70">
      <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold text-[var(--text)]">{label}</div>{sub && <div className="text-[12px] leading-snug text-[var(--dim)]">{sub}</div>}</div>
      <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${on ? "bg-[var(--uni)]" : "bg-[var(--line)]"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} /></span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-xl bg-[var(--paper-dim)] p-1">
      {options.map((o) => (<button key={o.id} onClick={() => onChange(o.id)} className={`flex-1 rounded-lg py-2 text-[12.5px] font-bold transition ${value === o.id ? "bg-white text-[var(--text)] shadow-sm" : "text-[var(--dim)]"}`}>{o.label}</button>))}
    </div>
  );
}

export function TextField({ value, onChange, placeholder, multiline, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; type?: string }) {
  const cls = "w-full rounded-2xl border-2 border-[var(--line)] bg-white p-3.5 text-[14px] text-[var(--text)] outline-none transition placeholder:text-[#a99fb8] focus:border-[var(--birdie)]";
  return multiline
    ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className={`${cls} resize-none`} />
    : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />;
}

/** Full-screen layer inside the phone (chats, settings, profiles, post composer). */
export function Screen({ open, children, z = 60 }: { open: boolean; children: ReactNode; z?: number }) {
  const { phone } = useApp();
  if (!phone) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 flex flex-col bg-[var(--paper)]" style={{ zIndex: z }} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 34, stiffness: 340 }}>
          <div className="h-12 shrink-0" />
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    phone,
  );
}
