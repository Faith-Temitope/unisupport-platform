"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Backpack, FileText, MessageCircle, Play, StickyNote, X } from "lucide-react";
import Buddy from "@/components/brand/Buddy";
import { initials } from "./PostCard";
import { useApp, type NewPocketItem, type PocketItem } from "./store";
import { Sheet } from "./ui";

const ICON = { file: FileText, video: Play, chat: MessageCircle, helpchat: MessageCircle, note: StickyNote } as const;

/** Opens whatever the buddy is holding, from any screen. */
export function usePocketOpener() {
  const { courses, posts, watch, loadPostsByIds, setOverlay, goHelp, goStudy, flash, setPocketOpen, openFile } = useApp();
  return async (it: PocketItem) => {
    setPocketOpen(false);
    if (it.kind === "video") {
      if (!posts.some((p) => p.id === it.postId)) await loadPostsByIds([it.postId]);
      watch(it.postId); return;
    }
    if (it.kind === "chat") { setOverlay({ t: "thread", id: it.personId }); return; }
    if (it.kind === "helpchat") { setOverlay(null); goHelp({ mode: "full", courseId: null, sessionId: it.sessionId }); return; }
    if (it.kind === "note") { setOverlay(null); goStudy({ courseId: it.courseId, tab: "notes" }); return; }
    const f = courses.find((c) => c.id === it.courseId)?.files.find((x) => x.id === it.fileId);
    if (!f) return flash("That file isn't in your course anymore");
    if (f.storagePath || f.url) return openFile({ name: f.name, path: f.storagePath, url: f.url });
    flash("Couldn't open that file. Check your connection.");
  };
}

/** What your buddy is holding. Tap to open, x to take it back. */
export function PocketSheet() {
  const { pocket, pocketRemove, pocketOpen, setPocketOpen } = useApp();
  const open = usePocketOpener();
  return (
    <Sheet open={pocketOpen} onClose={() => setPocketOpen(false)} title="Your buddy is holding">
      {pocket.length === 0 ? (
        <p className="text-[13px] leading-snug text-[var(--dim)]">Nothing yet. Tap the backpack on a file, a video or a chat and your buddy keeps it here, ready to open from anywhere.</p>
      ) : (
        <div className="space-y-1.5">{pocket.map((it) => { const Icon = ICON[it.kind]; return (
          <div key={it.id} className="flex items-center gap-3 rounded-xl bg-[var(--paper-dim)] px-3 py-2.5">
            <Icon size={16} className="shrink-0 text-[var(--birdie)]" />
            <button onClick={() => void open(it)} className="min-w-0 flex-1 text-left"><div className="truncate text-[13.5px] font-semibold">{it.title}</div><div className="text-[11px] text-[var(--dim)]">{it.kind === "helpchat" ? "Unisupport chat" : it.kind === "chat" ? "Chat" : it.kind === "video" ? "Video" : it.kind === "note" ? "Note" : "File"}</div></button>
            <button onClick={() => pocketRemove(it.id)} aria-label="Take it back" className="shrink-0 text-[var(--dim)]"><X size={15} /></button>
          </div>
        ); })}</div>
      )}
    </Sheet>
  );
}

/** When a full screen (a chat, a video, a channel) covers the buddy, its pocket stays reachable here. */
export function PocketDock() {
  const { pocket, overlay, setPocketOpen, settings, plus, profile } = useApp();
  return (
    <AnimatePresence>
      {overlay && pocket.length > 0 && settings.mascotOn && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => setPocketOpen(true)} aria-label="What your buddy is holding"
          className="absolute bottom-[96px] left-3 z-[67] flex items-center gap-1.5 rounded-full bg-[var(--ink)] py-1 pl-1 pr-3 text-[12px] font-bold text-white shadow-lg">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white"><Buddy skin={plus ? settings.mascotSkin : "robot"} size={30} initials={initials(profile.name || "Me")} /></span>
          <Backpack size={14} /> {pocket.length}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/** "Hold this for me" button used on files, videos and chats. */
export function HoldButton({ item, className = "", label }: { item: NewPocketItem; className?: string; label?: string }) {
  const { pocketAdd } = useApp();
  return (
    <button onClick={() => pocketAdd(item)} aria-label="Give it to your buddy to hold" title="Hold this for me" className={className}>
      <Backpack size={label ? 16 : 15} />{label}
    </button>
  );
}
