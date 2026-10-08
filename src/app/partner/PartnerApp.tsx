"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Partner = { id: string; business_name: string; status: "pending" | "active" | "paused" | "rejected"; share_pct: number; schools: string[]; services: string[]; phone: string; city: string | null; state: string | null };
type Order = {
  id: string; kind: "print" | "handwrite"; status: "paid" | "in_progress" | "ready" | "delivered" | "cancelled"; pages: number; copies: number; colour: boolean; binding: string;
  write_name: string | null; write_matric: string | null; write_department: string | null; write_course: string | null; instructions: string; fulfil: "pickup" | "delivery";
  address: string | null; phone: string | null; needed_by: string | null; price: number; staff_note: string | null; created_at: string; student: string; files: { name: string }[];
};
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const when = (s: string | null) => (s ? new Date(s).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "No deadline");
const field = "w-full rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#A63FBD]";
const btn = "rounded-xl px-4 py-2.5 text-[14px] font-semibold disabled:opacity-40";
const msg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

/**
 * Birdie print partners: a print shop signs in with a Birdie account, applies, and once approved
 * gets students' print/handwrite orders (already paid) for the schools it serves.
 */
export default function PartnerApp() {
  const [sb] = useState(() => createClient());
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [me, setMe] = useState<Partner | null | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"open" | "done">("open");
  const [toast, setToast] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2600); };

  const load = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser();
    setUid(user?.id ?? null);
    if (!user) return;
    const { data } = await sb.rpc("partner_me");
    setMe((data as Partner | null) ?? null);
    if ((data as Partner | null)?.status === "active") setOrders(((await sb.rpc("partner_orders")).data ?? []) as Order[]);
  }, [sb]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  // New orders show up without refreshing.
  useEffect(() => { if (me?.status !== "active") return; const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [me?.status, load]);

  async function setStatus(o: Order, status: "in_progress" | "ready" | "delivered") {
    const note = status === "ready" && o.fulfil === "pickup" ? prompt("Pickup note for the student (where and when):") ?? "" : "";
    const { error } = await sb.rpc("partner_set_order", { p_id: o.id, p_status: status, p_note: note || null });
    if (error) return say(msg(error) || "Couldn't update");
    say("Updated. The student has been notified."); void load();
  }
  async function files(o: Order) {
    const r = await fetch(`/api/orders/${o.id}/files`); const j = await r.json().catch(() => ({}));
    if (!r.ok) return say("Couldn't get the files");
    for (const f of j.files as { name: string; url: string | null }[]) if (f.url) window.open(f.url, "_blank", "noopener");
  }

  const shell = "min-h-[100dvh] bg-[#F4EFF8] px-4 py-8 text-[#1a1024]";
  const head = (
    <div className="mb-5 flex items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[16px] font-bold text-white">B</span><span className="text-[18px] font-bold">Birdie print partners</span></div>
      {uid && <button onClick={async () => { await sb.auth.signOut(); location.reload(); }} className="text-[13px] font-semibold text-[#6E6480]">Sign out</button>}
    </div>
  );

  if (uid === undefined || (uid && me === undefined)) return <main className={shell}><div className="mx-auto max-w-2xl">{head}<p className="text-[14px] text-[#6E6480]">Loading...</p></div></main>;
  if (!uid) return <main className={shell}><div className="mx-auto max-w-md">{head}<Pitch /><SignIn onDone={load} /></div></main>;
  if (!me) return <main className={shell}><div className="mx-auto max-w-md">{head}<Pitch /><Apply onDone={load} say={say} />{toast && <Toast t={toast} />}</div></main>;
  if (me.status !== "active") return (
    <main className={shell}><div className="mx-auto max-w-md">{head}
      <div className="rounded-2xl bg-white p-5">
        <h1 className="text-[20px] font-bold">{me.business_name}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#4a3a5e]">{me.status === "pending" ? "Thanks for applying. The Birdie team will call you on WhatsApp to confirm your prices and pickup point, then switch you on. Orders appear here once you're approved." : me.status === "paused" ? "Your partner account is paused, so no new orders are sent to you. Contact Birdie to resume." : "Your application wasn't approved this time. Contact Birdie if you think this is a mistake."}</p>
      </div>
    </div></main>
  );

  const open = orders.filter((o) => ["paid", "in_progress", "ready"].includes(o.status));
  const done = orders.filter((o) => !["paid", "in_progress", "ready"].includes(o.status));
  const earned = orders.filter((o) => o.status === "delivered").reduce((a, o) => a + Number(o.price) * (Number(me.share_pct) / 100), 0);
  const list = tab === "open" ? open : done;
  return (
    <main className={shell}><div className="mx-auto max-w-2xl">{head}
      <div className="grid grid-cols-3 gap-3">
        {[["Open orders", String(open.length)], ["Delivered", String(orders.filter((o) => o.status === "delivered").length)], [`Your ${me.share_pct}% earned`, naira(earned)]].map(([a, b]) => (
          <div key={a} className="rounded-2xl bg-white p-3.5"><div className="text-[11px] font-bold uppercase tracking-wider text-[#6E6480]">{a}</div><div className="mt-1 text-[22px] font-bold">{b}</div></div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">{(["open", "done"] as const).map((t) => (<button key={t} onClick={() => setTab(t)} className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold ${tab === t ? "bg-[#1a1024] text-white" : "bg-white"}`}>{t === "open" ? `To do (${open.length})` : `Finished (${done.length})`}</button>))}</div>
      <div className="mt-3 space-y-3">
        {list.length === 0 && <div className="rounded-2xl bg-white p-6 text-center text-[14px] text-[#6E6480]">{tab === "open" ? "No orders right now. New ones show up here automatically, and you get a notification in Birdie." : "Nothing finished yet."}</div>}
        {list.map((o) => (
          <div key={o.id} className="rounded-2xl bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><div className="text-[15px] font-bold">{o.kind === "handwrite" ? "Handwrite" : "Print"} · {o.pages} page{o.pages === 1 ? "" : "s"} × {o.copies}</div><div className="text-[12.5px] text-[#6E6480]">{o.student} · ordered {when(o.created_at)}</div></div>
              <span className="rounded-full bg-[#F5E8FA] px-2.5 py-1 text-[12px] font-bold text-[#6E2A80]">{o.status.replace("_", " ")}</span>
            </div>
            <div className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
              <div><b>Needed by:</b> {when(o.needed_by)}</div>
              <div><b>{o.fulfil === "delivery" ? "Deliver to" : "Pickup"}:</b> {o.fulfil === "delivery" ? `${o.address ?? ""} · ${o.phone ?? ""}` : "At your shop"}</div>
              {o.kind === "print" && <div><b>Colour:</b> {o.colour ? "Yes" : "Black & white"} · <b>Binding:</b> {o.binding}</div>}
              {o.kind === "handwrite" && <div className="sm:col-span-2"><b>Write as:</b> {[o.write_name, o.write_matric, o.write_department, o.write_course].filter(Boolean).join(" · ")}</div>}
              <div><b>Order value:</b> {naira(Number(o.price))} (you get {naira(Number(o.price) * (Number(me.share_pct) / 100))})</div>
            </div>
            {o.instructions && <p className="mt-2 rounded-xl bg-[#F8F4FB] p-2.5 text-[13px]">{o.instructions}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void files(o)} className={`${btn} bg-[#F4EFF8]`}>Download files ({o.files?.length ?? 0})</button>
              {o.status === "paid" && <button onClick={() => void setStatus(o, "in_progress")} className={`${btn} bg-[#1a1024] text-white`}>Start</button>}
              {o.status === "in_progress" && <button onClick={() => void setStatus(o, "ready")} className={`${btn} bg-[#1a1024] text-white`}>{o.fulfil === "pickup" ? "Ready for pickup" : "Ready to deliver"}</button>}
              {(o.status === "ready" || o.status === "in_progress") && <button onClick={() => void setStatus(o, "delivered")} className={`${btn} bg-[#A63FBD] text-white`}>{o.fulfil === "pickup" ? "Picked up" : "Delivered"}</button>}
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast t={toast} />}
    </div></main>
  );
}

function Toast({ t }: { t: string }) { return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-[#1a1024] px-4 py-3 text-[13.5px] font-semibold text-white">{t}</div>; }

function Pitch() {
  return (
    <div className="mb-4">
      <h1 className="text-[26px] font-bold leading-tight">Get paid print jobs from students near you</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[#4a3a5e]">Students order printing, binding and handwritten assignments in Birdie and pay upfront. We send each order to a partner shop serving their school. You download the files, do the job, mark it ready, and get your share.</p>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const sb = createClient();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    const r = mode === "in" ? await sb.auth.signInWithPassword({ email: email.trim(), password: pw }) : await sb.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: `${location.origin}/partner` } });
    setBusy(false);
    if (r.error) return setErr(r.error.message);
    if (mode === "up" && !r.data.session) return setErr("Check your email to confirm your account, then come back and sign in.");
    onDone();
  }
  return (
    <div className="space-y-3 rounded-2xl bg-white p-5">
      <div className="flex gap-2">{(["up", "in"] as const).map((m) => (<button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-xl py-2 text-[13.5px] font-semibold ${mode === m ? "bg-[#1a1024] text-white" : "bg-[#F4EFF8]"}`}>{m === "up" ? "Create account" : "Sign in"}</button>))}</div>
      <input className={field} type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className="text-[13px] text-[#c0392b]">{err}</p>}
      <button disabled={busy || !email.includes("@") || pw.length < 8} onClick={() => void go()} className={`${btn} w-full bg-[#A63FBD] text-white`}>{busy ? "Please wait..." : mode === "up" ? "Create account" : "Sign in"}</button>
    </div>
  );
}

function Apply({ onDone, say }: { onDone: () => void; say: (t: string) => void }) {
  const sb = createClient();
  const [f, setF] = useState({ business_name: "", contact_name: "", phone: "", address: "", city: "", state: "", schools: "" });
  const [services, setServices] = useState<string[]>(["print", "bind"]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  async function submit() {
    setBusy(true);
    const { error } = await sb.rpc("partner_apply", { p: { ...f, schools: f.schools.split(",").map((s) => s.trim()).filter(Boolean), services } });
    setBusy(false);
    if (error) return say(msg(error) === "phone_required" ? "Add a phone number" : "Couldn't send. Try again.");
    say("Application sent"); onDone();
  }
  return (
    <div className="space-y-3 rounded-2xl bg-white p-5">
      <h2 className="text-[17px] font-bold">Apply as a print partner</h2>
      <input className={field} placeholder="Business name" value={f.business_name} onChange={(e) => set("business_name", e.target.value)} />
      <input className={field} placeholder="Your name" value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
      <input className={field} placeholder="WhatsApp number" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
      <input className={field} placeholder="Shop address (students pick up here)" value={f.address} onChange={(e) => set("address", e.target.value)} />
      <div className="grid grid-cols-2 gap-2"><input className={field} placeholder="City" value={f.city} onChange={(e) => set("city", e.target.value)} /><input className={field} placeholder="State" value={f.state} onChange={(e) => set("state", e.target.value)} /></div>
      <input className={field} placeholder="Schools you serve, e.g. UNILAG, YABATECH" value={f.schools} onChange={(e) => set("schools", e.target.value)} />
      <div className="flex flex-wrap gap-2">{[["print", "Printing"], ["bind", "Binding"], ["handwrite", "Handwriting"], ["deliver", "Delivery"]].map(([id, label]) => (
        <button key={id} onClick={() => setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${services.includes(id) ? "bg-[#A63FBD] text-white" : "bg-[#F4EFF8]"}`}>{label}</button>
      ))}</div>
      <button disabled={busy || f.business_name.trim().length < 2 || !f.phone.trim()} onClick={() => void submit()} className={`${btn} w-full bg-[#1a1024] text-white`}>{busy ? "Sending..." : "Send application"}</button>
    </div>
  );
}
