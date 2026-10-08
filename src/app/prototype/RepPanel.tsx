"use client";

import { Copy, Share2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { applyRep, fetchMyRep, linkRep, unlinkRep, type RepInfo } from "./live/repData";
import { naira, useApp } from "./store";
import { Btn, Sheet, TextField } from "./ui";

/** Settings section: link to your course rep by code, or apply to become one / see your rep dashboard. */
export function RepPanel() {
  const { auth, flash, refreshRep } = useApp();
  const [rep, setRep] = useState<RepInfo | null>(null);
  const [sheet, setSheet] = useState<null | "apply" | "dash" | "link">(null);
  const [note, setNote] = useState(""); const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setRep(await fetchMyRep()); }, []);
  useEffect(() => { if (auth.status === "in") void fetchMyRep().then(setRep); }, [auth.status]);

  if (auth.status !== "in") return null;
  const linked = rep?.linked_rep;
  const st = rep?.status ?? null;

  async function apply() {
    setBusy(true); const err = await applyRep(note.trim()); setBusy(false);
    if (err) return flash("Couldn't send your application");
    flash("Application sent. We'll review it soon."); setSheet(null); void load();
  }
  async function link() {
    setBusy(true); const r = await linkRep(code); setBusy(false);
    if (r.error === "invalid_code") return flash("That code isn't an active course rep code");
    if (r.error === "own_code") return flash("That's your own rep code");
    if (r.error) return flash("Couldn't link. Try again.");
    flash(`You're now with ${r.name}`); setCode(""); setSheet(null); void load();
  }
  async function share() {
    const text = `Join me on Birdie. Use my course rep code ${rep?.code} in Settings > Course rep.`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); flash("Invite copied"); } } catch { /* cancelled */ }
  }

  const repLine = st === "active" ? "You're a course rep. Tap for your code and earnings."
    : st === "pending" ? "Application under review"
    : st === "rejected" ? "Not approved this time. You can apply again."
    : st === "removed" ? "No longer a rep. You can apply again."
    : "Get unlimited Birdie AI and earn from your class";

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white px-4 pb-1 pt-3.5">
      <div className="mb-1 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[var(--birdie)]"><Users size={14} /> Course rep</div>
      <button onClick={() => setSheet("link")} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left active:opacity-70">
        <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold text-[var(--text)]">Your course rep</div><div className="text-[12px] leading-snug text-[var(--dim)]">{linked ? `${linked.name}${linked.active ? "" : " (no longer a rep)"}` : "Enter your rep's code"}</div></div><span className="text-[var(--dim)]">›</span>
      </button>
      <button onClick={() => setSheet(st === "active" ? "dash" : st === "pending" ? null : "apply")} className="flex w-full items-center gap-3 py-3 text-left active:opacity-70">
        <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold text-[var(--text)]">{st === "active" ? "Rep dashboard" : "Become a course rep"}</div><div className="text-[12px] leading-snug text-[var(--dim)]">{repLine}</div></div>{st !== "pending" && <span className="text-[var(--dim)]">›</span>}
      </button>

      <Sheet open={sheet === "link"} onClose={() => setSheet(null)} title="Your course rep">
        <div className="space-y-3">
          {linked && <div className="rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13px]">Linked to <b>{linked.name}</b>{!linked.active && " -- they're no longer a rep, so you can join another."}</div>}
          <TextField value={code} onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="Rep code, e.g. 9E267D" />
          <Btn variant="study" disabled={busy || code.length < 4} onClick={() => void link()}>{linked ? "Switch to this rep" : "Join"}</Btn>
          {linked && <Btn variant="ghost" onClick={async () => { await unlinkRep(); flash("Unlinked"); setSheet(null); void load(); }}>Unlink</Btn>}
          <p className="text-[11.5px] leading-snug text-[var(--dim)]">Your rep earns a small share of what you spend on Birdie. It costs you nothing extra.</p>
        </div>
      </Sheet>

      <Sheet open={sheet === "apply"} onClose={() => setSheet(null)} title="Become a course rep">
        <div className="space-y-3">
          <ul className="space-y-1.5 text-[13px] leading-snug text-[var(--text)]">
            <li>• Unlimited Birdie AI while you&apos;re a rep</li>
            <li>• {rep?.pct ?? 5}% of what your linked classmates spend on Exam Passes, shared courses and AI, paid into your Birdie balance</li>
            <li>• First access to new features</li>
          </ul>
          <TextField multiline value={note} onChange={setNote} placeholder="Which class do you rep? School, department, level, roughly how many students." />
          <Btn variant="study" disabled={busy || note.trim().length < 10} onClick={() => void apply()}>{busy ? "Sending..." : "Apply"}</Btn>
          <p className="text-[11.5px] leading-snug text-[var(--dim)]">The Unisupport team reviews every application. Make sure your school and program are filled in on your profile.</p>
        </div>
      </Sheet>

      <Sheet open={sheet === "dash"} onClose={() => setSheet(null)} title="Rep dashboard">
        {rep && (
          <div className="space-y-4">
            <div className="rounded-[20px] bg-[var(--ink)] p-4 text-[var(--paper)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Your code</div>
              <div className="disp text-[30px] font-bold tracking-widest">{rep.code}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => { void navigator.clipboard.writeText(rep.code ?? ""); flash("Code copied"); }} className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-semibold"><Copy size={14} /> Copy</button>
                <button onClick={() => void share()} className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-semibold"><Share2 size={14} /> Share with my class</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[var(--paper-dim)] p-3"><div className="text-[11px] text-[var(--dim)]">Linked students</div><div className="disp text-[22px] font-bold">{rep.students}</div></div>
              <div className="rounded-xl bg-[var(--paper-dim)] p-3"><div className="text-[11px] text-[var(--dim)]">Earned so far</div><div className="disp text-[22px] font-bold">{naira(rep.earned)}</div></div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Where it came from</div>
              {Object.keys(rep.by_source).length === 0 ? <p className="text-[13px] text-[var(--dim)]">Nothing yet. Share your code with your class.</p> : (
                <div className="space-y-1.5">{Object.entries(rep.by_source).map(([k, v]) => (<div key={k} className="flex justify-between rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-[var(--line)]"><span>{k.replace(/^Rep commission\s*·\s*/, "")}</span><b>{naira(v)}</b></div>))}</div>
              )}
              {rep.pending_ai > 0 && <p className="mt-2 text-[11.5px] text-[var(--dim)]">Plus {naira(rep.pending_ai)} from AI usage, paid into your balance once it reaches ₦50.</p>}
            </div>
            <p className="text-[11.5px] leading-snug text-[var(--dim)]">You earn {rep.pct}% of what linked classmates spend on Exam Passes, shared courses and Birdie AI. Writer and help desk fees don&apos;t count. Earnings stop if you stop being a rep.</p>
            <Btn variant="ghost" onClick={() => { void load(); void refreshRep(); }}>Refresh</Btn>
          </div>
        )}
      </Sheet>
    </section>
  );
}
