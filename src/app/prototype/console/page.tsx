"use client";

import { BarChart3, Cpu, Flag, GraduationCap, Megaphone, ScrollText, Sliders, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BRAINS, DEFAULT_USD_NGN, type Brain, type BrainModel } from "@/lib/ai/registry";
import { Btn2, Card, DeskShell, Input, PageTitle, Pill, Switch, nairaS, usd, useToast } from "../staff/kit";

type Row = { id: string; name: string; email: string; role: "student" | "writer" | "support" | "admin"; school: string; joined: string; active: boolean };
const USERS0: Row[] = [
  { id: "u1", name: "Tobi Adeyemi", email: "tobi@example.com", role: "student", school: "Federal University Lokoja", joined: "Sep 12", active: true },
  { id: "u2", name: "Amina Bello", email: "amina@example.com", role: "student", school: "University of Ibadan", joined: "Sep 14", active: true },
  { id: "u3", name: "Dr. Amaka Obi", email: "amaka@unisupport.xyz", role: "writer", school: "-", joined: "Aug 30", active: true },
  { id: "u4", name: "James Okoro", email: "james@unisupport.xyz", role: "support", school: "-", joined: "Aug 28", active: true },
  { id: "u5", name: "Saviour", email: "saviour@klvr.co", role: "admin", school: "-", joined: "Aug 20", active: true },
  { id: "u6", name: "Ngozi Eze", email: "ngozi@example.com", role: "student", school: "UNILAG", joined: "Sep 18", active: false },
];
const SCHOOLS0 = [
  { id: "i1", name: "Federal University Lokoja", mentor: true, full: true, jdi: true },
  { id: "i2", name: "University of Ibadan", mentor: true, full: false, jdi: true },
  { id: "i3", name: "UNILAG", mentor: true, full: true, jdi: false },
];
const FLAGS0 = [
  { id: "explore-post", label: "Posting in Explore", sub: "Let students upload videos and write posts", on: true },
  { id: "shared-chat", label: "Shared-course chat", sub: "Group chat inside shared courses", on: true },
  { id: "jdi", label: "Just Do It", sub: "Birdie drafts answers directly", on: true },
  { id: "recording", label: "Lecture recording", sub: "Mic recording in Study", on: true },
  { id: "signups", label: "New sign-ups", sub: "Turn off to close registration", on: true },
  { id: "guest", label: "Guest mode", sub: "Allow Continue as guest", on: true },
];
const DAYS = [42, 51, 47, 62, 58, 71, 66, 74, 69, 83, 79, 91, 88, 97];
const AUDIT0 = [["Saviour", "Changed Sage · Balanced margin 1.60 → 1.75", "2h ago"], ["James", "Closed job in review (Tobi A., ₦48,300)", "5h ago"], ["Saviour", "Enabled Nova · Deep", "1d ago"], ["James", "Invited writer Halima Yusuf", "2d ago"]];

const NAV = [
  { id: "overview", label: "Overview", icon: <BarChart3 size={18} /> },
  { id: "ai", label: "AI brains", icon: <Cpu size={18} /> },
  { id: "users", label: "Users", icon: <Users size={18} /> },
  { id: "schools", label: "Schools", icon: <GraduationCap size={18} /> },
  { id: "pricing", label: "Pricing", icon: <Sliders size={18} /> },
  { id: "flags", label: "Feature flags", icon: <Flag size={18} /> },
  { id: "announce", label: "Announcements", icon: <Megaphone size={18} /> },
  { id: "audit", label: "Audit log", icon: <ScrollText size={18} /> },
];

interface EditModel extends BrainModel { enabled: boolean }
interface EditBrain extends Omit<Brain, "models"> { enabled: boolean; models: EditModel[] }

export default function Console() {
  const [page, setPage] = useState("overview");
  const toast = useToast();
  const [brains, setBrains] = useState<EditBrain[]>(() => BRAINS.map((b) => ({ ...b, enabled: true, models: b.models.map((m) => ({ ...m, enabled: true })) })));
  const [rate, setRate] = useState(String(DEFAULT_USD_NGN));
  const [defBrain, setDefBrain] = useState("spark"); const [defTier, setDefTier] = useState("balanced");
  const [tin, setTin] = useState("3000"); const [tout, setTout] = useState("500");
  const [keys, setKeys] = useState<Record<string, boolean> | null>(null);
  const [users, setUsers] = useState(USERS0); const [q, setQ] = useState("");
  const [schools, setSchools] = useState(SCHOOLS0); const [newSchool, setNewSchool] = useState("");
  const [flags, setFlags] = useState(FLAGS0);
  const [cfg, setCfg] = useState({ full: "3500", fee: "2000", share: "50", review: "24", goal: "3", free: "20" });
  const [ann, setAnn] = useState({ title: "", body: "", to: "all" }); const [sent, setSent] = useState<{ t: string; title: string; to: string }[]>([]);

  useEffect(() => { fetch("/api/ai/status").then((r) => r.json()).then(setKeys).catch(() => setKeys({})); }, []);

  const setBrain = (id: string, fn: (b: EditBrain) => EditBrain) => setBrains((bs) => bs.map((b) => (b.id === id ? fn(b) : b)));
  const setModel = (id: string, tier: string, fn: (m: EditModel) => EditModel) => setBrain(id, (b) => ({ ...b, models: b.models.map((m) => (m.tier === tier ? fn(m) : m)) }));

  const sim = useMemo(() => brains.map((b) => {
    const m = b.models.find((x) => x.tier === "balanced") ?? b.models[0];
    const cost = (Number(tin) / 1e6) * m.inUsd + (Number(tout) / 1e6) * m.outUsd;
    const charged = b.free ? 0 : cost * b.margin;
    return { b, m, cost, charged, ngn: charged * Number(rate), profit: (charged - (b.free ? cost : cost)) * Number(rate) };
  }), [brains, tin, tout, rate]);

  const revenue = 1842500, aiCost = 61200, aiCharged = 118400;
  const max = Math.max(...DAYS);
  const shown = users.filter((u) => !q || `${u.name} ${u.email} ${u.school}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <DeskShell app="Team Console" tagline="Birdie · Unisupport" nav={NAV} active={page} onNav={setPage} right="Signed in as Saviour (admin)">
      {toast.node}

      {page === "overview" && (<>
        <PageTitle title="Overview" sub="How Birdie is doing this month." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Revenue", nairaS(revenue), "Writer fees + AI margin"], ["AI provider cost", nairaS(aiCost), "What we pay Google, OpenAI, Anthropic"], ["AI margin earned", nairaS(aiCharged - aiCost), `${Math.round(((aiCharged - aiCost) / aiCost) * 100)}% on top of cost`], ["Active students", "1,284", "Last 7 days"]].map(([a, b, c]) => (
            <Card key={a}><div className="text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">{a}</div><div className="disp mt-1 text-[28px] font-bold">{b}</div><div className="text-[12.5px] text-[var(--dim)]">{c}</div></Card>))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card title="Daily active students" sub="Last 14 days">
            <div className="flex h-44 items-end gap-2">{DAYS.map((d, i) => (<div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-md bg-gradient-to-t from-[#7B2A91] to-[#C05BD6]" style={{ height: `${(d / max) * 100}%` }} title={`${d}`} /><span className="text-[10px] text-[var(--dim)]">{i + 1}</span></div>))}</div>
          </Card>
          <Card title="Usage by brain" sub="Share of AI answers">
            {[["Spark (free)", 62], ["Nova", 21], ["Sage", 17]].map(([n, p]) => (<div key={n as string} className="mb-3 last:mb-0"><div className="mb-1 flex justify-between text-[13px] font-semibold"><span>{n}</span><span className="text-[var(--dim)]">{p}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#EFE6F6]"><div className="h-full rounded-full bg-[var(--birdie)]" style={{ width: `${p}%` }} /></div></div>))}
          </Card>
        </div>
      </>)}

      {page === "ai" && (<>
        <PageTitle title="AI brains" sub="Each brain is a branded package over one AI vendor. Students choose in Settings; you control models, prices and margin." right={<Btn2 onClick={() => toast.show("AI configuration saved")}>Save changes</Btn2>} />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Exchange rate"><label className="block"><span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">1 USD in naira</span><Input value={rate} onChange={setRate} suffix="₦" /></label><p className="mt-2 text-[12px] text-[var(--dim)]">Used to turn provider dollars into what the student pays.</p></Card>
          <Card title="Default for new students"><div className="space-y-2.5"><select value={defBrain} onChange={(e) => setDefBrain(e.target.value)} className="w-full rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[14px]">{brains.filter((b) => b.enabled).map((b) => <option key={b.id} value={b.id}>{b.brand} ({b.vendorName})</option>)}</select><select value={defTier} onChange={(e) => setDefTier(e.target.value)} className="w-full rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[14px]"><option value="quick">Quick</option><option value="balanced">Balanced</option><option value="deep">Deep</option></select></div></Card>
          <Card title="API keys" sub="Set in your server environment">
            {keys === null ? <p className="text-[13px] text-[var(--dim)]">Checking…</p> : (["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"] as const).map((k) => (<div key={k} className="flex items-center justify-between py-1 text-[13px]"><code className="text-[12px]">{k}</code><Pill tone={keys[k] ? "green" : "red"}>{keys[k] ? "Set" : "Missing"}</Pill></div>))}
          </Card>
        </div>

        <div className="mt-4 space-y-4">
          {brains.map((b) => (
            <Card key={b.id} title={`${b.brand} · ${b.vendorName}`} sub={b.free ? "Free for students. Watch the free-tier limits and privacy terms." : "Paid from the student's balance at cost × margin."}
              right={<div className="flex items-center gap-4"><label className="flex items-center gap-2 text-[13px] font-semibold"><span className="text-[var(--dim)]">Free</span><Switch on={b.free} onChange={(v) => setBrain(b.id, (x) => ({ ...x, free: v, margin: v ? 1 : x.margin === 1 ? 1.75 : x.margin }))} label="Free brain" /></label><label className="flex items-center gap-2 text-[13px] font-semibold"><span className="text-[var(--dim)]">Enabled</span><Switch on={b.enabled} onChange={(v) => setBrain(b.id, (x) => ({ ...x, enabled: v }))} label="Enable brain" /></label></div>} pad={false}>
              <div className="flex flex-wrap items-center gap-3 border-b border-[#F0E8F7] px-5 py-3"><span className="text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">Margin</span><Input w="w-28" type="number" value={b.margin} onChange={(v) => setBrain(b.id, (x) => ({ ...x, margin: Number(v) }))} suffix="×" /><span className="text-[12.5px] text-[var(--dim)]">{b.free ? "Not charged." : `A 10 cent answer costs the student ${(0.1 * b.margin * 100).toFixed(0)} cents.`}</span></div>
              <table className="w-full text-left text-[13.5px]"><thead className="bg-[#FBF6FE] text-[11.5px] uppercase tracking-wider text-[var(--dim)]"><tr><th className="p-3 pl-5">Tier</th><th>Vendor model id</th><th>Input $/1M</th><th>Output $/1M</th><th>On</th></tr></thead>
                <tbody>{b.models.map((m) => (<tr key={m.tier} className="border-t border-[#F0E8F7]"><td className="p-3 pl-5 font-semibold capitalize">{m.label}<div className="text-[11.5px] font-normal text-[var(--dim)]">{m.vendorLabel}</div></td><td className="pr-3"><Input value={m.vendorModel} onChange={(v) => setModel(b.id, m.tier, (x) => ({ ...x, vendorModel: v }))} /></td><td className="pr-3"><Input w="w-24" type="number" value={m.inUsd} onChange={(v) => setModel(b.id, m.tier, (x) => ({ ...x, inUsd: Number(v) }))} /></td><td className="pr-3"><Input w="w-24" type="number" value={m.outUsd} onChange={(v) => setModel(b.id, m.tier, (x) => ({ ...x, outUsd: Number(v) }))} /></td><td><Switch on={m.enabled} onChange={(v) => setModel(b.id, m.tier, (x) => ({ ...x, enabled: v }))} label={`Enable ${m.label}`} /></td></tr>))}</tbody></table>
            </Card>))}
        </div>

        <Card title="Cost simulator" sub="What one answer costs us, and what the student pays (Balanced tier)">
          <div className="mb-4 flex flex-wrap gap-3"><label className="text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">Tokens in<Input w="mt-1 w-32" type="number" value={tin} onChange={setTin} /></label><label className="text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">Tokens out<Input w="mt-1 w-32" type="number" value={tout} onChange={setTout} /></label></div>
          <table className="w-full text-left text-[13.5px]"><thead className="text-[11.5px] uppercase tracking-wider text-[var(--dim)]"><tr><th className="pb-2">Brain</th><th>Model</th><th>Our cost</th><th>Student pays</th><th>In naira</th><th>Our margin</th></tr></thead>
            <tbody>{sim.map(({ b, m, cost, charged, ngn }) => (<tr key={b.id} className="border-t border-[#F0E8F7]"><td className="py-2.5 font-semibold">{b.brand}</td><td>{m.vendorLabel}</td><td>{usd(cost)}</td><td>{b.free ? <Pill tone="green">Free</Pill> : usd(charged)}</td><td>{b.free ? "-" : nairaS(ngn)}</td><td>{b.free ? <span className="text-[var(--help)]">-{usd(cost)}</span> : <span className="font-semibold text-[#0a7a56]">+{usd(charged - cost)}</span>}</td></tr>))}</tbody></table>
          <p className="mt-3 text-[12.5px] text-[var(--dim)]">Free brains are a cost to you. Cap them with the daily free allowance in Pricing.</p>
        </Card>
      </>)}

      {page === "users" && (<>
        <PageTitle title="Users" sub="Change roles carefully. Writers and support only get their apps through this." />
        <Card pad={false} right={<Input value={q} onChange={setQ} placeholder="Search users" w="w-64" />} title={`${shown.length} users`}>
          <table className="w-full text-left text-[14px]"><thead className="bg-[#FBF6FE] text-[12px] uppercase tracking-wider text-[var(--dim)]"><tr><th className="p-4">Name</th><th>Role</th><th>School</th><th>Joined</th><th>Active</th></tr></thead>
            <tbody>{shown.map((u) => (<tr key={u.id} className="border-t border-[#F0E8F7]"><td className="p-4 font-semibold">{u.name}<div className="text-[12px] font-normal text-[var(--dim)]">{u.email}</div></td><td><select value={u.role} onChange={(e) => { setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, role: e.target.value as Row["role"] } : x))); toast.show(`${u.name} is now ${e.target.value}`); }} className="rounded-lg border-2 border-[#E6DCF0] bg-white px-2 py-1 text-[13px]">{["student", "writer", "support", "admin"].map((r) => <option key={r}>{r}</option>)}</select></td><td className="text-[var(--dim)]">{u.school}</td><td className="text-[var(--dim)]">{u.joined}</td><td><Switch on={u.active} onChange={(v) => setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, active: v } : x)))} label={`Toggle ${u.name}`} /></td></tr>))}</tbody></table>
        </Card>
      </>)}

      {page === "schools" && (<>
        <PageTitle title="Schools" sub="A school can switch off what it doesn't want. Students there simply don't see it." />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card pad={false}><table className="w-full text-left text-[14px]"><thead className="bg-[#FBF6FE] text-[12px] uppercase tracking-wider text-[var(--dim)]"><tr><th className="p-4">School</th><th>Mentor me</th><th>Do it for me</th><th>Just Do It</th></tr></thead>
            <tbody>{schools.map((s) => (<tr key={s.id} className="border-t border-[#F0E8F7]"><td className="p-4 font-semibold">{s.name}</td>{(["mentor", "full", "jdi"] as const).map((k) => (<td key={k}><Switch on={s[k]} onChange={(v) => setSchools((ss) => ss.map((x) => (x.id === s.id ? { ...x, [k]: v } : x)))} label={`${s.name} ${k}`} /></td>))}</tr>))}</tbody></table></Card>
          <Card title="Add a school"><div className="space-y-3"><Input value={newSchool} onChange={setNewSchool} placeholder="School name" /><Btn2 disabled={!newSchool.trim()} onClick={() => { setSchools((s) => [...s, { id: Math.random().toString(36).slice(2), name: newSchool.trim(), mentor: true, full: true, jdi: true }]); setNewSchool(""); toast.show("School added"); }}>Add</Btn2></div></Card>
        </div>
      </>)}

      {page === "pricing" && (<>
        <PageTitle title="Pricing and limits" sub="These values feed the quotes students and writers see." />
        <Card><div className="grid max-w-[640px] gap-4 sm:grid-cols-2">
          {([["full", "Full write-up, per page", "₦"], ["fee", "Session fee (one-off)", "₦"], ["share", "Writer share", "%"], ["review", "Review window", "hours"], ["goal", "Default daily study goal", "actions"], ["free", "Free AI answers per student per day", "answers"]] as const).map(([k, label, suf]) => (
            <label key={k} className="block"><span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--dim)]">{label}</span><Input value={cfg[k]} onChange={(v) => setCfg({ ...cfg, [k]: v })} suffix={suf} /></label>))}
        </div><div className="mt-5"><Btn2 onClick={() => toast.show("Pricing saved")}>Save changes</Btn2></div></Card>
      </>)}

      {page === "flags" && (<>
        <PageTitle title="Feature flags" sub="Turn parts of the app on or off for everyone, instantly." />
        <Card pad={false}>{flags.map((f) => (<div key={f.id} className="flex items-center justify-between border-b border-[#F0E8F7] px-5 py-4 last:border-0"><div><div className="text-[14.5px] font-semibold">{f.label}</div><div className="text-[12.5px] text-[var(--dim)]">{f.sub}</div></div><Switch on={f.on} onChange={(v) => { setFlags((fs) => fs.map((x) => (x.id === f.id ? { ...x, on: v } : x))); toast.show(`${f.label} ${v ? "on" : "off"}`); }} label={f.label} /></div>))}</Card>
      </>)}

      {page === "announce" && (<>
        <PageTitle title="Announcements" sub="Sends a notification to everyone in the audience." />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card title="New announcement"><div className="space-y-3"><Input value={ann.title} onChange={(v) => setAnn({ ...ann, title: v })} placeholder="Title" /><textarea value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} rows={4} placeholder="Message" className="w-full resize-none rounded-xl border-2 border-[#E6DCF0] p-3 text-[14px] outline-none focus:border-[var(--birdie)]" /><select value={ann.to} onChange={(e) => setAnn({ ...ann, to: e.target.value })} className="rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[14px]"><option value="all">Everyone</option><option value="students">Students</option><option value="writers">Writers</option></select>
            <div><Btn2 disabled={!ann.title || !ann.body} onClick={() => { setSent((s) => [{ t: "Just now", title: ann.title, to: ann.to }, ...s]); setAnn({ title: "", body: "", to: "all" }); toast.show("Announcement sent"); }}>Send</Btn2></div></div></Card>
          <Card title="Sent">{sent.length === 0 ? <p className="text-[13px] text-[var(--dim)]">Nothing sent yet.</p> : sent.map((s, i) => <div key={i} className="border-b border-[#F0E8F7] py-2 last:border-0"><div className="text-[14px] font-semibold">{s.title}</div><div className="text-[12px] text-[var(--dim)]">{s.to} · {s.t}</div></div>)}</Card>
        </div>
      </>)}

      {page === "audit" && (<>
        <PageTitle title="Audit log" sub="Every change made by the team." />
        <Card pad={false}>{[...AUDIT0, ...(sent.map((s) => ["Saviour", `Sent announcement "${s.title}"`, s.t]))].map(([who, what, when], i) => (<div key={i} className="flex items-center gap-4 border-b border-[#F0E8F7] px-5 py-3.5 last:border-0"><span className="w-20 shrink-0 text-[13px] font-bold">{who}</span><span className="flex-1 text-[14px]">{what}</span><span className="text-[12px] text-[var(--dim)]">{when}</span></div>))}</Card>
      </>)}
    </DeskShell>
  );
}
