"use client";

// Schools students added because they weren't on the list. They can already use them on their own
// profile; approving (and fixing the spelling if needed) puts the school on everyone's list.
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Btn2, Card } from "../staff/kit";

type Row = { id: string; name: string; country: string | null; state: string | null; created_at: string; by: string | null; students: number };

export function SchoolSuggestions({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const load = useCallback(async () => { const { data } = await createClient().rpc("admin_list_school_suggestions"); setRows((data ?? []) as Row[]); }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function set(r: Row, status: "approved" | "rejected") {
    const { error } = await createClient().rpc("admin_set_school", { p_id: r.id, p_status: status, p_name: names[r.id] ?? null });
    if (error) return show(error.message);
    show(status === "approved" ? "School added to everyone's list" : "Removed"); void load();
  }
  return (
    <Card title={`Schools students added (${rows.length})`} sub="Fix the spelling if needed, then approve to add it to everyone's list." pad={false}>
      {rows.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">Nothing waiting.</div> : (
        <div className="divide-y divide-[#F0EAF7]">{rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
            <input defaultValue={r.name} onChange={(e) => setNames((n) => ({ ...n, [r.id]: e.target.value }))} className="min-w-[220px] flex-1 rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-1.5 text-[13.5px] font-semibold" />
            <span className="text-[12px] text-[var(--dim)]">{[r.state, r.country].filter(Boolean).join(", ")} · by {r.by ?? "a student"} · {r.students} on it</span>
            <Btn2 small onClick={() => void set(r, "approved")}>Approve</Btn2>
            <button onClick={() => void set(r, "rejected")} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#C2412D] ring-2 ring-[#E6DCF0]">Reject</button>
          </div>
        ))}</div>
      )}
    </Card>
  );
}
