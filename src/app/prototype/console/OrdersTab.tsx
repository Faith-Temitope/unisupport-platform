"use client";

// Print & handwrite orders. Students pay upfront; staff move each order along and leave a note the
// student sees (e.g. where to pick it up). Cancelling here refunds the student automatically.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Btn2, Card, Pill } from "../staff/kit";

type Order = {
  id: string; kind: "print" | "handwrite"; status: "paid" | "in_progress" | "ready" | "delivered" | "cancelled"; files: { name: string; path: string }[];
  pages: number; copies: number; colour: boolean; binding: string; write_name: string | null; write_matric: string | null; write_department: string | null; write_course: string | null;
  instructions: string; fulfil: "pickup" | "delivery"; address: string | null; phone: string | null; needed_by: string | null; price: number; staff_note: string;
  created_at: string; student: string | null; email: string; partner_id: string | null; partner_name: string | null;
};
type Partner = { id: string; business_name: string; contact_name: string | null; phone: string; email: string; address: string | null; city: string | null; state: string | null; schools: string[]; services: string[]; status: "pending" | "active" | "paused" | "rejected"; open_orders: number; done_orders: number };
const LABEL: Record<Order["status"], string> = { paid: "New", in_progress: "In progress", ready: "Ready", delivered: "Delivered", cancelled: "Cancelled" };
const NEXT: Partial<Record<Order["status"], { to: Order["status"]; label: string }>> = { paid: { to: "in_progress", label: "Start" }, in_progress: { to: "ready", label: "Mark ready" }, ready: { to: "delivered", label: "Mark delivered" } };
const fmt = (d: string) => new Date(d).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function OrdersTab({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<"open" | "done">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [partners, setPartners] = useState<Partner[]>([]);
  const loadPartners = () => createClient().rpc("admin_list_print_partners").then(({ data }) => setPartners((data ?? []) as Partner[]));
  useEffect(() => { void loadPartners(); }, []);
  async function assign(o: Order, partnerId: string) {
    const { error } = await createClient().rpc("staff_assign_print_order", { p_order: o.id, p_partner: partnerId || null });
    if (error) return show(error.message.replace(/^.*?exception:\s*/i, ""));
    show(partnerId ? "Sent to the print partner" : "Taken back by Unisupport"); void reload(); void loadPartners();
  }
  const reload = async () => { const { data, error } = await createClient().rpc("staff_list_print_orders"); if (error) show(error.message); setRows((data ?? []) as Order[]); };
  useEffect(() => { void createClient().rpc("staff_list_print_orders").then(({ data }) => setRows((data ?? []) as Order[])); }, []);

  async function move(o: Order, to: Order["status"]) {
    if (to === "cancelled" && !confirm(`Cancel this order and refund ₦${Math.round(o.price).toLocaleString("en-NG")} to the student?`)) return;
    const note = notes[o.id]?.trim();
    const { error } = await createClient().rpc("staff_set_print_order", { p_id: o.id, p_status: to, p_note: note || null });
    if (error) return show(error.message.replace(/^.*?exception:\s*/i, ""));
    show(to === "cancelled" ? "Cancelled and refunded" : `Marked ${LABEL[to].toLowerCase()}`); setNotes((n) => ({ ...n, [o.id]: "" })); void reload();
  }
  async function files(o: Order) {
    const r = await fetch(`/api/orders/${o.id}/files`);
    const j = await r.json().catch(() => null);
    if (!r.ok) return show(j?.error ?? "Couldn't get the files");
    for (const f of (j.files ?? []) as { name: string; url: string | null }[]) if (f.url) window.open(f.url, "_blank", "noopener,noreferrer");
  }

  if (!rows) return <div className="p-10 text-center text-sm text-[var(--dim)]">Loading...</div>;
  const open = rows.filter((o) => o.status === "paid" || o.status === "in_progress" || o.status === "ready");
  const list = filter === "open" ? open : rows.filter((o) => o.status === "delivered" || o.status === "cancelled");
  const revenue = rows.filter((o) => o.status !== "cancelled").reduce((a, o) => a + Number(o.price), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">New</div><div className="disp mt-1 text-[24px] font-bold">{rows.filter((o) => o.status === "paid").length}</div></Card>
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Open</div><div className="disp mt-1 text-[24px] font-bold">{open.length}</div></Card>
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Order revenue</div><div className="disp mt-1 text-[24px] font-bold">₦{Math.round(revenue).toLocaleString("en-NG")}</div></Card>
      </div>
      <div className="flex gap-2">{(["open", "done"] as const).map((f) => (<button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold ${filter === f ? "bg-[#1a1024] text-white" : "bg-white"}`}>{f === "open" ? `Open (${open.length})` : "Done"}</button>))}</div>
      <Card title={filter === "open" ? "Open orders" : "Finished orders"} sub="Soonest deadline first. Prices are set in Pricing > App config (print_*, handwrite_page)." pad={false}>
        {list.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">Nothing here.</div> : (
          <div className="divide-y divide-[#F0EAF7]">{list.map((o) => {
            const late = o.needed_by && new Date(o.needed_by) < new Date() && filter === "open";
            return (
              <div key={o.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-bold">{o.kind === "print" ? `Print · ${o.pages}p${o.copies > 1 ? ` × ${o.copies}` : ""} · ${o.colour ? "colour" : "B&W"}${o.binding !== "none" ? ` · ${o.binding === "hard" ? "hard cover" : "spiral"}` : ""}` : `Handwrite · ${o.pages} pages`}</span>
                  <Pill tone={o.status === "paid" ? "amber" : o.status === "cancelled" ? "gray" : o.status === "delivered" ? "green" : "purple"}>{LABEL[o.status]}</Pill>
                  {late && <Pill tone="red">past deadline</Pill>}
                  <span className="ml-auto text-[13.5px] font-bold">₦{Math.round(Number(o.price)).toLocaleString("en-NG")}</span>
                </div>
                <div className="text-[12.5px] text-[var(--dim)]">{o.student ?? "Student"} · {o.email} · ordered {fmt(o.created_at)}{o.needed_by ? ` · needed by ${fmt(o.needed_by)}` : ""}</div>
                {o.kind === "handwrite" && <div className="rounded-lg bg-[#F8F4FB] px-3 py-2 text-[13px]">Write: <b>{o.write_name}</b> · Matric <b>{o.write_matric}</b>{o.write_department ? ` · ${o.write_department}` : ""}{o.write_course ? ` · ${o.write_course}` : ""}</div>}
                <div className="text-[13px]">{o.fulfil === "delivery" ? <>Deliver to <b>{o.address}</b> · {o.phone}</> : "Pickup"}</div>
                {o.instructions && <div className="text-[13px] text-[#4a3a5e]">&ldquo;{o.instructions}&rdquo;</div>}
                {o.staff_note && <div className="text-[12.5px] text-[var(--dim)]">Note to student: {o.staff_note}</div>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button onClick={() => void files(o)} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-2 ring-[#E6DCF0]">Open {o.files.length} file{o.files.length === 1 ? "" : "s"}</button>
                  {filter === "open" && (
                    <select value={o.partner_id ?? ""} onChange={(e) => void assign(o, e.target.value)} className="rounded-xl border-2 border-[#E6DCF0] bg-white px-2 py-1.5 text-[12.5px] font-semibold">
                      <option value="">Unisupport handles it</option>
                      {partners.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.business_name}{p.city ? ` · ${p.city}` : ""}</option>)}
                    </select>
                  )}
                  {filter !== "open" && o.partner_name && <span className="text-[12.5px] text-[var(--dim)]">by {o.partner_name}</span>}
                  {NEXT[o.status] && (<>
                    <input value={notes[o.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))} placeholder={o.status === "in_progress" ? "e.g. Pick up at Faculty of Science gate, 2-5pm" : "Note to student (optional)"} className="min-w-[220px] flex-1 rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-1.5 text-[13px] outline-none" />
                    <Btn2 small onClick={() => void move(o, NEXT[o.status]!.to)}>{NEXT[o.status]!.label}</Btn2>
                    <button onClick={() => void move(o, "cancelled")} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#C2412D] ring-2 ring-[#E6DCF0]">Cancel &amp; refund</button>
                  </>)}
                </div>
              </div>
            );
          })}</div>
        )}
      </Card>
      <PrintPartners rows={partners} reload={() => void loadPartners()} show={show} />
      <TutorialDisputes show={show} />
    </div>
  );
}

type Dispute = { booking_id: string; amount: number; complaint: string | null; title: string; starts_at: string; tutor: string; student: string };

// A student reported a paid tutorial within 24h of it ending; the money is held until you decide.
function TutorialDisputes({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<Dispute[]>([]);
  useEffect(() => { void createClient().rpc("admin_list_tutorial_disputes").then(({ data }) => setRows((data ?? []) as Dispute[])); }, []);
  async function resolve(d: Dispute, refund: boolean) {
    if (!confirm(refund ? `Refund ₦${d.amount} to ${d.student}?` : `Pay the tutor (${d.tutor}) for this booking?`)) return;
    const { error } = await createClient().rpc("admin_resolve_tutorial_dispute", { p_booking: d.booking_id, p_refund: refund });
    if (error) return show(error.message);
    show(refund ? "Student refunded" : "Tutor paid"); setRows((r) => r.filter((x) => x.booking_id !== d.booking_id));
  }
  return (
    <Card title="Tutorial complaints" sub="Paid tutorials a student reported. The payment is held until you decide." pad={false}>
      {rows.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No open complaints.</div> : (
        <div className="divide-y divide-[#F0EAF7]">{rows.map((d) => (
          <div key={d.booking_id} className="space-y-1.5 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-bold">{d.title}</span><span className="ml-auto text-[13.5px] font-bold">₦{Math.round(Number(d.amount)).toLocaleString("en-NG")}</span></div>
            <div className="text-[12.5px] text-[var(--dim)]">{fmt(d.starts_at)} · tutor {d.tutor} · reported by {d.student}</div>
            {d.complaint && <div className="text-[13px] text-[#4a3a5e]">&ldquo;{d.complaint}&rdquo;</div>}
            <div className="flex gap-2 pt-1"><Btn2 small onClick={() => void resolve(d, true)}>Refund student</Btn2><button onClick={() => void resolve(d, false)} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-2 ring-[#E6DCF0]">Pay tutor</button></div>
          </div>
        ))}</div>
      )}
    </Card>
  );
}

// Print shops that applied at /partner. Approve them and new orders route to them automatically:
// a partner serving the student's school first, then one in the same state, offering the service.
function PrintPartners({ rows, reload, show }: { rows: Partner[]; reload: () => void; show: (m: string) => void }) {
  async function set(p: Partner, status: Partner["status"]) {
    const { error } = await createClient().rpc("admin_set_print_partner", { p_id: p.id, p_status: status });
    if (error) return show(error.message.replace(/^.*?exception:\s*/i, ""));
    show(status === "active" ? `${p.business_name} is live` : `${p.business_name} ${status}`); reload();
  }
  return (
    <Card title="Print partners" sub="Shops apply at birdie's /partner page. Approved partners get orders for the schools they serve and download the files themselves." pad={false}>
      {rows.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No print partners yet. Share the /partner link with print shops near campus.</div> : (
        <div className="divide-y divide-[#F0EAF7]">{rows.map((p) => (
          <div key={p.id} className="space-y-1.5 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-bold">{p.business_name}</span><Pill tone={p.status === "active" ? "green" : p.status === "pending" ? "amber" : "gray"}>{p.status}</Pill><span className="ml-auto text-[12.5px] text-[var(--dim)]">{p.open_orders} open · {p.done_orders} done</span></div>
            <div className="text-[12.5px] text-[var(--dim)]">{[p.contact_name, p.phone, p.email].filter(Boolean).join(" · ")}</div>
            <div className="text-[12.5px]">{[p.address, p.city, p.state].filter(Boolean).join(", ")}{p.schools.length ? ` · serves ${p.schools.join(", ")}` : ""} · {p.services.join(", ")}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              {p.status !== "active" && <Btn2 small onClick={() => void set(p, "active")}>Approve</Btn2>}
              {p.status === "active" && <button onClick={() => void set(p, "paused")} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-2 ring-[#E6DCF0]">Pause</button>}
              {p.status === "pending" && <button onClick={() => void set(p, "rejected")} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#C2412D] ring-2 ring-[#E6DCF0]">Reject</button>}
              <a href={`https://wa.me/${p.phone.replace(/\D/g, "").replace(/^0/, "234")}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-2 ring-[#E6DCF0]">WhatsApp</a>
            </div>
          </div>
        ))}</div>
      )}
    </Card>
  );
}
