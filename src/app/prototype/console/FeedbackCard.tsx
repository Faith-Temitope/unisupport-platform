"use client";

// What students think of Birdie's answers, and the start of Birdie's own training data.
// Only items students chose to share carry any text, and never a name or email.
import { Download, ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Btn2, Card, Pill } from "../staff/kit";

type Item = { id: string; rating: 1 | -1 | null; reason: string | null; question: string | null; answer: string | null; correction: string | null; course_code: string | null; brain: string | null; reviewed: boolean; created_at: string };
type Data = { by_brain: { brain: string | null; up: number; down: number }[]; reasons: { reason: string; n: number }[]; shared_total: number; items: Item[] };

export function FeedbackCard({ show }: { show: (m: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [onlyCorrections, setOnlyCorrections] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("admin_ai_feedback", { p_limit: 300 });
    if (error) show(error.message); else setD(data as Data);
  }, [show]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function review(it: Item) {
    const { error } = await createClient().rpc("admin_review_ai_feedback", { p_id: it.id, p_reviewed: !it.reviewed });
    if (error) return show(error.message);
    void load();
  }
  // Training file: the student's question and THEIR corrected answer (human-written). AI answers are
  // left out on purpose: Google, OpenAI and Anthropic forbid training a competing model on their output.
  function exportJsonl() {
    const rows = (d?.items ?? []).filter((i) => i.reviewed && i.question && i.correction);
    if (!rows.length) return show("Nothing to export yet. Mark corrections as reviewed first.");
    const text = rows.map((i) => JSON.stringify({ messages: [{ role: "user", content: i.question }, { role: "assistant", content: i.correction }], course: i.course_code })).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/jsonl" }));
    a.download = `birdie-training-${new Date().toISOString().slice(0, 10)}.jsonl`; a.click();
    show(`Exported ${rows.length} reviewed corrections`);
  }

  const items = (d?.items ?? []).filter((i) => !onlyCorrections || i.correction);
  return (
    <Card title="Answer feedback" sub="Last 30 days of 👍/👎 on Birdie's answers. Text appears only when a student chose to share it, with no name attached." pad={false}
      right={<Btn2 small tone="ghost" onClick={exportJsonl}><Download size={14} /> Training file</Btn2>}>
      {!d ? <div className="p-6 text-center text-sm text-[var(--dim)]">Loading...</div> : (
        <div>
          <div className="flex flex-wrap gap-3 border-b border-[#F0EAF7] px-5 py-3 text-[13px]">
            {d.by_brain.length === 0 && <span className="text-[var(--dim)]">No ratings yet.</span>}
            {d.by_brain.map((b) => {
              const pct = b.up + b.down ? Math.round((b.up / (b.up + b.down)) * 100) : 0;
              return <span key={b.brain ?? "?"} className="rounded-xl bg-[#F8F4FB] px-3 py-1.5"><b className="capitalize">{b.brain ?? "unknown"}</b> · {pct}% helpful <span className="text-[var(--dim)]">({b.up} 👍 {b.down} 👎)</span></span>;
            })}
            <span className="rounded-xl bg-[#F8F4FB] px-3 py-1.5">{d.shared_total} shared for training</span>
          </div>
          {d.reasons.length > 0 && <div className="flex flex-wrap gap-2 border-b border-[#F0EAF7] px-5 py-3 text-[12.5px]"><span className="font-semibold">Why 👎:</span>{d.reasons.map((r) => <Pill key={r.reason} tone="red">{r.reason} · {r.n}</Pill>)}</div>}
          <label className="flex items-center gap-2 px-5 py-2.5 text-[12.5px] text-[var(--dim)]"><input type="checkbox" checked={onlyCorrections} onChange={(e) => setOnlyCorrections(e.target.checked)} /> Only show items with a correction</label>
          {items.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No shared feedback yet.</div> : (
            <div className="max-h-[640px] divide-y divide-[#F0EAF7] overflow-y-auto">{items.map((it) => (
              <div key={it.id} className="space-y-1.5 px-5 py-3 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  {it.rating === 1 ? <ThumbsUp size={14} className="text-[#2FA36B]" /> : <ThumbsDown size={14} className="text-[#E5484D]" />}
                  {it.reason && <Pill tone="red">{it.reason}</Pill>}
                  {it.course_code && <Pill tone="purple">{it.course_code}</Pill>}
                  <span className="text-[12px] capitalize text-[var(--dim)]">{it.brain} · {new Date(it.created_at).toLocaleString()}</span>
                  <span className="ml-auto"><Btn2 small tone={it.reviewed ? "ghost" : "dark"} onClick={() => void review(it)}>{it.reviewed ? "Reviewed ✓" : "Mark reviewed"}</Btn2></span>
                </div>
                {it.question && <div><b>Q:</b> {it.question}</div>}
                {it.answer && <details className="text-[var(--dim)]"><summary className="cursor-pointer text-[12.5px]">Birdie&apos;s answer</summary><div className="mt-1 whitespace-pre-line">{it.answer}</div></details>}
                {it.correction && <div className="rounded-lg bg-[#EAF7F0] px-3 py-2"><b>Student&apos;s correction:</b> <span className="whitespace-pre-line">{it.correction}</span></div>}
              </div>
            ))}</div>
          )}
        </div>
      )}
    </Card>
  );
}
