"use client";

/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import { ListVideo, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import PostCard from "./PostCard";
import { deletePlaylist, getPlaylist, listPlaylists, savePlaylist, type Playlist } from "./live/socialData";
import { useApp, type Post } from "./store";
import { Btn, Sheet, TextField } from "./ui";

function Cover({ p }: { p: Playlist }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#7C4DDB] to-[#3b1f7a]">
      {p.cover_kind === "youtube" && p.cover && <img src={`https://i.ytimg.com/vi/${p.cover}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" />}
      <div className="absolute inset-y-0 right-0 flex w-2/5 flex-col items-center justify-center gap-1 bg-black/60 text-white"><ListVideo size={18} /><span className="text-[12px] font-bold">{p.count}</span></div>
    </div>
  );
}

/** Channel tab: a creator's playlists (public ones, or all of them on your own channel). */
export function PlaylistsTab({ ownerId, isMe }: { ownerId: string | undefined; isMe: boolean }) {
  const { posts, loadPostsByIds, setOverlay, flash } = useApp();
  const [list, setList] = useState<Playlist[] | null>(null);
  const [open, setOpen] = useState<{ id: string; title: string; description: string; is_public: boolean; owner_id: string; post_ids: string[] } | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; title: string; description: string; is_public: boolean } | null>(null);
  const reload = () => { if (ownerId) void listPlaylists(ownerId).then(setList); };
  useEffect(() => { if (ownerId) void listPlaylists(ownerId).then(setList); }, [ownerId]);

  async function openList(id: string) {
    const pl = await getPlaylist(id); if (!pl) return flash("This playlist isn't available");
    await loadPostsByIds(pl.post_ids); setOpen(pl);
  }
  async function saveEdit() {
    if (!edit) return;
    const r = await savePlaylist(edit.id, edit.title, edit.description, edit.is_public);
    if (r.error) return flash("Couldn't save the playlist");
    setEdit(null); reload(); if (open && edit.id === open.id) void openList(open.id);
  }
  const shown: Post[] = open ? open.post_ids.map((id) => posts.find((p) => p.id === id)).filter((p): p is Post => !!p) : [];

  if (!ownerId) return <p className="py-4 text-center text-[13px] text-[var(--dim)]">Playlists are for signed-in channels.</p>;
  return (
    <div className="space-y-3">
      {isMe && <Btn variant="ghost" onClick={() => setEdit({ id: null, title: "", description: "", is_public: true })}>+ New playlist</Btn>}
      {list === null ? <p className="text-[13px] text-[var(--dim)]">Loading...</p> : list.length === 0 ? <p className="py-2 text-center text-[13px] text-[var(--dim)]">{isMe ? "Group videos into playlists from the ⋯ menu on any video." : "No playlists yet."}</p> : (
        <div className="grid grid-cols-2 gap-3">{list.map((p) => (
          <button key={p.id} onClick={() => void openList(p.id)} className="text-left active:scale-[0.98]">
            <Cover p={p} />
            <div className="mt-1.5 flex items-center gap-1 text-[13px] font-bold leading-snug">{!p.is_public && <Lock size={12} className="shrink-0 text-[var(--dim)]" />}<span className="line-clamp-2">{p.title}</span></div>
            <div className="text-[11.5px] text-[var(--dim)]">{p.count} item{p.count === 1 ? "" : "s"}</div>
          </button>
        ))}</div>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open && (
          <div className="space-y-3">
            {open.description && <p className="text-[13px] leading-snug text-[var(--dim)]">{open.description}</p>}
            {isMe && <div className="flex gap-3"><button onClick={() => setEdit({ id: open.id, title: open.title, description: open.description, is_public: open.is_public })} className="text-[12.5px] font-bold text-[var(--study)]">Edit</button><button onClick={async () => { if (!confirm(`Delete "${open.title}"? The videos stay; only the playlist goes.`)) return; await deletePlaylist(open.id); setOpen(null); reload(); }} className="text-[12.5px] font-bold text-[var(--help)]">Delete playlist</button></div>}
            {shown.length === 0 ? <p className="text-[13px] text-[var(--dim)]">Empty for now.</p> : <div className="space-y-4">{shown.map((p) => <PostCard key={p.id} post={p} onProfile={(id) => { setOpen(null); setOverlay({ t: "profile", id }); }} />)}</div>}
          </div>
        )}
      </Sheet>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit playlist" : "New playlist"}>
        {edit && (
          <div className="space-y-3">
            <TextField value={edit.title} onChange={(v) => setEdit({ ...edit, title: v.slice(0, 80) })} placeholder="Title, e.g. CSC 201 revision" />
            <TextField multiline value={edit.description} onChange={(v) => setEdit({ ...edit, description: v.slice(0, 500) })} placeholder="What's in it (optional)" />
            <div className="flex gap-2">{[true, false].map((pub) => (<button key={String(pub)} onClick={() => setEdit({ ...edit, is_public: pub })} className={`flex-1 rounded-xl border-2 py-2 text-[12.5px] font-bold ${edit.is_public === pub ? "border-[var(--study)] bg-[var(--study-soft)] text-[var(--study)]" : "border-[var(--line)] text-[var(--dim)]"}`}>{pub ? "Public on my channel" : "Private"}</button>))}</div>
            <Btn variant="study" disabled={!edit.title.trim()} onClick={() => void saveEdit()}>Save</Btn>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** Your own channel only: everything you've liked, newest first. */
export function LikedTab() {
  const { posts, loadLiked, setOverlay } = useApp();
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => { void loadLiked().then(setIds); }, [loadLiked]);
  const shown = (ids ?? []).map((id) => posts.find((p) => p.id === id)).filter((p): p is Post => !!p && p.liked);
  if (ids === null) return <p className="text-[13px] text-[var(--dim)]">Loading...</p>;
  return shown.length === 0 ? <p className="py-2 text-center text-[13px] text-[var(--dim)]">Videos and posts you like show up here. Only you can see this list.</p>
    : <div className="space-y-4"><p className="text-[11.5px] text-[var(--dim)]">Only you can see this list.</p>{shown.map((p) => <PostCard key={p.id} post={p} onProfile={(id) => setOverlay({ t: "profile", id })} />)}</div>;
}
