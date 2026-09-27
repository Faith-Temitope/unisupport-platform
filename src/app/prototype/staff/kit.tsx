"use client";

import Link from "next/link";
import { Check, FlaskConical } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BirdieMark } from "@/components/brand/Bot";

export const nairaS = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
export const usd = (n: number) => "$" + n.toFixed(n < 1 ? 3 : 2);

/** Desktop shell used by the desk and the team console. Sample data banner is always visible. */
export function DeskShell({ app, tagline, nav, active, onNav, right, children }: { app: string; tagline: string; nav: { id: string; label: string; icon: ReactNode; badge?: number }[]; active: string; onNav: (id: string) => void; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="proto-root flex min-h-screen bg-[#F4EFF9] text-[var(--text)]">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[var(--ink)] p-4 text-[var(--paper)] md:flex">
        <div className="mb-6 flex items-center gap-3 px-1"><BirdieMark size={40} /><div><div className="disp text-[17px] font-bold leading-tight">{app}</div><div className="text-[11.5px] text-white/45">{tagline}</div></div></div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => onNav(n.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition ${active === n.id ? "bg-white/12 text-white" : "text-white/55 hover:bg-white/6 hover:text-white"}`}>
              <span className={active === n.id ? "text-[#E6B3F2]" : ""}>{n.icon}</span><span className="flex-1">{n.label}</span>
              {n.badge ? <span className="rounded-full bg-[var(--help)] px-2 py-0.5 text-[11px] font-bold text-white">{n.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-[12.5px]">
          <Link href="/prototype" className="block rounded-lg px-3 py-2 text-white/55 hover:bg-white/6 hover:text-white">← Student app</Link>
          <Link href="/prototype/desk" className="block rounded-lg px-3 py-2 text-white/55 hover:bg-white/6 hover:text-white">Help desk</Link>
          <Link href="/prototype/writer" className="block rounded-lg px-3 py-2 text-white/55 hover:bg-white/6 hover:text-white">Writer app</Link>
          <Link href="/prototype/console" className="block rounded-lg px-3 py-2 text-white/55 hover:bg-white/6 hover:text-white">Team console</Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b border-[#E3D6EE] bg-[#FBF3FF] px-6 py-2 text-[12.5px] text-[#6E2A80]"><FlaskConical size={14} /> <b>Sample workspace.</b> This is a preview with example data. It connects to live Supabase data once the student app writes to it.<span className="ml-auto">{right}</span></div>
        <div className="mx-auto max-w-[1180px] p-6">{children}</div>
      </main>
    </div>
  );
}

export function Card({ title, sub, right, children, pad = true }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; pad?: boolean }) {
  return (
    <section className="rounded-2xl border border-[#E6DCF0] bg-white shadow-[0_1px_0_rgba(80,20,110,0.03)]">
      {(title || right) && <header className="flex items-center justify-between gap-3 border-b border-[#EFE6F6] px-5 py-3.5"><div><h3 className="disp text-[15.5px] font-bold">{title}</h3>{sub && <p className="text-[12.5px] text-[var(--dim)]">{sub}</p>}</div>{right}</header>}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="disp text-[26px] font-bold leading-tight">{title}</h1>{sub && <p className="mt-1 text-[14px] text-[var(--dim)]">{sub}</p>}</div>{right}</div>;
}

export function Btn2({ children, onClick, tone = "primary", disabled, small }: { children: ReactNode; onClick?: () => void; tone?: "primary" | "ghost" | "danger" | "dark"; disabled?: boolean; small?: boolean }) {
  const t = { primary: "bg-[var(--birdie)] text-white hover:brightness-110", ghost: "bg-[var(--paper-dim)] text-[var(--text)] hover:bg-[#e8dcf3]", danger: "bg-[var(--help-soft)] text-[#C2412D] hover:brightness-95", dark: "bg-[var(--ink)] text-white hover:bg-[#2a1a3a]" }[tone];
  return <button onClick={onClick} disabled={disabled} className={`rounded-xl font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${small ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2.5 text-[13.5px]"} ${t}`}>{children}</button>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (b: boolean) => void; label?: string }) {
  return (
    <button onClick={() => onChange(!on)} aria-label={label} aria-pressed={on} className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${on ? "bg-[var(--birdie)]" : "bg-[#d9cde5]"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} /></button>
  );
}

export function Input({ value, onChange, placeholder, type = "text", suffix, w }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; suffix?: string; w?: string }) {
  return (
    <div className={`flex items-center rounded-xl border-2 border-[#E6DCF0] bg-white px-3 focus-within:border-[var(--birdie)] ${w ?? ""}`}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full min-w-0 bg-transparent py-2 text-[14px] outline-none" />
      {suffix && <span className="ml-2 shrink-0 text-[12px] text-[var(--dim)]">{suffix}</span>}
    </div>
  );
}

export function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "purple" | "green" | "amber" | "red" }) {
  const t = { gray: "bg-[#EFE6F6] text-[#6E6480]", purple: "bg-[#F1DDF8] text-[#7B2A91]", green: "bg-[#DDF5EC] text-[#0a7a56]", amber: "bg-[#FFF0D2] text-[#8A5A0E]", red: "bg-[#FFE9E4] text-[#C2412D]" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${t}`}>{children}</span>;
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2200); };
  const node = msg ? <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-[13.5px] font-semibold text-white shadow-xl"><Check size={15} className="text-[#E6B3F2]" strokeWidth={3} /> {msg}</div> : null;
  return { show, node };
}
