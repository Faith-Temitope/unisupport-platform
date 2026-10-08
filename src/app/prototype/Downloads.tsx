"use client";

import { FileText, Play, Trash2, X } from "lucide-react";
import { useState } from "react";
import { fmtMB, offlineUrl, removeOffline, useOfflineIndex } from "./offline";
import { useApp } from "./store";
import { Sheet } from "./ui";

/** Settings > Downloads: everything saved on this phone, playable/openable with no internet. */
export function Downloads() {
  const { flash } = useApp();
  const index = useOfflineIndex();
  const items = Object.values(index).sort((a, b) => b.at - a.at);
  const [playing, setPlaying] = useState<{ name: string; url: string } | null>(null);
  const total = items.reduce((a, x) => a + x.size, 0);
  async function open(key: string, name: string, kind: string) {
    const u = await offlineUrl(key);
    if (!u) return flash("That copy is gone. Download it again when you're online.");
    if (kind === "video") setPlaying({ name, url: u }); else window.open(u, "_blank");
  }
  return (
    <div>
      {items.length === 0 ? <p className="text-[12.5px] leading-snug text-[var(--dim)]">Tap Download on a video or the download icon on a course file, and it opens here without internet.</p> : (<>
        <div className="mb-2 text-[12px] text-[var(--dim)]">{items.length} saved · {fmtMB(total)} on this phone</div>
        <div className="space-y-1.5">{items.map((x) => (
          <div key={x.key} className="flex items-center gap-2.5 rounded-xl bg-[var(--paper-dim)] px-3 py-2">
            {x.kind === "video" ? <Play size={15} className="shrink-0 text-[var(--birdie)]" /> : <FileText size={15} className="shrink-0 text-[var(--study)]" />}
            <button onClick={() => void open(x.key, x.name, x.kind)} className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold">{x.name}</button>
            <span className="shrink-0 text-[11px] text-[var(--dim)]">{fmtMB(x.size)}</span>
            <button onClick={() => void removeOffline(x.key)} aria-label="Remove" className="shrink-0 text-[var(--dim)]"><Trash2 size={14} /></button>
          </div>
        ))}</div>
      </>)}
      <Sheet open={!!playing} onClose={() => setPlaying(null)} title={playing?.name ?? ""}>
        {playing && <div className="relative"><video src={playing.url} controls autoPlay playsInline className="w-full rounded-xl bg-black" /><button onClick={() => setPlaying(null)} aria-label="Close" className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"><X size={14} /></button></div>}
      </Sheet>
    </div>
  );
}
