"use client";

// Accounts and posts students reported. Look, act (block/remove in Users or Supabase), then mark handled.
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Btn2, Card, Pill } from "../staff/kit";

type Report = { id: string; kind: string; target: string; target_name: string | null; reason: string | null; status: "open" | "handled"; created_at: string; reporter: string | null };

export function ReportsCard({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<Report[]>([]);
  const load = useCallback(async () => { const { data } = await createClient().rpc("admin_list_reports"); setRows((data ?? []) as Report[]); }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function set(r: Report, status: "open" | "handled") {
    const { error } = await createClient().rpc("admin_set_report", { p_id: r.id, p_status: status });
    if (error) return show(error.message);
    void load();
  }
  const open = rows.filter((r) => r.status === "open").length;
  return (
    <Card title={`Reports (${open} open)`} sub="Accounts and posts students reported." pad={false}>
      {rows.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No reports.</div> : (
        <div className="divide-y divide-[#F0EAF7]">{rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
            <Pill tone={r.status === "open" ? "red" : "gray"}>{r.kind}</Pill>
            <span className="min-w-0 flex-1 text-[13.5px]"><b>{r.target_name ?? r.target}</b>{r.reason ? ` · "${r.reason}"` : ""}<span className="block text-[12px] text-[var(--dim)]">by {r.reporter ?? "a student"} · {new Date(r.created_at).toLocaleString()}</span></span>
            {r.status === "open" ? <Btn2 small onClick={() => void set(r, "handled")}>Mark handled</Btn2> : <button onClick={() => void set(r, "open")} className="text-[12.5px] font-semibold text-[var(--dim)]">Reopen</button>}
          </div>
        ))}</div>
      )}
    </Card>
  );
}
