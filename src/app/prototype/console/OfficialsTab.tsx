"use client";

// Verified accounts: approve or reject applications, create accounts directly (Unisupport, an SUG),
// and suspend accounts that misbehave. Also resets a student's wallet PIN after Help has checked it's them.
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Btn2, Card, Input, Pill } from "../staff/kit";

type App = { id: string; name: string; handle: string | null; category: string; about: string | null; school: string | null; contact_name: string | null; phone: string | null; email: string | null; proof: string | null; status: string; created_at: string; by: { name: string; handle: string | null } };
type Acct = { id: string; handle: string; name: string; category: string; status: string; followers: number; posts: number; school: string | null; owners: { name: string; handle: string | null }[] | null };

const CATS = ["company", "sug", "department", "school", "organisation", "government", "unisupport"];
const err = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

export function OfficialsTab({ show }: { show: (m: string) => void }) {
  const [apps, setApps] = useState<App[]>([]);
  const [accts, setAccts] = useState<Acct[]>([]);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [f, setF] = useState({ name: "", handle: "", category: "sug", owner: "" });
  const [pinUser, setPinUser] = useState("");
  const load = useCallback(async () => {
    const sb = createClient();
    const [a, b] = await Promise.all([sb.rpc("admin_list_official_apps"), sb.rpc("admin_list_officials")]);
    if (a.error) show(err(a.error)); else setApps((a.data ?? []) as App[]);
    if (!b.error) setAccts((b.data ?? []) as Acct[]);
  }, [show]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function decide(a: App, status: "approved" | "rejected") {
    const { error } = await createClient().rpc("admin_decide_official_app", { p_id: a.id, p_status: status, p_handle: handles[a.id] ?? a.handle });
    if (error) return show(err(error) === "handle_taken" ? "That handle is taken. Change it and approve again." : err(error) === "bad_handle" ? "Handles are 3-30 letters, numbers or _" : err(error));
    show(status === "approved" ? `${a.name} is now verified` : "Rejected"); void load();
  }
  async function create() {
    const { error } = await createClient().rpc("admin_create_official", { p_name: f.name, p_handle: f.handle, p_category: f.category, p_owner_handle: f.owner });
    if (error) return show(err(error) === "no_such_user" ? "No one has that owner username" : err(error) === "handle_taken" ? "That handle is taken" : err(error));
    show("Account created"); setF({ name: "", handle: "", category: "sug", owner: "" }); void load();
  }
  async function setStatus(a: Acct, status: "active" | "suspended") {
    const { error } = await createClient().rpc("admin_set_official_status", { p_oa: a.id, p_status: status });
    if (error) return show(err(error));
    void load();
  }
  async function resetPin() {
    const sb = createClient();
    const { data: ch } = await sb.from("channels").select("id").eq("handle", pinUser.trim().replace(/^@/, "").toLowerCase()).maybeSingle();
    if (!ch) return show("No one has that username");
    const { error } = await sb.rpc("admin_reset_wallet_pin", { p_user: ch.id });
    if (error) return show(err(error));
    show("PIN reset. They can set a new one next time they send money."); setPinUser("");
  }
  const pending = apps.filter((a) => a.status === "pending");
  return (
    <div className="space-y-5">
      <Card title={`Requests (${pending.length} waiting)`} sub="Check the proof before approving. Verified accounts get the blue tick and can message students who wrote to them in the last 7 days." pad={false}>
        {apps.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No requests yet.</div> : (
          <div className="divide-y divide-[#F0EAF7]">{apps.map((a) => (
            <div key={a.id} className="space-y-1.5 px-5 py-3 text-[13.5px]">
              <div className="flex flex-wrap items-center gap-2"><b>{a.name}</b><Pill tone="purple">{a.category}</Pill>{a.school && <Pill>{a.school}</Pill>}<Pill tone={a.status === "pending" ? "amber" : a.status === "approved" ? "green" : "red"}>{a.status}</Pill>
                <span className="text-[12px] text-[var(--dim)]">by {a.by?.name}{a.by?.handle ? ` @${a.by.handle}` : ""} · {new Date(a.created_at).toLocaleDateString()}</span></div>
              {a.about && <div className="text-[var(--dim)]">{a.about}</div>}
              <div className="text-[12.5px] text-[var(--dim)]">{[a.contact_name, a.phone, a.email].filter(Boolean).join(" · ")}</div>
              {a.proof && <div className="rounded-lg bg-[#F8F4FB] px-3 py-2 text-[12.5px]"><b>Proof:</b> {a.proof}</div>}
              {a.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Input value={handles[a.id] ?? a.handle ?? ""} onChange={(v) => setHandles((h) => ({ ...h, [a.id]: v.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} placeholder="handle" />
                  <Btn2 small onClick={() => void decide(a, "approved")}>Approve</Btn2>
                  <Btn2 small tone="ghost" onClick={() => void decide(a, "rejected")}>Reject</Btn2>
                </div>
              )}
            </div>
          ))}</div>)}
      </Card>

      <Card title="Create an account" sub="For Unisupport, an SUG or a department you've already checked. The owner runs it from Me in the app.">
        <div className="grid gap-2 md:grid-cols-4">
          <Input value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} placeholder="Name, e.g. SUG FUL" />
          <Input value={f.handle} onChange={(v) => setF((x) => ({ ...x, handle: v.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} placeholder="handle, e.g. sug_ful" />
          <select value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))} className="rounded-xl border border-[#E6DCF0] bg-white px-3 py-2 text-sm">{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <Input value={f.owner} onChange={(v) => setF((x) => ({ ...x, owner: v }))} placeholder="Owner @username (blank = you)" />
        </div>
        <div className="mt-3"><Btn2 disabled={f.name.trim().length < 2 || f.handle.length < 3} onClick={() => void create()}>Create verified account</Btn2></div>
      </Card>

      <Card title={`Accounts (${accts.length})`} pad={false}>
        {accts.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No verified accounts yet.</div> : (
          <div className="divide-y divide-[#F0EAF7]">{accts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-[13.5px]">
              <span className="min-w-0 flex-1"><b>{a.name}</b> <span className="text-[var(--dim)]">@{a.handle}</span>
                <span className="block text-[12px] text-[var(--dim)]">{a.category}{a.school ? ` · ${a.school}` : ""} · {a.followers} followers · {a.posts} posts · owner {(a.owners ?? []).map((o) => o.name).join(", ") || "none"}</span></span>
              <Pill tone={a.status === "active" ? "green" : "red"}>{a.status}</Pill>
              <Btn2 small tone={a.status === "active" ? "danger" : "primary"} onClick={() => void setStatus(a, a.status === "active" ? "suspended" : "active")}>{a.status === "active" ? "Suspend" : "Restore"}</Btn2>
            </div>
          ))}</div>)}
      </Card>

      <Card title="Reset a wallet PIN" sub="Only after Unisupport Help has confirmed it's really them (e.g. a call to the phone on their account).">
        <div className="flex flex-wrap gap-2"><Input value={pinUser} onChange={setPinUser} placeholder="@username" /><Btn2 tone="dark" disabled={pinUser.trim().length < 3} onClick={() => void resetPin()}>Reset PIN</Btn2></div>
      </Card>
    </div>
  );
}
