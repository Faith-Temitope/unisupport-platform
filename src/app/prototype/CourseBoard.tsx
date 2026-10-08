"use client";

import { Megaphone, Paperclip, Pin, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { openUrl, signedUrl } from "./live/helpData";
import { offlineUrl } from "./offline";
import { ago } from "./PostCard";
import { useApp } from "./store";
import { Btn, Empty, Sheet, TextField } from "./ui";

type BoardPost = { id: string; body: string; pinned: boolean; created_at: string; author: string; mine: boolean; file: { id: string; name: string; kind: string; path: string } | null };

/**
 * A course's notice board: the owner posts announcements ("Test next week", "Everyone fill this")
 * and can attach a file that's already in the course, so nobody re-uploads it. Everyone who joined
 * the shared course sees it and gets a notification.
 */
export function CourseBoard({ sharedId, isOwner, courseId }: { sharedId: string; isOwner: boolean; courseId: string }) {
  const { flash } = useApp();
  const [posts, setPosts] = useState<BoardPost[] | null>(null);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState(false);
  const [picker, setPicker] = useState(false);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("course_board", { p_shared: sharedId });
    setPosts(error ? [] : ((data ?? []) as BoardPost[]));
  }, [sharedId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    if (!picker) return;
    void createClient().from("course_files").select("id,name").eq("course_id", courseId).order("created_at", { ascending: false }).then(({ data }) => setFiles((data ?? []) as { id: string; name: string }[]));
  }, [picker, courseId]);

  async function post() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const { error } = await createClient().rpc("post_to_board", { p_shared: sharedId, p_body: draft.trim(), p_file: file?.id ?? null, p_pinned: pin });
    setBusy(false);
    if (error) return flash("Couldn't post that");
    setDraft(""); setFile(null); setPin(false); flash("Posted. Everyone in the course is notified."); void load();
  }
  async function update(p: BoardPost, change: { pinned?: boolean; del?: boolean }) {
    await createClient().rpc("board_post_update", { p_id: p.id, p_pinned: change.pinned ?? null, p_delete: !!change.del });
    void load();
  }
  async function openFile(f: NonNullable<BoardPost["file"]>) {
    const url = (await offlineUrl(`file:${f.path}`)) ?? (await signedUrl("study-files", f.path));
    if (url) openUrl(url); else flash("Couldn't open that file");
  }

  return (
    <div className="space-y-3">
      {isOwner && (
        <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-white p-3">
          <TextField multiline value={draft} onChange={setDraft} placeholder="Announce something to the class, e.g. Test next Tuesday on chapters 3 and 4" />
          {file && <div className="flex items-center gap-2 rounded-xl bg-[var(--paper-dim)] px-3 py-2 text-[13px]"><Paperclip size={14} className="text-[var(--study)]" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button onClick={() => setFile(null)} aria-label="Remove file"><X size={14} /></button></div>}
          <div className="flex items-center gap-2">
            <button onClick={() => setPicker(true)} className="flex items-center gap-1.5 rounded-xl bg-[var(--paper-dim)] px-3 py-2 text-[12.5px] font-semibold"><Paperclip size={14} /> Attach a course file</button>
            <button onClick={() => setPin((p) => !p)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold ${pin ? "bg-[var(--study)] text-white" : "bg-[var(--paper-dim)]"}`}><Pin size={14} /> Pin</button>
            <button disabled={!draft.trim() || busy} onClick={() => void post()} className="ml-auto rounded-xl bg-[var(--ink)] px-4 py-2 text-[13px] font-semibold text-[var(--paper)] disabled:opacity-40">{busy ? "Posting..." : "Post"}</button>
          </div>
        </div>
      )}
      {posts === null ? <div className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</div>
        : posts.length === 0 ? <Empty icon={<Megaphone size={20} />} title="No announcements yet" text={isOwner ? "Post tests, deadlines and anything your class should see. Attach a file from Materials instead of re-sending it." : "Announcements from the course owner show up here."} />
        : posts.map((p) => (
          <div key={p.id} className={`rounded-2xl border bg-white p-3.5 ${p.pinned ? "border-[var(--study)]" : "border-[var(--line)]"}`}>
            <div className="mb-1 flex items-center gap-2 text-[11.5px] text-[var(--dim)]">{p.pinned && <span className="flex items-center gap-1 font-bold text-[var(--study)]"><Pin size={11} /> Pinned</span>}<span>{p.author} · {ago(Date.parse(p.created_at))}</span>
              {isOwner && <span className="ml-auto flex gap-3"><button onClick={() => void update(p, { pinned: !p.pinned })} aria-label={p.pinned ? "Unpin" : "Pin"}><Pin size={13} /></button><button onClick={() => { if (confirm("Delete this announcement?")) void update(p, { del: true }); }} aria-label="Delete"><Trash2 size={13} /></button></span>}
            </div>
            <p className="whitespace-pre-line text-[14px] leading-snug">{p.body}</p>
            {p.file && <button onClick={() => void openFile(p.file!)} className="mt-2 flex w-full items-center gap-2 rounded-xl bg-[var(--study-soft)] px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--study)]"><Paperclip size={14} /><span className="truncate">{p.file.name}</span></button>}
          </div>
        ))}
      <Sheet open={picker} onClose={() => setPicker(false)} title="Attach a file from this course">
        {files.length === 0 ? <p className="text-[13px] text-[var(--dim)]">No files in this course yet. Add them in Materials first.</p> : (
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">{files.map((f) => (
            <button key={f.id} onClick={() => { setFile(f); setPicker(false); }} className="flex w-full items-center gap-2.5 rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-left text-[13.5px] font-semibold"><Paperclip size={15} className="shrink-0 text-[var(--study)]" /><span className="truncate">{f.name}</span></button>
          ))}</div>
        )}
        <p className="mt-2 text-[11.5px] text-[var(--dim)]">Attaching a file shares it with everyone in the course.</p>
        <div className="mt-2"><Btn variant="ghost" onClick={() => setPicker(false)}>Cancel</Btn></div>
      </Sheet>
    </div>
  );
}
