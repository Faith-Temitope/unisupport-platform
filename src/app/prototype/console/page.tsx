"use client";

// Real admin console, backed by Supabase like the student app and /prototype/live/staff. Visible
// only to profiles.role = 'admin' (RLS backs every read/write here too, this page is not the
// security boundary). Four tabs: Users (role changes), Schools (per-institution policy toggles),
// Pricing (the quiz/writing x standard/full rate card, deadline multipliers, app config), AI
// (provider/model enable + margin).
import { SchoolSuggestions } from "./SchoolSuggestions";
import { BadgesTab } from "./BadgesTab";
import { BadgeCheck, BarChart3, Building2, Cpu, Crown, LogOut, Megaphone, Printer, Sliders, Users as UsersIcon } from "lucide-react";
import { OrdersTab } from "./OrdersTab";
import { adminListReps, adminSetRep, type AdminRep } from "../live/repData";
import { SponsorsTab } from "./SponsorsTab";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { fetchActivityOverview, fetchDailySum, fetchOverview, fetchSchoolBreakdown, fetchTopWriters, type ActivityOverview, type DaySeries, type Overview, type SchoolBreakdown, type TopWriter } from "../live/analyticsData";
import { Btn2, Card, Input, PageTitle, Pill, Switch, nairaS, usd, useToast } from "../staff/kit";

type Role = "student" | "writer" | "support" | "admin";
interface Profile { id: string; role: Role; full_name: string | null; institution_id: string | null; level: string | null; program: string | null; created_at: string }
interface Institution { id: string; name: string; country: string | null; created_at: string }
interface Policy { institution_id: string; allow_mentor: boolean; allow_assisted: boolean; allow_full: boolean; allow_just_do_it: boolean }
interface PricingRow { service: "quiz" | "writing"; access: "standard" | "full"; rate: number }
interface DMRow { id: string; multiplier: number }
interface ConfigRow { key: string; value: number }
interface AiProvider { id: string; brand_name: string; vendor: string; vendor_name: string | null; is_free: boolean; margin: number; enabled: boolean; sort: number }
interface AiModel { id: string; provider_id: string; tier: string; label: string; vendor_model: string; input_usd_per_mtok: number; output_usd_per_mtok: number; enabled: boolean }

const roleTone: Record<Role, "gray" | "purple" | "green" | "amber" | "red"> = { student: "gray", writer: "purple", support: "amber", admin: "red" };
const btn = "rounded-xl px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 disabled:opacity-40";

export default function Console() {
  const [me, setMe] = useState<{ id: string; name: string } | null | "loading">("loading");
  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return setMe(null);
    const { data: p } = await sb.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();
    if (!p || p.role !== "admin") return setMe(null);
    setMe({ id: user.id, name: (p.full_name as string) || user.email || "Admin" });
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (me === "loading") return <Shell><div className="p-10 text-center text-sm text-[#6b5b7e]">Loading...</div></Shell>;
  if (!me) return <Shell><SignIn onDone={load} /></Shell>;
  return <Shell><Workspace me={me} onOut={async () => { await createClient().auth.signOut(); setMe(null); }} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="proto-root min-h-screen bg-[#F4EFF8] text-[#1a1024]" style={{ fontFamily: "system-ui, sans-serif" }}>{children}</div>;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr("");
    const { error } = await createClient().auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setBusy(false); return; }
    await onDone(); setBusy(false);
    setErr("This account isn't an admin account.");
  }
  return (
    <div className="mx-auto mt-24 w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#8b3fa6]">Unisupport console</div>
      <h1 className="mb-4 text-2xl font-bold">Admin sign in</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" className="mb-2 w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-sm outline-none" />
      <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void go()} type="password" placeholder="Password" className="mb-3 w-full rounded-xl bg-[#F4EFF8] px-4 py-3 text-sm outline-none" />
      {err && <div role="alert" className="mb-3 text-[13px] text-red-600">{err}</div>}
      <button disabled={busy || !email || !pw} onClick={() => void go()} className={`${btn} w-full bg-[#1a1024] py-3 text-white`}>{busy ? "Signing in..." : "Sign in"}</button>
    </div>
  );
}

function Workspace({ me, onOut }: { me: { id: string; name: string }; onOut: () => void }) {
  const [tab, setTab] = useState<"activity" | "orders" | "users" | "reps" | "badges" | "sponsors" | "schools" | "pricing" | "ai">("activity");
  const { show, node } = useToast();
  const nav = [
    { id: "activity", label: "Activity", icon: <BarChart3 size={17} /> },
    { id: "orders", label: "Orders", icon: <Printer size={17} /> },
    { id: "users", label: "Users", icon: <UsersIcon size={17} /> },
    { id: "reps", label: "Reps", icon: <BadgeCheck size={17} /> },
    { id: "badges", label: "Badges", icon: <Crown size={17} /> },
    { id: "sponsors", label: "Sponsors", icon: <Megaphone size={17} /> },
    { id: "schools", label: "Schools", icon: <Building2 size={17} /> },
    { id: "pricing", label: "Pricing", icon: <Sliders size={17} /> },
    { id: "ai", label: "AI models", icon: <Cpu size={17} /> },
  ];
  return (
    <div className="mx-auto max-w-[1180px] p-6">
      <PageTitle title="Unisupport console" sub={`Signed in as ${me.name}`} right={<button onClick={onOut} className={`${btn} flex items-center gap-1.5 bg-white`}><LogOut size={14} />Sign out</button>} />
      <div className="mb-5 flex gap-2 border-b border-[#E6DCF0] pb-2">
        {nav.map((n) => (<button key={n.id} onClick={() => setTab(n.id as typeof tab)} className={`${btn} flex items-center gap-2 ${tab === n.id ? "bg-[#1a1024] text-white" : "bg-white"}`}>{n.icon}{n.label}</button>))}
      </div>
      {tab === "activity" && <ActivityTab />}
      {tab === "orders" && <OrdersTab show={show} />}
      {tab === "users" && <UsersTab show={show} />}
      {tab === "reps" && <RepsTab show={show} />}
      {tab === "badges" && <BadgesTab show={show} />}
      {tab === "sponsors" && <SponsorsTab show={show} />}
      {tab === "schools" && <SchoolsTab show={show} />}
      {tab === "pricing" && <PricingTab show={show} />}
      {tab === "ai" && <AiTab show={show} />}
      {node}
    </div>
  );
}

// ---------------- Activity ----------------
// Signups/revenue/AI-spend/writer leaderboard come from tables that already existed (topups,
// ai_usage, writers, profiles). DAU/WAU/hours/downloads/top-pages come from `app_events`, a new
// table this ships with -- see the migration note at the bottom of this file. Until that SQL runs,
// this section just renders zeros instead of erroring (the query comes back empty, not failing).
function ActivityTab() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [act, setAct] = useState<ActivityOverview | null>(null);
  const [revenue, setRevenue] = useState<DaySeries[]>([]);
  const [aiSpend, setAiSpend] = useState<DaySeries[]>([]);
  const [writers, setWriters] = useState<TopWriter[]>([]);
  const [schools, setSchools] = useState<SchoolBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void Promise.all([fetchOverview(), fetchActivityOverview(), fetchDailySum("topups", "amount", 14), fetchDailySum("ai_usage", "charged_ngn", 14), fetchTopWriters(), fetchSchoolBreakdown()])
      .then(([o, a, r, s, w, sc]) => { setOv(o); setAct(a); setRevenue(r); setAiSpend(s); setWriters(w); setSchools(sc); })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !ov || !act) return <div className="p-10 text-center text-sm text-[var(--dim)]">Loading...</div>;
  const tiles = [
    { label: "Total users", value: String(ov.totalUsers), sub: `+${ov.signups7d} this week` },
    { label: "Revenue (30d)", value: nairaS(ov.revenueNgn30d), sub: `AI cost ${nairaS(ov.aiSpendNgn30d)}` },
    { label: "Daily actives", value: String(act.dau), sub: `${act.wau} weekly` },
    { label: "Hours in-app (30d)", value: String(act.estHours30d), sub: `${act.totalHeartbeats30d} heartbeats` },
    { label: "Downloads (30d)", value: String(act.downloads30d), sub: "Help delivery files" },
    { label: "Help sessions open", value: String(ov.activeSessions.desk + ov.activeSessions.fee + ov.activeSessions.writer), sub: `${ov.jobsByStage.active} jobs active` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((t) => (<Card key={t.label} pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">{t.label}</div><div className="disp mt-1 text-[24px] font-bold">{t.value}</div><div className="mt-0.5 text-[11.5px] text-[var(--dim)]">{t.sub}</div></Card>))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Revenue, last 14 days" sub="Successful top-ups by day"><MiniBars data={revenue} fmt={nairaS} /></Card>
        <Card title="AI spend, last 14 days" sub="Charged cost by day"><MiniBars data={aiSpend} fmt={nairaS} tone="#7B2A91" /></Card>
      </div>
      <Card title="Most visited" sub="Page views by tab, last 30 days" pad={false}>
        {act.topPages.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No page views logged yet.</div> : (
          <div className="divide-y divide-[#F0EAF7]">
            {act.topPages.map((p) => (<div key={p.path} className="flex items-center justify-between px-5 py-2.5 text-[13.5px]"><span className="font-semibold capitalize">{p.path}</span><span className="text-[var(--dim)]">{p.views} views</span></div>))}
          </div>
        )}
      </Card>
      <Card title="Writer leaderboard" sub={`${writers.length} writers`} pad={false}>
        {writers.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No writers yet.</div> : (
          <div className="divide-y divide-[#F0EAF7]">
            {writers.map((w, i) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="w-6 text-center text-[12px] font-bold text-[var(--dim)]">#{i + 1}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold">{w.display_name}</div><div className="text-[11.5px] text-[var(--dim)]">{w.specialization ?? "General"} · {w.completed_count} completed{w.rating ? ` · ${Number(w.rating).toFixed(1)}★` : ""}</div></div>
                <Pill tone={w.is_available ? "green" : "gray"}>{w.is_available ? "Available" : "Busy"}</Pill>
                <div className="text-[14px] font-bold">{nairaS(Number(w.earnings))}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Students by school" sub={`${schools.length} schools represented`} pad={false}>
        <div className="divide-y divide-[#F0EAF7]">
          {schools.slice(0, 12).map((s) => (<div key={s.institution_id ?? "none"} className="flex items-center justify-between px-5 py-2.5 text-[13.5px]"><span className="font-semibold">{s.name}</span><span className="text-[var(--dim)]">{s.count} students</span></div>))}
        </div>
      </Card>
      {act.totalHeartbeats30d === 0 && act.dau === 0 && (
        <Card title="Visits/actives/hours showing zero?" sub="This needs one new table -- ask James/Saviour to run the app_events migration from the android-apk-signing-adjacent analytics setup note, then it fills in on its own as people use the app.">
          <p className="text-[12.5px] leading-snug text-[var(--dim)]">Revenue, AI spend, and the writer leaderboard above are already real -- only this activity-tracking layer is new and needs its one-time setup.</p>
        </Card>
      )}
    </div>
  );
}

function MiniBars({ data, fmt, tone = "#8b3fa6" }: { data: DaySeries[]; fmt: (n: number) => string; tone?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height: 120 }}>
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1">
          <div className="rounded-t-md transition-all" style={{ height: Math.max(3, (d.value / max) * 100), background: tone, opacity: d.value ? 1 : 0.15 }} />
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1a1024] px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">{fmt(d.value)} · {d.date.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Course reps ----------------
// Applications come in from Settings > Course rep in the app. Approving issues the rep's code;
// removing stops their commission and unlimited AI immediately (AI commission owed is paid first).
function RepsTab({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<AdminRep[] | null>(null);
  const reload = useCallback(async () => setRows(await adminListReps()), []);
  useEffect(() => { void adminListReps().then(setRows); }, []);
  async function set(r: AdminRep, status: "active" | "rejected" | "removed") {
    if (status === "removed" && !confirm(`Remove ${r.name} as a course rep? Their commission and free AI stop now.`)) return;
    const err = await adminSetRep(r.user_id, status);
    if (err) return show(err);
    show(status === "active" ? "Approved. Their code is ready in the app." : status === "removed" ? "Rep removed" : "Application rejected");
    void reload();
  }
  if (!rows) return <div className="p-10 text-center text-sm text-[var(--dim)]">Loading...</div>;
  const pending = rows.filter((r) => r.status === "pending"), active = rows.filter((r) => r.status === "active"), past = rows.filter((r) => r.status === "rejected" || r.status === "removed");
  const totalEarned = rows.reduce((a, r) => a + Number(r.earned), 0), totalStudents = active.reduce((a, r) => a + r.students, 0);
  const Item = ({ r, actions }: { r: AdminRep; actions: React.ReactNode }) => (
    <div className="flex flex-wrap items-start gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{r.name} {r.code && <span className="ml-1 rounded-md bg-[#F4EFF8] px-1.5 py-0.5 font-mono text-[12px]">{r.code}</span>}</div>
        <div className="text-[12px] text-[var(--dim)]">{[r.email, r.school, r.program].filter(Boolean).join(" · ")}</div>
        {r.note && <div className="mt-1 text-[12.5px] text-[#4a3a5e]">&ldquo;{r.note}&rdquo;</div>}
        {r.status !== "pending" && <div className="mt-1 text-[12px] text-[var(--dim)]">{r.students} linked student{r.students === 1 ? "" : "s"} · earned {nairaS(Number(r.earned))}</div>}
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Active reps</div><div className="disp mt-1 text-[24px] font-bold">{active.length}</div></Card>
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Students linked</div><div className="disp mt-1 text-[24px] font-bold">{totalStudents}</div></Card>
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Commission paid</div><div className="disp mt-1 text-[24px] font-bold">{nairaS(totalEarned)}</div></Card>
      </div>
      <Card title="Applications" sub={`${pending.length} waiting`} pad={false}>
        {pending.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No applications waiting.</div> : <div className="divide-y divide-[#F0EAF7]">{pending.map((r) => (
          <Item key={r.user_id} r={r} actions={<><Btn2 small onClick={() => void set(r, "active")}>Approve</Btn2><button onClick={() => void set(r, "rejected")} className={`${btn} bg-white text-[#C2412D]`}>Reject</button></>} />
        ))}</div>}
      </Card>
      <Card title="Active reps" sub="Earn commission and get unlimited Birdie AI" pad={false}>
        {active.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No active reps yet.</div> : <div className="divide-y divide-[#F0EAF7]">{active.map((r) => (
          <Item key={r.user_id} r={r} actions={<button onClick={() => void set(r, "removed")} className={`${btn} bg-white text-[#C2412D]`}>Remove</button>} />
        ))}</div>}
      </Card>
      {past.length > 0 && <Card title="Removed or rejected" pad={false}><div className="divide-y divide-[#F0EAF7]">{past.map((r) => (
        <Item key={r.user_id} r={r} actions={<><Pill tone={r.status === "removed" ? "amber" : "gray"}>{r.status}</Pill><Btn2 small onClick={() => void set(r, "active")}>Reinstate</Btn2></>} />
      ))}</div></Card>}
    </div>
  );
}

// ---------------- Users ----------------
function UsersTab({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<Profile[]>([]);
  const [insts, setInsts] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const sb = createClient();
    const [p, i] = await Promise.all([
      sb.from("profiles").select("id,role,full_name,institution_id,level,program,created_at").order("created_at", { ascending: false }).limit(500),
      sb.from("institutions").select("id,name"),
    ]);
    setRows((p.data ?? []) as Profile[]);
    setInsts(Object.fromEntries(((i.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name])));
    setLoading(false);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function setRole(id: string, role: Role) {
    const { error } = await createClient().rpc("admin_set_role", { p_user: id, p_role: role });
    if (error) return show(error.message.replace(/^.*?exception:\s*/i, ""));
    show("Role updated"); void reload();
  }

  const filtered = rows.filter((r) => !q.trim() || (r.full_name ?? "").toLowerCase().includes(q.toLowerCase()));
  const counts = { student: 0, writer: 0, support: 0, admin: 0 } as Record<Role, number>;
  for (const r of rows) counts[r.role]++;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["student", "writer", "support", "admin"] as Role[]).map((r) => (
          <Card key={r} pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">{r}s</div><div className="disp mt-1 text-[26px] font-bold">{counts[r]}</div></Card>
        ))}
      </div>
      <CreateStaff onCreated={reload} show={show} />
      <Card title="All users" sub={`${filtered.length} of ${rows.length}`} right={<Input value={q} onChange={setQ} placeholder="Search by name" w="w-56" />} pad={false}>
        {loading ? <div className="p-6 text-center text-sm text-[var(--dim)]">Loading...</div> : filtered.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No users found.</div> : (
          <div className="divide-y divide-[#F0EAF7]">
            {filtered.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{r.full_name || "(no name)"}</div>
                  <div className="truncate text-[12px] text-[var(--dim)]">{r.institution_id ? insts[r.institution_id] ?? "Unknown school" : "No school set"}{r.level ? ` · ${r.level}` : ""}{r.program ? ` · ${r.program}` : ""}</div>
                </div>
                <Pill tone={roleTone[r.role]}>{r.role}</Pill>
                <select value={r.role} onChange={(e) => void setRole(r.id, e.target.value as Role)} className="rounded-lg border-2 border-[#E6DCF0] bg-white px-2 py-1.5 text-[12.5px] font-semibold outline-none">
                  {(["student", "writer", "support", "admin"] as Role[]).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CreateStaff({ onCreated, show }: { onCreated: () => void; show: (m: string) => void }) {
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [role, setRole] = useState<"writer" | "support" | "admin">("writer");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  async function create() {
    setBusy(true); setResult(null);
    const sb = createClient();
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch("/api/admin/create-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ email: email.trim(), full_name: name.trim(), role }),
    });
    const j = await r.json().catch(() => null);
    setBusy(false);
    if (!r.ok) return show(j?.error === "email_already_registered" ? "That email is already registered" : j?.error ?? "Couldn't create the account");
    setResult({ email: j.email, password: j.temp_password });
    setEmail(""); setName("");
    onCreated();
  }

  return (
    <Card title="Create a staff account" sub="Writers, help desk and admins don't sign up themselves -- create their account here and share the password directly.">
      {result ? (
        <div className="rounded-xl border-2 border-[var(--birdie)] bg-[var(--birdie-soft)] p-4">
          <div className="text-[13px] font-semibold">Account created for {result.email}</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-2 text-[13px] font-bold">{result.password}</code>
            <Btn2 small onClick={() => { void navigator.clipboard.writeText(result.password); show("Copied"); }}>Copy</Btn2>
          </div>
          <p className="mt-2 text-[11.5px] text-[var(--dim)]">Shown once. Share it with them directly (not email -- it's not reliable yet). They should change it after signing in.</p>
          <button onClick={() => setResult(null)} className="mt-2 text-[12px] font-semibold text-[var(--dim)] underline">Dismiss</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]"><div className="mb-1 text-[11px] font-semibold text-[var(--dim)]">Full name</div><Input value={name} onChange={setName} placeholder="Amaka Obi" /></div>
          <div className="flex-1 min-w-[200px]"><div className="mb-1 text-[11px] font-semibold text-[var(--dim)]">Email</div><Input value={email} onChange={setEmail} placeholder="amaka@unisupport.xyz" /></div>
          <div><div className="mb-1 text-[11px] font-semibold text-[var(--dim)]">Role</div>
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[14px] font-semibold outline-none">
              <option value="writer">Writer</option><option value="support">Help desk</option><option value="admin">Admin</option>
            </select>
          </div>
          <Btn2 disabled={busy || !email.trim() || !name.trim()} onClick={() => void create()}>{busy ? "Creating..." : "Create account"}</Btn2>
        </div>
      )}
    </Card>
  );
}

// ---------------- Schools ----------------
function SchoolsTab({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<Institution[]>([]);
  const [policies, setPolicies] = useState<Record<string, Policy>>({});
  const [name, setName] = useState("");
  const reload = useCallback(async () => {
    const sb = createClient();
    const [i, p] = await Promise.all([
      sb.from("institutions").select("id,name,country,created_at").order("name"),
      sb.from("institution_policies").select("*"),
    ]);
    setRows((i.data ?? []) as Institution[]);
    setPolicies(Object.fromEntries(((p.data ?? []) as Policy[]).map((x) => [x.institution_id, x])));
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function addSchool() {
    if (!name.trim()) return;
    const sb = createClient();
    const { data, error } = await sb.from("institutions").insert({ name: name.trim() }).select("id").single();
    if (error) return show(error.message);
    await sb.from("institution_policies").insert({ institution_id: data.id, allow_mentor: true, allow_assisted: true, allow_full: true, allow_just_do_it: true });
    setName(""); show("School added"); void reload();
  }
  async function toggle(instId: string, key: keyof Policy, val: boolean) {
    const { error } = await createClient().from("institution_policies").update({ [key]: val }).eq("institution_id", instId);
    if (error) return show(error.message);
    void reload();
  }

  return (
    <div className="space-y-4">
      <SchoolSuggestions show={show} />
      <Card title="Add a school">
        <div className="flex gap-2"><Input value={name} onChange={setName} placeholder="School name" w="flex-1" /><Btn2 onClick={() => void addSchool()}>Add</Btn2></div>
      </Card>
      <Card title="Schools and what's allowed" sub={`${rows.length} schools`} pad={false}>
        <div className="divide-y divide-[#F0EAF7]">
          {rows.map((r) => {
            const p = policies[r.id];
            return (
              <div key={r.id} className="px-5 py-3.5">
                <div className="mb-2 text-[14px] font-semibold">{r.name}</div>
                {p ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-4">
                    {([["allow_mentor", "Mentor me"], ["allow_assisted", "Assisted"], ["allow_full", "Do it for me"], ["allow_just_do_it", "Just Do It"]] as [keyof Policy, string][]).map(([k, label]) => (
                      <label key={k} className="flex items-center justify-between gap-2 text-[12.5px] text-[var(--dim)]">{label}<Switch on={p[k] as boolean} onChange={(v) => void toggle(r.id, k, v)} /></label>
                    ))}
                  </div>
                ) : <div className="text-[12px] text-[var(--dim)]">No policy row yet (defaults to everything allowed).</div>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ---------------- Pricing ----------------
function PricingTab({ show }: { show: (m: string) => void }) {
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [dm, setDm] = useState<DMRow[]>([]);
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const reload = useCallback(async () => {
    const sb = createClient();
    const [p, d, c] = await Promise.all([
      sb.from("pricing").select("*").order("service").order("access"),
      sb.from("deadline_multipliers").select("*"),
      sb.from("app_config").select("*").order("key"),
    ]);
    setPricing((p.data ?? []) as PricingRow[]);
    setDm((d.data ?? []) as DMRow[]);
    setConfig((c.data ?? []) as ConfigRow[]);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function saveRate(service: string, access: string, rate: number) {
    const { error } = await createClient().from("pricing").update({ rate }).eq("service", service).eq("access", access);
    if (error) return show(error.message);
    show("Saved"); void reload();
  }
  async function saveMult(id: string, multiplier: number) {
    const { error } = await createClient().from("deadline_multipliers").update({ multiplier }).eq("id", id);
    if (error) return show(error.message);
    show("Saved"); void reload();
  }
  async function saveConfig(key: string, value: number) {
    const { error } = await createClient().from("app_config").update({ value }).eq("key", key);
    if (error) return show(error.message);
    show("Saved"); void reload();
  }

  return (
    <div className="space-y-4">
      <Card title="Rate card" sub="What students pay. Changes apply to new quotes immediately.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {pricing.map((r) => (
            <div key={`${r.service}-${r.access}`} className="flex items-center justify-between gap-3 rounded-xl border-2 border-[#E6DCF0] p-3">
              <div><div className="text-[13.5px] font-semibold capitalize">{r.service} · {r.access === "full" ? "Full LMS Access" : "Standard"}</div><div className="text-[11.5px] text-[var(--dim)]">{r.service === "quiz" ? "per quiz" : "per page"}</div></div>
              <NumField value={r.rate} onSave={(v) => void saveRate(r.service, r.access, v)} prefix="₦" />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Deadline rush multipliers">
        <div className="grid grid-cols-3 gap-3">
          {dm.map((r) => (<div key={r.id} className="rounded-xl border-2 border-[#E6DCF0] p-3"><div className="mb-1 text-[13px] font-semibold">{r.id}</div><NumField value={r.multiplier} onSave={(v) => void saveMult(r.id, v)} step="0.01" suffix="x" /></div>))}
        </div>
      </Card>
      <Card title="App config">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {config.map((r) => (<div key={r.key} className="rounded-xl border-2 border-[#E6DCF0] p-3"><div className="mb-1 text-[12.5px] font-semibold">{r.key}</div><NumField value={r.value} onSave={(v) => void saveConfig(r.key, v)} /></div>))}
        </div>
      </Card>
    </div>
  );
}

function NumField({ value, onSave, prefix, suffix, step }: { value: number; onSave: (v: number) => void; prefix?: string; suffix?: string; step?: string }) {
  const [v, setV] = useState(String(value));
  useEffect(() => { setV(String(value)); }, [value]);
  const dirty = Number(v) !== value && v.trim() !== "" && !Number.isNaN(Number(v));
  return (
    <div className="flex items-center gap-1.5">
      {prefix && <span className="text-[12px] text-[var(--dim)]">{prefix}</span>}
      <input value={v} onChange={(e) => setV(e.target.value)} type="number" step={step ?? "1"} className="w-20 rounded-lg border-2 border-[#E6DCF0] bg-white px-2 py-1 text-[13px] outline-none" />
      {suffix && <span className="text-[12px] text-[var(--dim)]">{suffix}</span>}
      {dirty && <button onClick={() => onSave(Number(v))} className="rounded-lg bg-[var(--birdie)] px-2 py-1 text-[11px] font-bold text-white">Save</button>}
    </div>
  );
}

// ---------------- AI ----------------
function AiTab({ show }: { show: (m: string) => void }) {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const reload = useCallback(async () => {
    const sb = createClient();
    const [p, m] = await Promise.all([
      sb.from("ai_providers").select("*").order("sort"),
      sb.from("ai_models").select("*").order("provider_id"),
    ]);
    setProviders((p.data ?? []) as AiProvider[]);
    setModels((m.data ?? []) as AiModel[]);
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  // Whether each vendor's API key is installed on the server (Vercel env). A brain can only be
  // switched on once its key is in and the vendor account has credit.
  const [keys, setKeys] = useState<Record<string, boolean> | null>(null);
  useEffect(() => { void fetch("/api/ai/status").then((r) => (r.ok ? r.json() : null)).then(setKeys).catch(() => setKeys(null)); }, []);
  const KEY_OF: Record<string, string> = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY" };

  async function toggleProvider(id: string, enabled: boolean) {
    const p = providers.find((x) => x.id === id);
    if (enabled && p && keys && !keys[KEY_OF[p.vendor]]) return show(`Add ${KEY_OF[p.vendor]} in Vercel > Project > Settings > Environment Variables, redeploy, then switch ${p.brand_name} on.`);
    const { error } = await createClient().from("ai_providers").update({ enabled }).eq("id", id);
    if (error) return show(error.message);
    void reload();
  }
  async function toggleModel(id: string, enabled: boolean) {
    const { error } = await createClient().from("ai_models").update({ enabled }).eq("id", id);
    if (error) return show(error.message);
    void reload();
  }
  async function saveMargin(id: string, margin: number) {
    const { error } = await createClient().from("ai_providers").update({ margin }).eq("id", id);
    if (error) return show(error.message);
    show("Saved"); void reload();
  }

  return (
    <div className="space-y-4">
      <Card title="Providers" sub="Margin is applied on top of vendor cost when converting to Naira.">
        <div className="divide-y divide-[#F0EAF7]">
          {providers.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">{p.brand_name}</div><div className="text-[12px] text-[var(--dim)]">{p.vendor_name ?? p.vendor}{p.is_free ? " · free tier" : " · charged to the student's wallet"}{keys && <> · {keys[KEY_OF[p.vendor]] ? <span className="font-semibold text-[#2E8B57]">key installed</span> : <span className="font-semibold text-[#C2412D]">no key yet</span>}</>}</div></div>
              <NumField value={Number(p.margin)} onSave={(v) => void saveMargin(p.id, v)} step="0.01" suffix="x margin" />
              <Switch on={p.enabled} onChange={(v) => void toggleProvider(p.id, v)} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Models" pad={false}>
        <div className="divide-y divide-[#F0EAF7]">
          {models.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1"><div className="text-[13.5px] font-semibold">{m.label} <span className="font-normal text-[var(--dim)]">· {m.tier}</span></div><div className="text-[11.5px] text-[var(--dim)]">{m.provider_id} · {m.vendor_model} · in {usd(Number(m.input_usd_per_mtok))}/Mtok · out {usd(Number(m.output_usd_per_mtok))}/Mtok</div></div>
              <Switch on={m.enabled} onChange={(v) => void toggleModel(m.id, v)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
