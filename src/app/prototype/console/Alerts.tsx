"use client";

// Admin alerts: new students, orders, complaints/reports, applications, school additions, sales and
// new help chats. They also go to your phone once "Phone alerts" is on for that device.
import { Bell, BellRing } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { enablePush, isSubscribed } from "../push";
import { Card, Switch } from "../staff/kit";

type Note = { id: string; title: string; body: string; read: boolean; created_at: string; link: string | null };
const KINDS: [string, string][] = [["new_user", "New students"], ["order", "Print & handwriting orders"], ["complaint", "Complaints & reports"], ["application", "Business, internship, print shop & rep applications"], ["school", "Schools students add"], ["sale", "Sales & top-ups"], ["help", "New help chats"]];
const ago = (t: string) => { const m = Math.round((Date.now() - Date.parse(t)) / 60000); return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };

export function AlertsBell({ onOpen }: { onOpen: () => void }) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () => createClient().from("notifications").select("id", { count: "exact", head: true }).eq("read", false).then(({ count }) => setUnread(count ?? 0));
    void Promise.resolve().then(load);
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <button onClick={onOpen} aria-label="Alerts" className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white">
      <Bell size={18} />{unread > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#C2412D] px-1 text-center text-[11px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </button>
  );
}

export function AlertsTab({ show, go }: { show: (m: string) => void; go: (tab: string) => void }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [phone, setPhone] = useState(false);
  const load = useCallback(async () => {
    const sb = createClient();
    const [{ data: n }, { data: cfg }] = await Promise.all([
      sb.from("notifications").select("id,title,body,read,created_at,link").order("created_at", { ascending: false }).limit(100),
      sb.from("app_config").select("key,value").like("key", "alert_%"),
    ]);
    setNotes((n ?? []) as Note[]);
    setMuted(Object.fromEntries((cfg ?? []).map((r) => [String(r.key).replace(/^alert_/, ""), Number(r.value) === 0])));
    await sb.from("notifications").update({ read: true }).eq("read", false);
  }, []);
  useEffect(() => { void Promise.resolve().then(load); void isSubscribed().then(setPhone); }, [load]);

  async function mute(kind: string, off: boolean) {
    const { error } = await createClient().from("app_config").upsert({ key: `alert_${kind}`, value: off ? 0 : 1 });
    if (error) return show(error.message);
    setMuted((m) => ({ ...m, [kind]: off }));
  }
  function open(n: Note) {
    const tab = n.link && new URL(n.link, location.origin).searchParams.get("tab");
    if (n.link?.startsWith("/prototype/console") && tab) go(tab); else if (n.link && !n.link.startsWith("/prototype/console")) window.open(n.link, "_blank");
  }

  return (
    <div className="space-y-4">
      <Card title="Phone alerts" sub="Get these on this device's notification bar, even with the console closed.">
        <div className="flex flex-wrap items-center gap-3">
          {phone ? <span className="flex items-center gap-2 text-[14px] font-semibold text-[#0a7a56]"><BellRing size={16} /> On for this device</span>
            : <button onClick={async () => { const err = await enablePush(); if (err) show(err); else { setPhone(true); show("Phone alerts are on"); } }} className="rounded-xl bg-[#1a1024] px-4 py-2 text-[13.5px] font-semibold text-white">Turn on phone alerts</button>}
        </div>
      </Card>
      <Card title="Recent alerts" pad={false}>
        {notes === null ? <div className="p-6 text-center text-sm text-[var(--dim)]">Loading...</div> : notes.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">Nothing yet.</div> : (
          <div className="divide-y divide-[#F0EAF7]">{notes.map((n) => (
            <button key={n.id} onClick={() => open(n)} className={`flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-[#F8F4FB] ${n.read ? "" : "bg-[#FBF6FE]"}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[#8b3fa6]"}`} />
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{n.title}</span><span className="block text-[12.5px] text-[var(--dim)]">{n.body}</span></span>
              <span className="shrink-0 text-[11.5px] text-[var(--dim)]">{ago(n.created_at)}</span>
            </button>
          ))}</div>
        )}
      </Card>
      <Card title="What to alert me about" sub="Applies to every admin.">
        <div className="divide-y divide-[#F0EAF7]">{KINDS.map(([k, label]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-2.5"><span className="text-[13.5px]">{label}</span><Switch on={!muted[k]} onChange={(v) => void mute(k, !v)} /></div>
        ))}</div>
      </Card>
    </div>
  );
}
