"use client";

import { Check, Lock, Pin, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { myPlaylistsFor, playlistToggle, savePlaylist } from "./live/socialData";
import { useApp, type Post } from "./store";
import { Btn, Sheet } from "./ui";

/** The "⋯" sheet on a post: save to a playlist, pin to your channel, delete. */
export function PostMenu({ post, open, onClose }: { post: Post; open: boolean; onClose: () => void }) {
  const { flash, setPinned, deletePost, auth } = useApp();
  const [mine, setMine] = useState<{ id: string; title: string; is_public: boolean; has: boolean }[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const isMe = post.authorId === "me";
  const canPlaylist = auth.status === "in" && !!post.remote;
  useEffect(() => { if (open && canPlaylist) void myPlaylistsFor(post.id).then(setMine); }, [open, canPlaylist, post.id]);

  async function toggle(id: string, on: boolean) {
    const err = await playlistToggle(id, post.id, on);
    if (err) return flash("Couldn't update the playlist");
    setMine((m) => m?.map((x) => (x.id === id ? { ...x, has: on } : x)) ?? null);
    flash(on ? "Saved to playlist" : "Removed from playlist");
  }
  async function create() {
    setBusy(true);
    const r = await savePlaylist(null, newTitle.trim(), "", true);
    if (r.id) await playlistToggle(r.id, post.id, true);
    setBusy(false);
    if (!r.id) return flash("Couldn't create the playlist");
    setNewTitle(""); flash(`Saved to "${newTitle.trim()}"`); setMine(await myPlaylistsFor(post.id));
  }
  async function pin() {
    const on = !post.pinnedAt;
    const err = await setPinned(post.id, on);
    if (err === "max_pins") return flash("You can pin up to 3 posts. Unpin one first.");
    if (err) return flash("Couldn't update the pin");
    flash(on ? "Pinned to the top of your channel" : "Unpinned"); onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={post.title}>
      <div className="space-y-4">
        {canPlaylist && (
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Save to playlist</div>
            <div className="space-y-1.5">
              {mine === null ? <p className="text-[13px] text-[var(--dim)]">Loading...</p> : mine.map((pl) => (
                <button key={pl.id} onClick={() => void toggle(pl.id, !pl.has)} className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-[var(--line)]">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${pl.has ? "border-[var(--study)] bg-[var(--study)] text-white" : "border-[var(--line)]"}`}>{pl.has && <Check size={13} strokeWidth={3} />}</span>
                  <span className="flex-1 truncate text-[13.5px] font-semibold">{pl.title}</span>{!pl.is_public && <Lock size={13} className="text-[var(--dim)]" />}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value.slice(0, 80))} placeholder="New playlist, e.g. CSC 201 revision" className="min-w-0 flex-1 rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13.5px] outline-none" />
              <button disabled={busy || !newTitle.trim()} onClick={() => void create()} className="shrink-0 rounded-xl bg-[var(--ink)] px-3 text-[13px] font-semibold text-[var(--paper)] disabled:opacity-40"><Plus size={16} /></button>
            </div>
          </div>
        )}
        {isMe && post.remote && <Btn variant="ghost" onClick={() => void pin()}><span className="inline-flex items-center gap-2"><Pin size={15} /> {post.pinnedAt ? "Unpin from my channel" : "Pin to the top of my channel"}</span></Btn>}
        {isMe && <button onClick={() => { if (confirm("Delete this post?")) { deletePost(post.id); onClose(); } }} className="flex w-full items-center justify-center gap-2 py-2 text-[14px] font-semibold text-[var(--help)]"><Trash2 size={15} /> Delete post</button>}
        {!canPlaylist && !isMe && <p className="text-[13px] text-[var(--dim)]">Sign in to save videos to playlists.</p>}
      </div>
    </Sheet>
  );
}
