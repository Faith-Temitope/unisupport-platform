"use client";

// Birdie's brains, packaged as study companions: Spark (a quick little bird, free), Nova (a curious fox)
// and Sage (a patient owl). Tapping the companion in a Birdie chat opens BirdieSettings: pick a
// companion, how deep it thinks, answer length, memory, and helping Birdie improve. Which AI powers each
// companion, and what answers cost, lives in the "How Birdie works" guide, not in the way.
import { Check, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { BRAINS, TYPICAL, brainById, modelOf, priceNgn } from "@/lib/ai/registry";
import { createClient } from "@/lib/supabase";
import { useBackLayer } from "./nav";
import { naira, useApp } from "./store";
import { Cell, CellGroup, Switch, WeHeader } from "./we";

export const COMPANIONS: Record<string, { name: string; line: string; bg: string }> = {
  spark: { name: "Spark", line: "Quick and cheerful. Always free.", bg: "#FFE7A3" },
  nova: { name: "Nova", line: "Curious and creative. Great at explaining.", bg: "#FFD3B8" },
  sage: { name: "Sage", line: "Patient and careful. Best for hard topics.", bg: "#D9D2F4" },
};
export const companionOf = (id: string) => COMPANIONS[id] ?? COMPANIONS.spark;

/** The companion's face, drawn (no images to load). */
export function CompanionAvatar({ id, size = 40, ring }: { id: string; size?: number; ring?: boolean }) {
  const c = companionOf(id);
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-full ${ring ? "ring-2 ring-white" : ""}`} style={{ width: size, height: size, background: c.bg }} aria-label={c.name} role="img">
      <svg viewBox="0 0 64 64" width={size} height={size}>
        {id === "nova" ? (<>
          {/* fox */}
          <path d="M14 20 L22 6 L28 22 Z M50 20 L42 6 L36 22 Z" fill="#E8742C" />
          <path d="M17 18 L22 10 L25 20 Z M47 18 L42 10 L39 20 Z" fill="#FFF3E6" />
          <path d="M10 30 Q32 10 54 30 Q52 50 32 56 Q12 50 10 30 Z" fill="#F28A3B" />
          <path d="M18 38 Q32 30 46 38 Q42 52 32 54 Q22 52 18 38 Z" fill="#FFF3E6" />
          <circle cx="24" cy="33" r="3.4" fill="#2A1A10" /><circle cx="40" cy="33" r="3.4" fill="#2A1A10" />
          <circle cx="25" cy="32" r="1.1" fill="#fff" /><circle cx="41" cy="32" r="1.1" fill="#fff" />
          <path d="M29 42 Q32 45 35 42 Q32 40 29 42 Z" fill="#2A1A10" />
          <path d="M46 12 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#fff" opacity=".9" />
        </>) : id === "sage" ? (<>
          {/* owl */}
          <path d="M14 18 L20 26 L12 28 Z M50 18 L44 26 L52 28 Z" fill="#5B4A9E" />
          <ellipse cx="32" cy="38" rx="21" ry="20" fill="#7464C0" />
          <ellipse cx="32" cy="46" rx="11" ry="10" fill="#C9C0EE" />
          <circle cx="23" cy="32" r="8" fill="#fff" /><circle cx="41" cy="32" r="8" fill="#fff" />
          <circle cx="23" cy="32" r="4" fill="#24193F" /><circle cx="41" cy="32" r="4" fill="#24193F" />
          <circle cx="24.4" cy="30.6" r="1.3" fill="#fff" /><circle cx="42.4" cy="30.6" r="1.3" fill="#fff" />
          <path d="M29 38 L32 43 L35 38 Z" fill="#F2B33D" />
          <path d="M15 31 a8 8 0 0 1 16 0 M33 31 a8 8 0 0 1 16 0" stroke="#24193F" strokeWidth="1.6" fill="none" opacity=".35" />
        </>) : (<>
          {/* bird */}
          <path d="M30 10 Q34 4 38 10 Q35 9 33 13 Z" fill="#F2B33D" />
          <circle cx="32" cy="36" r="20" fill="#A63FBD" />
          <ellipse cx="32" cy="44" rx="12" ry="10" fill="#E9C8F2" />
          <circle cx="25" cy="32" r="5.5" fill="#fff" /><circle cx="39" cy="32" r="5.5" fill="#fff" />
          <circle cx="26" cy="32.5" r="2.8" fill="#1E1028" /><circle cx="40" cy="32.5" r="2.8" fill="#1E1028" />
          <circle cx="27" cy="31.4" r="1" fill="#fff" /><circle cx="41" cy="31.4" r="1" fill="#fff" />
          <path d="M29 38 L35 38 L32 42.5 Z" fill="#F2B33D" />
          <path d="M44 14 L41 21 L45 21 L42 28 L49 19 L45 19 L48 14 Z" fill="#F2B33D" />
        </>)}
      </svg>
    </span>
  );
}

const DEPTH: Record<string, string> = { quick: "Fastest answers", balanced: "Best for most questions", deep: "Slower, most thorough" };

export function BirdieSettings({ onBack }: { onBack: () => void }) {
  const { settings, setSetting, auth, plus, openPlus, flash, profile, courses, setChats, setOverlay } = useApp();
  const [sub, setSub] = useState<null | "memory" | "guide">(null);
  useBackLayer(!!sub, () => setSub(null));
  // Companions the team switched off in the console (no working vendor account yet).
  const [off, setOff] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (auth.status !== "in") return;
    let dead = false;
    createClient().from("ai_providers").select("id,enabled").then(({ data }) => { if (!dead && data) setOff(new Set(data.filter((r) => !r.enabled).map((r) => r.id as string))); });
    return () => { dead = true; };
  }, [auth.status]);
  const cur = brainById(settings.aiBrain);

  if (sub === "memory") return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={() => setSub(null)} title="Memory" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        <div className="px-4 pb-1.5 pt-3 text-[13px] text-[var(--we-sub)]">What Birdie knows about you</div>
        <CellGroup gap={false}>
          <Cell label="Name" value={profile.name || "Not set"} chevron={false} />
          <Cell label="School" value={profile.institution || "Not set"} chevron={false} />
          <Cell label="Level" value={profile.level || "Not set"} chevron={false} />
          <Cell label="Course of study" value={profile.program || "Not set"} chevron={false} />
          <Cell label="Your courses" value={`${courses.length}`} chevron={false} />
          <Cell label="Edit what Birdie knows" onClick={() => setOverlay({ t: "settings" })} />
        </CellGroup>
        <p className="px-4 pt-2 text-[12.5px] leading-snug text-[var(--we-sub)]">Birdie uses this and your course notes, files and recordings to answer, and when you ask it in a chat with @Birdie.</p>
        <CellGroup>
          <Cell label="Clear all Birdie chats" danger center onClick={() => { if (!confirm("Delete all your Birdie chats on this phone?")) return; setChats(() => ({})); flash("Birdie chats cleared"); }} />
        </CellGroup>
      </div>
    </div>
  );

  if (sub === "guide") return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={() => setSub(null)} title="How Birdie Works" />
      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-10 pt-3 text-[14px] leading-relaxed text-[var(--we-text)]">
        <p>Birdie answers from your own course material first: notes, files, scans and recordings. Then it fills gaps with what it knows. Files it used are folded under &quot;From your notes&quot;.</p>
        <div className="rounded-[8px] bg-[var(--we-cell)] p-4">
          <div className="mb-2 font-semibold">Your companions</div>
          {BRAINS.map((b) => {
            const m = modelOf(b, settings.aiTier); const p = priceNgn(b, m, TYPICAL.inTokens, TYPICAL.outTokens);
            return <p key={b.id} className="mb-2"><b>{companionOf(b.id).name}</b> runs on {b.vendorName} ({b.models.map((x) => x.vendorLabel).join(", ")}). {b.free ? "Free." : `About ${naira(p.ngn)} for a typical ${m.label.toLowerCase()} answer, paid from your Birdie balance at cost plus a small margin. Needs Birdie Plus.`} {b.blurb}</p>;
          })}
        </div>
        <p>A typical answer reads about {TYPICAL.inTokens.toLocaleString()} tokens of your notes and writes about {TYPICAL.outTokens}. Deeper thinking costs more on paid companions and takes longer.</p>
        <p>Helping Birdie improve is off unless you turn it on. When it&apos;s on, the questions and corrections you send with a thumbs down are shared without your name, and phone numbers and emails are removed. You can delete them any time in Settings.</p>
        <p>Read aloud, voice chat, photo questions and pictures all use the same companion. Pictures need a paid plan with the provider.</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--we-bg)]">
      <WeHeader onBack={onBack} title="Birdie" />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-10">
        <div className="flex flex-col items-center bg-[var(--we-cell)] pb-5 pt-3">
          <CompanionAvatar id={cur.id} size={84} />
          <div className="mt-2 text-[19px] font-semibold text-[var(--we-text)]">{companionOf(cur.id).name}</div>
          <div className="text-[13px] text-[var(--we-sub)]">{companionOf(cur.id).line}</div>
        </div>

        <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">Companion</div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {BRAINS.map((b) => {
            const on = b.id === cur.id, disabled = off.has(b.id), locked = !b.free && !plus;
            return (
              <button key={b.id} onClick={() => (disabled ? flash(`${companionOf(b.id).name} isn't ready yet`) : locked ? openPlus(`${companionOf(b.id).name} comes with Birdie Plus.`) : setSetting("aiBrain", b.id))}
                className={`relative flex w-[104px] shrink-0 flex-col items-center rounded-[10px] bg-[var(--we-cell)] px-2 pb-3 pt-3 ${on ? "ring-2 ring-[var(--we-accent)]" : ""} ${disabled ? "opacity-50" : ""}`}>
                <CompanionAvatar id={b.id} size={56} />
                <span className="mt-1.5 text-[14.5px] font-semibold text-[var(--we-text)]">{companionOf(b.id).name}</span>
                <span className="mt-0.5 text-[11.5px] text-[var(--we-sub)]">{b.free ? "Free" : locked ? "Plus" : "Plus · per answer"}</span>
                {on && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--we-accent)] text-white"><Check size={12} strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-1.5 pt-5 text-[13px] text-[var(--we-sub)]">How deep to think</div>
        <CellGroup gap={false}>
          {cur.models.map((m) => <Cell key={m.tier} label={m.label} sub={DEPTH[m.tier]} chevron={false} right={settings.aiTier === m.tier ? <Check size={20} className="text-[var(--we-accent)]" /> : undefined} onClick={() => setSetting("aiTier", m.tier)} />)}
        </CellGroup>

        <div className="px-4 pb-1.5 pt-5 text-[13px] text-[var(--we-sub)]">Answers</div>
        <CellGroup gap={false}>
          {(["short", "normal", "detailed"] as const).map((l) => <Cell key={l} label={l === "short" ? "Short" : l === "normal" ? "Normal" : "Detailed"} chevron={false} right={settings.answerLength === l ? <Check size={20} className="text-[var(--we-accent)]" /> : undefined} onClick={() => setSetting("answerLength", l)} />)}
        </CellGroup>

        <CellGroup>
          <Cell label="Memory" sub="What Birdie knows about you" onClick={() => setSub("memory")} />
          <Cell label="Help Birdie improve" sub="Share thumbs-down corrections, without your name" right={<Switch on={settings.improveBirdie} onChange={(v) => setSetting("improveBirdie", v)} label="Help Birdie improve" />} />
          <Cell label="Read answers aloud" right={<Switch on={settings.readAloud} onChange={(v) => setSetting("readAloud", v)} label="Read answers aloud" />} />
          <Cell label="Study buddy on screen" right={<Switch on={settings.mascotOn} onChange={(v) => setSetting("mascotOn", v)} label="Study buddy on screen" />} />
        </CellGroup>
        <CellGroup>
          <button onClick={() => setSub("guide")} className="flex w-full items-center justify-between px-4 py-4 text-left text-[16px] text-[var(--we-text)] active:bg-black/5">How Birdie works<ChevronRight size={18} className="text-[var(--we-hint)]" /></button>
        </CellGroup>
      </div>
    </div>
  );
}
