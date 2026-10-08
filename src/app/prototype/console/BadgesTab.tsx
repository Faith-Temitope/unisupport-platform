"use client";

// Badges and the Founding Creator programme. While the programme is open, the first creators to post
// or share a course get the Founding Creator badge automatically (up to the limit). Close it when
// you're ready and nobody new can get it. Other badges are earned automatically; a few are given by hand.
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { BADGE_INFO, GRANTABLE } from "../ProfileBadges";
import { Btn2, Card, Switch } from "../staff/kit";

type Holder = { user_id: string; name: string | null; handle: string | null; at: string; note: string | null };
type Found = { user_id: string; email: string; name: string | null; handle: string | null };
const msg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

export function BadgesTab({ show }: { show: (m: string) => void }) {
  const sb = createClient();
  const [open, setOpen] = useState<boolean | null>(null);
  const [limit, setLimit] = useState(100);
  const [badge, setBadge] = useState("founding_creator");
  const [holders, setHolders] = useState<Holder[]>([]);
  const [q, setQ] = useState(""); const [found, setFound] = useState<Found[]>([]); const [note, setNote] = useState("");

  const loadCfg = useCallback(async () => {
    const { data } = await createClient().from("app_config").select("key,value").in("key", ["founding_creators_open", "founding_creators_limit"]);
    for (const r of data ?? []) { if (r.key === "founding_creators_open") setOpen(Number(r.value) === 1); else setLimit(Number(r.value)); }
  }, []);
  const loadHolders = useCallback(async (b: string) => { const { data } = await createClient().rpc("admin_badge_holders", { p_badge: b }); setHolders((data ?? []) as Holder[]); }, []);
  useEffect(() => { void Promise.resolve().then(loadCfg); }, [loadCfg]);
  useEffect(() => { void Promise.resolve().then(() => loadHolders(badge)); }, [badge, loadHolders]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => void createClient().rpc("admin_find_user", { p_q: q.trim() }).then(({ data }) => setFound((data ?? []) as Found[])), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function setCfg(key: string, value: number) {
    const { error } = await sb.from("app_config").upsert({ key, value });
    if (error) return show(msg(error));
    void loadCfg(); show("Saved");
  }
  async function grant(userId: string, on: boolean) {
    const { error } = await sb.rpc("admin_set_badge", { p_user: userId, p_badge: badge, p_on: on, p_note: on ? note : null });
    if (error) return show(msg(error));
    show(on ? `${BADGE_INFO[badge].label} given` : "Badge removed"); void loadHolders(badge);
  }

  return (
    <div className="space-y-4">
      <Card title="Founding Creator programme" sub="While it's open, the first creators to post or share a course get the Founding Creator badge automatically. Close it and nobody new can get it, ever.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3"><Switch on={!!open} onChange={(v) => void setCfg("founding_creators_open", v ? 1 : 0)} /><span className="text-[14px] font-semibold">{open === null ? "Loading..." : open ? "Open: new creators are getting it" : "Closed"}</span></div>
          <label className="flex items-center gap-2 text-[13px]">Up to <input type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} onBlur={() => void setCfg("founding_creators_limit", Math.max(1, limit))} className="w-20 rounded-lg border-2 border-[#E6DCF0] px-2 py-1" /> creators</label>
        </div>
      </Card>

      <Card title="Badges" sub="Most badges are earned automatically from what people do (likes, learners, tutorials, certificates, course rep...). These ones you give by hand.">
        <div className="flex flex-wrap gap-2">{GRANTABLE.map((b) => (<button key={b} onClick={() => setBadge(b)} className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${badge === b ? "bg-[#1a1024] text-white" : "bg-[#F4EFF8]"}`}>{BADGE_INFO[b].label}</button>))}</div>
        <p className="mt-2 text-[12.5px] text-[var(--dim)]">{BADGE_INFO[badge].desc}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find someone by @username, name or email" className="rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[13.5px] outline-none" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note shown with the badge (optional)" className="rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[13.5px] outline-none" />
        </div>
        {q.trim().length >= 2 && <div className="mt-2 divide-y divide-[#F0EAF7] rounded-xl bg-[#F8F4FB]">{found.length === 0 ? <div className="p-3 text-[12.5px] text-[var(--dim)]">No one found.</div> : found.map((u) => (
          <div key={u.user_id} className="flex items-center gap-3 px-3 py-2 text-[13px]"><span className="min-w-0 flex-1 truncate"><b>{u.name ?? "No name"}</b>{u.handle ? ` @${u.handle}` : ""} · {u.email}</span><Btn2 small onClick={() => void grant(u.user_id, true)}>Give badge</Btn2></div>
        ))}</div>}
        <div className="mt-4 text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">{BADGE_INFO[badge].label}: {holders.length}</div>
        <div className="mt-1 divide-y divide-[#F0EAF7]">{holders.map((h) => (
          <div key={h.user_id} className="flex items-center gap-3 py-2 text-[13px]"><span className="min-w-0 flex-1 truncate"><b>{h.name ?? "Student"}</b>{h.handle ? ` @${h.handle}` : ""} · since {new Date(h.at).toLocaleDateString()}</span><button onClick={() => void grant(h.user_id, false)} className="text-[12.5px] font-semibold text-[#C2412D]">Remove</button></div>
        ))}</div>
      </Card>
    </div>
  );
}
