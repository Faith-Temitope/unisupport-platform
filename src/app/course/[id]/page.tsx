"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Data = {
  course: { code: string; name: string; color: string | null; owner: string | null };
  role: "owner" | "edit" | "view";
  notes: { id: string; title: string; body: string; category: string | null; created_at: string }[];
  files: { name: string; kind: string; category: string | null; url: string | null }[];
};

/** A course someone shared with you in a chat. View it, or add notes if they made you a collaborator. */
export default function SharedCoursePage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [busy, setBusy] = useState(false);

  const load = useCallback(() => fetch(`/api/courses/${id}`).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setD(j as Data); setErr(null); } else setErr(j.error ?? "error");
  }), [id]);
  useEffect(() => { void load(); }, [load]);

  async function addNote() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    const { error } = await createClient().rpc("grant_add_note", { p_course: id, p_title: title.trim(), p_body: body });
    setBusy(false);
    if (error) { alert("Couldn't add the note"); return; }
    setTitle(""); setBody(""); void load();
  }

  const shell = "min-h-screen bg-[#F4EFF8] px-4 py-6 text-[#1E1428]";
  if (err) return (
    <main className={shell}><div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-center">
      <h1 className="text-[20px] font-bold">{err === "sign_in_required" ? "Sign in to open this course" : "You don't have access to this course"}</h1>
      <p className="mt-2 text-[14px] text-[#6E6480]">{err === "sign_in_required" ? "Open Birdie, sign in, then tap the link again." : "Ask the person who shared it to share it with you again."}</p>
      <a href="/prototype" className="mt-4 inline-block rounded-xl bg-[#A63FBD] px-4 py-2.5 text-[14px] font-semibold text-white">Open Birdie</a>
    </div></main>
  );
  if (!d) return <main className={shell}><div className="py-20 text-center text-[14px] text-[#6E6480]">Loading course...</div></main>;
  return (
    <main className={shell}>
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-2xl bg-white p-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#6E6480]">{d.role === "owner" ? "Your course" : d.role === "edit" ? "Shared with you · you can add notes" : "Shared with you · view only"}</div>
          <h1 className="mt-1 text-[22px] font-bold leading-tight">{d.course.code} · {d.course.name}</h1>
          {d.course.owner && d.role !== "owner" && <div className="text-[13px] text-[#6E6480]">From {d.course.owner}</div>}
        </div>

        <section className="rounded-2xl bg-white p-5">
          <h2 className="text-[15px] font-bold">Files ({d.files.length})</h2>
          {d.files.length === 0 ? <p className="mt-1 text-[13px] text-[#6E6480]">No files.</p> : (
            <ul className="mt-2 divide-y divide-[#F0EAF7]">{d.files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-[14px]"><span className="truncate">{f.name}</span>{f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-semibold text-[#A63FBD]">Open</a> : <span className="text-[12px] text-[#6E6480]">Unavailable</span>}</li>
            ))}</ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5">
          <h2 className="text-[15px] font-bold">Notes ({d.notes.length})</h2>
          <div className="mt-2 space-y-2">{d.notes.map((n) => (
            <div key={n.id} className="rounded-xl bg-[#F8F4FB]">
              <button onClick={() => setOpen(open === n.id ? null : n.id)} className="w-full px-3 py-2.5 text-left text-[14px] font-semibold">{n.title}{n.category ? <span className="ml-2 text-[11.5px] font-medium text-[#6E6480]">{n.category}</span> : null}</button>
              {open === n.id && <p className="whitespace-pre-line px-3 pb-3 text-[13.5px] leading-relaxed">{n.body}</p>}
            </div>
          ))}</div>
        </section>

        {(d.role === "edit" || d.role === "owner") && (
          <section className="space-y-2 rounded-2xl bg-white p-5">
            <h2 className="text-[15px] font-bold">Add a note</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border-2 border-[#E6DCF0] px-3 py-2 text-[14px] outline-none focus:border-[#A63FBD]" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the note..." className="min-h-[120px] w-full rounded-xl border-2 border-[#E6DCF0] px-3 py-2 text-[14px] outline-none focus:border-[#A63FBD]" />
            <button disabled={busy || !title.trim() || !body.trim()} onClick={() => void addNote()} className="w-full rounded-xl bg-[#A63FBD] py-2.5 text-[14px] font-semibold text-white disabled:opacity-40">{busy ? "Adding..." : "Add note"}</button>
          </section>
        )}
      </div>
    </main>
  );
}
