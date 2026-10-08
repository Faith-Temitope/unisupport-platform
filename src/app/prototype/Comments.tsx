"use client";

import { CornerDownRight, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ago, initials } from "./PostCard";
import { addComment, deleteComment, listComments, type Comment } from "./live/socialData";
import { logPostEvent } from "./live/recData";
import { useApp, type Post } from "./store";
import { Avatar, Sheet } from "./ui";

/** YouTube-style: a small card under the video with the count and newest comment; tap for all of them. */
export function CommentsPreview({ post, onProfile }: { post: Post; onProfile: (id: string) => void }) {
  const { auth } = useApp();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Comment[] | null>(null);
  const reload = useCallback(() => listComments(post.id).then(setList), [post.id]);
  useEffect(() => { if (post.remote) void reload(); }, [post.remote, reload]);
  if (!post.remote) return null;
  const count = list?.length ?? post.comments ?? 0;
  const latest = list?.length ? list[list.length - 1] : null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="mx-3 mt-4 block w-[calc(100%-1.5rem)] rounded-xl bg-[var(--paper-dim)] p-3 text-left active:scale-[0.99]">
        <div className="text-[13.5px] font-bold">Comments <span className="font-medium text-[var(--dim)]">{count}</span></div>
        {latest ? (
          <div className="mt-1.5 flex items-start gap-2"><Avatar initials={initials(latest.name)} color={latest.color} size={22} /><span className="line-clamp-2 text-[12.5px] leading-snug">{latest.body}</span></div>
        ) : <div className="mt-1 text-[12.5px] text-[var(--dim)]">{auth.status === "in" ? "Be the first to comment" : "Sign in to comment"}</div>}
      </button>
      <CommentsSheet post={post} open={open} onClose={() => setOpen(false)} list={list} reload={reload} onProfile={(id) => { setOpen(false); onProfile(id); }} />
    </>
  );
}

function CommentsSheet({ post, open, onClose, list, reload, onProfile }: { post: Post; open: boolean; onClose: () => void; list: Comment[] | null; reload: () => Promise<void>; onProfile: (id: string) => void }) {
  const { auth, flash, setAuthOpen } = useApp();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const top = (list ?? []).filter((c) => !c.parent_id).reverse();
  const replies = (id: string) => (list ?? []).filter((c) => c.parent_id === id);

  async function send() {
    if (auth.status !== "in") { setAuthOpen(true); return; }
    const body = draft.trim(); if (!body || busy) return;
    setBusy(true);
    const r = await addComment(post.id, body, replyTo?.id);
    setBusy(false);
    if (r.error) return flash(r.error);
    setDraft(""); setReplyTo(null); void logPostEvent(post.id, "comment"); await reload();
  }
  async function remove(c: Comment) { await deleteComment(c.id); await reload(); flash("Comment deleted"); }
  const me = (c: Comment) => (c.mine ? "me" : c.user_id);

  const row = (c: Comment, child = false) => (
    <div key={c.id} className={`flex gap-2.5 ${child ? "ml-9 mt-2.5" : ""}`}>
      <button onClick={() => !c.mine && onProfile(me(c))} className="shrink-0"><Avatar initials={initials(c.name)} color={c.color} size={child ? 24 : 32} /></button>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] text-[var(--dim)]"><button onClick={() => !c.mine && onProfile(me(c))} className="font-semibold text-[var(--text)]">{c.mine ? "You" : c.name}</button> · {ago(Date.parse(c.created_at))}</div>
        <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-snug">{c.body}</p>
        <div className="mt-1 flex gap-4 text-[11.5px] font-semibold text-[var(--dim)]">
          {!child && <button onClick={() => setReplyTo(c)}>Reply</button>}
          {c.mine && <button onClick={() => void remove(c)} className="inline-flex items-center gap-1"><Trash2 size={11} /> Delete</button>}
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={`Comments${list ? ` · ${list.length}` : ""}`}>
      <div className="max-h-[52vh] space-y-4 overflow-y-auto pb-2">
        {list === null ? <div className="py-6 text-center text-[13px] text-[var(--dim)]">Loading...</div>
          : top.length === 0 ? <div className="py-6 text-center text-[13px] text-[var(--dim)]">No comments yet. Start the conversation.</div>
          : top.map((c) => (<div key={c.id}>{row(c)}{replies(c.id).map((r) => row(r, true))}</div>))}
      </div>
      {replyTo && <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--dim)]"><CornerDownRight size={13} /> Replying to {replyTo.mine ? "yourself" : replyTo.name} <button onClick={() => setReplyTo(null)} className="ml-auto font-semibold">Cancel</button></div>}
      <div className="mt-2 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} maxLength={2000} placeholder={auth.status === "in" ? "Add a comment..." : "Sign in to comment"} className="min-w-0 flex-1 rounded-full bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none" />
        <button onClick={() => void send()} disabled={busy || (auth.status === "in" && !draft.trim())} aria-label="Post comment" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--uni)] text-white active:scale-90 disabled:opacity-40"><Send size={17} /></button>
      </div>
    </Sheet>
  );
}
