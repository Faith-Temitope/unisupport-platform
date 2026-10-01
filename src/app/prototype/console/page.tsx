"use client";

// Real admin console, backed by Supabase like the student app and /prototype/live/staff. Visible
// only to profiles.role = 'admin' (RLS backs every read/write here too, this page is not the
// security boundary). Four tabs: Users (role changes), Schools (per-institution policy toggles),
// Pricing (the quiz/writing x standard/full rate card, deadline multipliers, app config), AI
// (provider/model enable + margin).
import { BarChart3, Building2, Cpu, LogOut, Sliders, Users as UsersIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
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
  const [tab, setTab] = useState<"users" | "schools" | "pricing" | "ai">("users");
  const { show, node } = useToast();
  const nav = [
    { id: "users", label: "Users", icon: <UsersIcon size={17} /> },
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
      {tab === "users" && <UsersTab show={show} />}
      {tab === "schools" && <SchoolsTab show={show} />}
      {tab === "pricing" && <PricingTab show={show} />}
      {tab === "ai" && <AiTab show={show} />}
      {node}
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

  async function toggleProvider(id: string, enabled: boolean) {
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
              <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold">{p.brand_name}</div><div className="text-[12px] text-[var(--dim)]">{p.vendor_name ?? p.vendor}{p.is_free ? " · free tier" : ""}</div></div>
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
