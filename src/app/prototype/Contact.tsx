"use client";

// A person's profile, WeChat style: name, Birdie ID, region; Edit Contact (remark), Privacy (Chats,
// Moments, etc. / Chats Only, Hide My Posts, Hide Their Posts), Moments, Channels, More, Send Message.
import { useBackLayer } from "./nav";
import { Check, MessageCircle, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { contactInfo, friendRequest, momentMediaUrl, setContactPrefs, type ContactInfo } from "./live/chatData";
import { reportThing } from "./live/socialData";
import MomentsScreen from "./Moments";
import { useApp } from "./store";
import { Cell, CellGroup, SqAvatar, Switch, WeHeader } from "./we";

export function MomentThumb({ path, size = 56 }: { path: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let on = true; void momentMediaUrl(path).then((u) => { if (on) setUrl(u); }); return () => { on = false; }; }, [path]);
  return <span className="block shrink-0 overflow-hidden bg-[var(--we-sep)]" style={{ width: size, height: size }}>{url && <img src={url} alt="" className="h-full w-full object-cover" />}</span>;
}

type Sub = null | "privacy" | "edit" | "more" | "moments";

export default function Contact({ id, onBack }: { id: string; onBack: () => void }) {
  const { openDm, setOverlay, flash } = useApp();
  const [c, setC] = useState<ContactInfo | null | undefined>(undefined);
  const [sub, setSub] = useState<Sub>(null);
  useBackLayer(!!sub, () => setSub(null));
  const load = useCallback(() => contactInfo(id).then(setC), [id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  if (c === undefined) return <div className="flex flex-1 flex-col bg-[var(--we-bg)]"><WeHeader onBack={onBack} /></div>;
  if (c === null) return <div className="flex flex-1 flex-col bg-[var(--we-bg)]"><WeHeader onBack={onBack} /><p className="py-10 text-center text-[14px] text-[var(--we-sub)]">This account isn&apos;t available.</p></div>;

  // Their Moments open inside the profile, so Back comes straight back here.
  if (sub === "moments") return <div className="flex min-h-0 flex-1 flex-col"><MomentsScreen userId={c.id} onBack={() => setSub(null)} /></div>;
  if (sub === "privacy") return <Privacy c={c} onBack={() => { setSub(null); void load(); }} />;
  if (sub === "edit") return <EditRemark c={c} onBack={() => { setSub(null); void load(); }} />;
  if (sub === "more") return (
    <div className="flex flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={() => setSub(null)} title="Profile" />
      <CellGroup gap={false}>
        <Cell label="School" value={c.school ?? "Not set"} chevron={false} />
        <Cell label="Course of study" value={c.program ?? "Not set"} chevron={false} />
        <Cell label="Level" value={c.level ?? "Not set"} chevron={false} />
        <Cell label="What's Up" value={c.bio ?? ""} chevron={false} />
      </CellGroup>
      {!c.is_me && <CellGroup><Cell label="Report" onClick={async () => { const r = prompt(`Why are you reporting ${c.name}?`); if (r === null) return; const err = await reportThing("account", c.id, r || undefined); flash(err ?? "Thanks. The Birdie team will look at it."); }} /></CellGroup>}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} transparent />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        <div className="flex gap-4 bg-[var(--we-cell)] px-5 pb-6 pt-3">
          <SqAvatar name={c.display_name} color={c.color} size={64} />
          <div className="min-w-0 pt-0.5">
            <div className="truncate text-[20px] font-semibold text-[var(--we-text)]">{c.display_name}</div>
            {c.remark && <div className="mt-1 text-[14px] text-[var(--we-sub)]">Name: {c.name}</div>}
            {c.handle && <div className="mt-1 text-[14px] text-[var(--we-sub)]">Birdie ID: {c.handle}</div>}
            {c.region && <div className="mt-1 text-[14px] text-[var(--we-sub)]">Region: {c.region}</div>}
          </div>
        </div>
        {!c.is_me && (
          <CellGroup>
            <Cell label="Edit Contact" value={c.remark ? "" : "Remark"} onClick={() => setSub("edit")} />
            <Cell label="Privacy" onClick={() => setSub("privacy")} />
          </CellGroup>
        )}
        <CellGroup>
          <Cell label="Moments" right={<Thumbs>{c.moments.map((p) => <MomentThumb key={p} path={p} />)}</Thumbs>}
            onClick={() => setSub("moments")} />
          <Cell label="Channels" right={<Thumbs>{c.videos.map((v) => v.youtube_id
            ? <img key={v.id} src={`https://i.ytimg.com/vi/${v.youtube_id}/default.jpg`} alt="" className="h-14 w-14 object-cover" />
            : <span key={v.id} className="flex h-14 w-14 items-center justify-center bg-[var(--we-sep)] p-1 text-center text-[9px] leading-tight text-[var(--we-sub)]">{v.title}</span>)}</Thumbs>}
            onClick={() => setOverlay({ t: "profile", id: c.is_me ? "me" : c.id })} />
          <Cell label="More" onClick={() => setSub("more")} />
        </CellGroup>
        {!c.is_me && !c.is_friend && c.friend_status && c.friend_status !== "friends" && (
          <CellGroup>
            <button disabled={c.friend_status === "sent"} onClick={async () => { const r = await friendRequest(c.id); flash(r.data === "accepted" ? `You and ${c.display_name} are now friends` : r.error ? "Couldn't send the request" : "Friend request sent"); void load(); }}
              className="flex w-full items-center justify-center gap-2 py-4 text-[16px] font-medium text-[var(--we-link)] active:bg-black/5 disabled:text-[var(--we-sub)]">
              <UserPlus size={20} /> {c.friend_status === "sent" ? "Friend Request Sent" : c.friend_status === "received" ? "Accept Friend Request" : "Add Friend"}
            </button>
          </CellGroup>
        )}
        {!c.is_me && (
          <CellGroup>
            <button onClick={() => void openDm(c.id)} className="flex w-full items-center justify-center gap-2 py-4 text-[16px] font-medium text-[var(--we-link)] active:bg-black/5"><MessageCircle size={20} /> Send Message</button>
          </CellGroup>
        )}
        {!c.is_me && !c.is_friend && <p className="px-6 pt-3 text-center text-[12.5px] leading-snug text-[var(--we-sub)]">Friends see each other&apos;s Moments. Add them, or you become friends once you&apos;ve both sent a message.</p>}
      </div>
    </div>
  );
}

const Thumbs = ({ children }: { children: ReactNode }) => <span className="flex max-w-[60%] justify-end gap-1.5 overflow-hidden">{children}</span>;

function Privacy({ c, onBack }: { c: ContactInfo; onBack: () => void }) {
  const [p, setP] = useState(c.prefs);
  async function set(next: Partial<typeof p>) {
    const merged = { ...p, ...next }; setP(merged);
    await setContactPrefs(c.id, { chatsOnly: merged.chats_only, hideMine: merged.hide_my_posts, hideTheirs: merged.hide_their_posts });
  }
  return (
    <div className="flex flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Privacy" />
      <div className="px-4 pb-1.5 pt-3 text-[13px] text-[var(--we-sub)]">Set Privacy</div>
      <CellGroup gap={false}>
        <Cell label="Chats, Moments, etc." right={!p.chats_only ? <Check size={20} className="text-[var(--we-accent)]" /> : undefined} chevron={false} onClick={() => void set({ chats_only: false })} />
        <Cell label="Chats Only" right={p.chats_only ? <Check size={20} className="text-[var(--we-accent)]" /> : undefined} chevron={false} onClick={() => void set({ chats_only: true })} />
      </CellGroup>
      {!p.chats_only && (
        <>
          <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">Moments History</div>
          <CellGroup gap={false}>
            <Cell label="Hide My Posts" right={<Switch on={p.hide_my_posts} onChange={(v) => void set({ hide_my_posts: v })} label="Hide my posts" />} />
            <Cell label="Hide Their Posts" right={<Switch on={p.hide_their_posts} onChange={(v) => void set({ hide_their_posts: v })} label="Hide their posts" />} />
          </CellGroup>
        </>
      )}
    </div>
  );
}

function EditRemark({ c, onBack }: { c: ContactInfo; onBack: () => void }) {
  const [v, setV] = useState(c.remark ?? "");
  return (
    <div className="flex flex-1 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Set Remark" right={<button onClick={async () => { await setContactPrefs(c.id, { remark: v.trim() }); onBack(); }} className="mr-1 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white">Done</button>} />
      <div className="px-4 pb-1.5 pt-3 text-[13px] text-[var(--we-sub)]">Remark</div>
      <div className="bg-[var(--we-cell)] px-4 py-3"><input autoFocus value={v} onChange={(e) => setV(e.target.value.slice(0, 40))} placeholder={c.name} className="w-full bg-transparent text-[16px] text-[var(--we-text)] outline-none" /></div>
      <p className="px-4 pt-2 text-[13px] text-[var(--we-sub)]">Only you see this name, in your chats and Moments.</p>
    </div>
  );
}
