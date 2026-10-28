"use client";

// Birdie for Business, from the console. Businesses run themselves; this is where the few things that
// can't be settled by rule land: order problems from people who report a lot, school accounts that
// students objected to, and checks still waiting for Dojah. Admins can also act as any business in the
// app (Me > Switch Account).
import { useCallback, useEffect, useState } from "react";
import { adminBizAct, adminBusinesses, adminDisputeDecide, adminDisputes, naira, type Order } from "../live/bizData";
import { Btn2, Card, Input, Pill } from "../staff/kit";

type Row = Awaited<ReturnType<typeof adminBusinesses>>[number];

export function BusinessTab({ show }: { show: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Row[]>([]);
  const [disputes, setDisputes] = useState<Order[]>([]);
  const [refund, setRefund] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const [a, d] = await Promise.all([adminBusinesses(q), adminDisputes()]);
    setList(a); setDisputes(d);
  }, [q]);
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t); }, [load]);
  async function act(b: Row, a: "verify" | "suspend" | "unsuspend" | "clear_debt" | "delete") {
    if (a === "delete" && !confirm(`Delete the test business ${b.name}?`)) return;
    const r = await adminBizAct(b.id, a);
    show(r.error ?? "Done"); void load();
  }
  const challenged = list.filter((b) => b.kyc_status === "queued" && b.biz_type === "school_body");
  const waiting = list.filter((b) => b.kyc_status === "queued" && b.biz_type !== "school_body");
  return (
    <div className="space-y-5">
      <Card title={`Order problems (${disputes.length})`} sub="From students who reported 3 or more problems in 30 days. Everyone else is refunded by rule." pad={false}>
        {disputes.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">Nothing to decide.</div> : (
          <div className="divide-y divide-[#F0EAF7]">{disputes.map((o) => (
            <div key={o.id} className="space-y-1.5 px-5 py-3 text-[13.5px]">
              <div className="flex flex-wrap items-center gap-2"><b>{o.business.name}</b><Pill tone="amber">{o.problem?.reason?.replace("_", " ")}</Pill><span className="text-[12px] text-[var(--dim)]">{o.customer?.name} · {naira(o.total)} · {new Date(o.created_at).toLocaleString()}</span></div>
              <div className="text-[var(--dim)]">{o.items.map((i) => `${i.qty} x ${i.name}`).join(", ")}</div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Input value={refund[o.id] ?? String(o.total)} onChange={(v) => setRefund((x) => ({ ...x, [o.id]: v.replace(/[^\d.]/g, "") }))} suffix="₦" w="w-32" />
                <Btn2 small onClick={async () => { const r = await adminDisputeDecide(o.id, Number(refund[o.id] ?? o.total)); show(r.error ?? "Refund sent"); void load(); }}>Refund this</Btn2>
                <Btn2 small tone="ghost" onClick={async () => { const r = await adminDisputeDecide(o.id, 0); show(r.error ?? "Order stands"); void load(); }}>No refund</Btn2>
              </div>
            </div>
          ))}</div>
        )}
      </Card>

      {challenged.length > 0 && <Card title={`Challenged school accounts (${challenged.length})`} sub="5 or more students at the school objected. Check, then verify or suspend." pad={false}>
        <div className="divide-y divide-[#F0EAF7]">{challenged.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-[13.5px]"><b>{b.name}</b><span className="text-[var(--dim)]">{b.school} · {b.objections} objections · owner {b.owners?.[0]?.name}</span>
            <span className="ml-auto flex gap-2"><Btn2 small onClick={() => void act(b, "verify")}>Verify</Btn2><Btn2 small tone="danger" onClick={() => void act(b, "suspend")}>Suspend</Btn2></span></div>
        ))}</div>
      </Card>}

      {waiting.length > 0 && <Card title={`Waiting for Dojah (${waiting.length})`} sub="Fee paid and details sent. They run on their own as soon as DOJAH_APP_ID and DOJAH_SECRET_KEY are set on Vercel." pad={false}>
        <div className="divide-y divide-[#F0EAF7]">{waiting.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-[13.5px]"><b>{b.name}</b><span className="text-[var(--dim)]">CAC {String(b.kyc?.rc_number ?? "")} · {b.fee_paid ? "fee paid" : "fee not paid"}</span></div>
        ))}</div>
      </Card>}

      <Card title={`Businesses (${list.length})`} right={<Input value={q} onChange={setQ} placeholder="Search" w="w-48" />} pad={false}>
        <div className="divide-y divide-[#F0EAF7]">{list.map((b) => (
          <div key={b.id} className="space-y-1 px-5 py-3 text-[13.5px]">
            <div className="flex flex-wrap items-center gap-2">
              <b>{b.name}</b><span className="text-[12px] text-[var(--dim)]">@{b.handle}</span>
              <Pill tone="purple">{b.biz_type.replace("_", " ")}</Pill>{b.biz_category && <Pill>{b.biz_category}</Pill>}
              <Pill tone={b.status === "suspended" ? "red" : b.level === "verified" ? "green" : b.level === "listed" ? "purple" : "amber"}>{b.status === "suspended" ? "suspended" : b.level}</Pill>
              {b.is_test && <Pill>test</Pill>}
            </div>
            <div className="text-[12.5px] text-[var(--dim)]">
              {b.owners?.map((o) => o.name).join(", ")} · {b.schools?.join(", ") || b.school || "no school"} · ID {b.owner_check?.ok ? "checked" : "not checked"} · payouts {b.payouts_ready ? "ready" : "not set"}
              {b.orders_60d ? ` · ${b.orders_60d} orders (${b.refunded_60d} refunded) in 60 days` : ""}{b.debt > 0 ? ` · owes ${naira(b.debt)}` : ""}{b.ad_credit > 0 ? ` · ad credit ${naira(b.ad_credit)}` : ""}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {b.level !== "verified" && <Btn2 small tone="ghost" onClick={() => void act(b, "verify")}>Verify</Btn2>}
              {b.status === "suspended" ? <Btn2 small tone="ghost" onClick={() => void act(b, "unsuspend")}>Unsuspend</Btn2> : <Btn2 small tone="ghost" onClick={() => void act(b, "suspend")}>Suspend</Btn2>}
              {b.debt > 0 && <Btn2 small tone="ghost" onClick={() => void act(b, "clear_debt")}>Clear debt</Btn2>}
              {b.is_test && <Btn2 small tone="danger" onClick={() => void act(b, "delete")}>Delete</Btn2>}
              <Btn2 small tone="ghost" onClick={() => window.open(`/prototype?biz=${b.id}`, "_blank")}>Open as owner</Btn2>
            </div>
          </div>
        ))}</div>
      </Card>
    </div>
  );
}
