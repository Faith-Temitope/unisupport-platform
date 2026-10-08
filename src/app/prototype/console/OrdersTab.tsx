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
  created_at: string; student: string | null; email: string;
};
const LABEL: Record<Order["status"], string> = { paid: "New", in_progress: "In progress", ready: "Ready", delivered: "Delivered", cancelled: "Cancelled" };
const NEXT: Partial<Record<Order["status"], { to: Order["status"]; label: string }>> = { paid: { to: "in_progress", label: "Start" }, in_progress: { to: "ready", label: "Mark ready" }, ready: { to: "delivered", label: "Mark delivered" } };
const fmt = (d: string) => new Date(d).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function OrdersTab({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<"open" | "done">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
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
