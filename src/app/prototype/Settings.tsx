"use client";

import { ArrowLeft, Bell, BookOpen, Bot as BotIcon, Cpu, Compass, CreditCard, Eye, FileText, Lock, LogOut, PlugZap, ShieldCheck, Sparkles, Trash2, Type, UserRound, X } from "lucide-react";
import { cleanUrl } from "./live/socialData";
import { RepPanel } from "./RepPanel";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { initials } from "./PostCard";
import { naira, useApp } from "./store";
import { Avatar, Btn, IconBtn, Screen, Segmented, Sheet, TextField, Toggle } from "./ui";
import { BrainPicker } from "./BrainPicker";

function Group({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white px-4 pb-1 pt-3.5">
      <div className="mb-1 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[var(--birdie)]"><Icon size={14} /> {title}</div>
      {children}
    </section>
  );
}
const Row = ({ label, sub, onClick, danger }: { label: string; sub?: string; onClick: () => void; danger?: boolean }) => (
  <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left last:border-0 active:opacity-70">
    <div className="min-w-0 flex-1"><div className={`text-[14px] font-semibold ${danger ? "text-[var(--help)]" : "text-[var(--text)]"}`}>{label}</div>{sub && <div className="text-[12px] leading-snug text-[var(--dim)]">{sub}</div>}</div><span className="text-[var(--dim)]">›</span>
  </button>
);
const Choice = ({ label, children }: { label: string; children: ReactNode }) => (<div className="border-b border-[var(--line)] py-3 last:border-0"><div className="mb-2 text-[14px] font-semibold text-[var(--text)]">{label}</div>{children}</div>);

export default function Settings() {
  const { overlay, setOverlay, profile, saveProfile, settings, setSetting, demoOn, setDemo, balance, txs, setWalletOpen, courses, folders, resetAll, flash, auth, signOut, setAuthOpen } = useApp();
  const [sheet, setSheet] = useState<null | "profile" | "password" | "delete" | "about">(null);
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ a: "", b: "", c: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const close = () => setOverlay(null);

  function exportData() {
    const data = { exportedAt: new Date().toISOString(), profile, settings, folders, courses: courses.map((c) => ({ ...c, files: c.files.map(({ url, ...f }) => { void url; return f; }), recs: c.recs.map(({ url, ...r }) => { void url; return r; }) })) };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = "birdie-data.json"; a.click(); flash("Your data was downloaded");
  }

  return (
    <>
      <Screen open={overlay?.t === "settings"} z={64}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 pb-2.5 pt-1"><IconBtn label="Back" onClick={close}><ArrowLeft size={17} /></IconBtn><h2 className="disp text-[19px] font-bold">Settings</h2></div>
          <div className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-4 py-4 pb-10">
            <button onClick={() => { setDraft(profile); setSheet("profile"); }} className="flex w-full items-center gap-3.5 rounded-2xl border border-[var(--line)] bg-white p-3.5 text-left active:scale-[0.98]">
              <Avatar initials={initials(profile.name)} color="#A63FBD" size={54} />
              <div className="min-w-0 flex-1"><div className="disp truncate text-[17px] font-bold">{profile.name || "Your name"}</div><div className="truncate text-[12.5px] text-[var(--dim)]">@{profile.handle || "handle"} · {[profile.level, profile.program].filter(Boolean).join(" · ") || "Add your level and program"}</div></div><span className="text-[var(--dim)]">›</span>
            </button>
            <Btn variant="ghost" onClick={() => setOverlay({ t: "profile", id: "me" })}>View my channel</Btn>

            {auth.status === "guest" && (
              <div className="rounded-2xl bg-gradient-to-br from-[var(--ink)] to-[#2b1546] p-4 text-[var(--paper)]"><div className="disp text-[16px] font-bold">You're using Birdie as a guest</div><p className="mt-1 text-[12.5px] leading-snug text-white/65">Your work is saved on this device only. Create an account to keep it safe and use it anywhere.</p><button onClick={() => { close(); setAuthOpen(true); }} className="mt-3 rounded-xl bg-[var(--birdie)] px-4 py-2 text-[13px] font-semibold text-white active:scale-95">Create an account</button></div>
            )}
            {auth.status === "in" && <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-[13px] text-[var(--dim)]">Signed in as <b className="text-[var(--text)]">{auth.email}</b></div>}

            <Group icon={CreditCard} title="Wallet">
              <div className="flex items-center justify-between border-b border-[var(--line)] py-3"><div><div className="text-[12px] text-[var(--dim)]">Birdie balance</div><div className="disp text-[22px] font-bold">{naira(balance)}</div></div><button onClick={() => setWalletOpen(true)} className="rounded-xl bg-[var(--birdie)] px-4 py-2 text-[13px] font-semibold text-white active:scale-95">Top up</button></div>
              <Row label="Transactions" sub={txs.length ? `${txs.length} so far` : "Nothing yet"} onClick={() => setWalletOpen(true)} />
            </Group>

            <RepPanel />

            <Group icon={Cpu} title="Birdie's brain">
              <div className="pb-3 pt-1"><p className="mb-3 text-[12.5px] leading-snug text-[var(--dim)]">Pick the AI you like best. You can switch any time, and each one has its own model levels.</p><BrainPicker /></div>
            </Group>

            <Group icon={Sparkles} title="Birdie and study">
              <Toggle on={settings.recs12h} onChange={(v) => setSetting("recs12h", v)} label="Recommendations every 12 hours" sub="Birdie reads your recent chats and suggests what to review" />
              <Toggle on={settings.readAloud} onChange={(v) => setSetting("readAloud", v)} label="Read-aloud button on answers" />
              <Choice label="Answer length"><Segmented value={settings.answerLength} onChange={(v) => setSetting("answerLength", v)} options={[{ id: "short", label: "Short" }, { id: "normal", label: "Normal" }, { id: "detailed", label: "Detailed" }]} /></Choice>
              <Choice label="Daily study goal"><Segmented value={String(settings.dailyGoal)} onChange={(v) => setSetting("dailyGoal", Number(v))} options={[{ id: "1", label: "1 action" }, { id: "3", label: "3 actions" }, { id: "5", label: "5 actions" }]} /></Choice>
              <Toggle on={settings.recordReminder} onChange={(v) => setSetting("recordReminder", v)} label="Recording consent reminder" sub="Show a consent check before every recording" />
            </Group>

            <Group icon={BotIcon} title="Birdie the mascot">
              <Toggle on={settings.mascotOn} onChange={(v) => setSetting("mascotOn", v)} label="Show the mascot" sub="Wanders, chats, and reacts to what you do" />
              <Toggle on={settings.mascotChatty} onChange={(v) => setSetting("mascotChatty", v)} label="Let it talk" sub="Tips and cheering in speech bubbles" />
              <p className="pb-3 text-[12px] leading-snug text-[var(--dim)]">Tap it for shortcuts. Poke it too much and it gets grumpy. Press and hold to pet it.</p>
            </Group>

            <Group icon={Compass} title="Explore">
              <Toggle on={settings.autoplay} onChange={(v) => setSetting("autoplay", v)} label="Play videos on hover" sub="Preview videos silently as you point at them" />
              <Toggle on={settings.dataSaver} onChange={(v) => setSetting("dataSaver", v)} label="Data saver" sub="No video previews and lighter loading, to save your data" />
              <Toggle on={settings.personalTags} onChange={(v) => setSetting("personalTags", v)} label="Tags based on my chats" sub="Suggest topics from your courses and Birdie chats" />
              <Toggle on={demoOn} onChange={setDemo} label="Demo community" sub="Adds a few sample students, posts and shared courses so Explore isn't empty while you're the only one here. Kept separate from your own data." />
            </Group>

            <Group icon={Bell} title="Notifications">
              <Toggle on={settings.notifChat} onChange={(v) => setSetting("notifChat", v)} label="Messages" sub="People, shared courses and writers" />
              <Toggle on={settings.notifSession} onChange={(v) => setSetting("notifSession", v)} label="Writer sessions and payments" />
              <Toggle on={settings.notifRec} onChange={(v) => setSetting("notifRec", v)} label="Study recommendations" />
              <Toggle on={settings.notifExplore} onChange={(v) => setSetting("notifExplore", v)} label="New posts from people I follow" />
            </Group>

            <Group icon={Type} title="Accessibility">
              <Toggle on={settings.dyslexia} onChange={(v) => setSetting("dyslexia", v)} label="Dyslexia-friendly reading" sub="Wider spacing and a clearer typeface" />
              <Choice label="Text size"><Segmented value={settings.textSize} onChange={(v) => setSetting("textSize", v)} options={[{ id: "s", label: "Small" }, { id: "m", label: "Medium" }, { id: "l", label: "Large" }]} /></Choice>
              <Toggle on={settings.reduceMotion} onChange={(v) => setSetting("reduceMotion", v)} label="Reduce motion" />
            </Group>

            <Group icon={PlugZap} title="Connectors">
              <Toggle on={settings.calendar} onChange={(v) => setSetting("calendar", v)} label="Calendar" sub="Let Birdie know your deadlines and class times" />
              <Toggle on={settings.schoolApps} onChange={(v) => setSetting("schoolApps", v)} label="School apps" sub="Campus map and timetable" />
              <Toggle on={settings.offline} onChange={(v) => setSetting("offline", v)} label="Offline mode" sub="Keep notes and flashcards usable without data" />
            </Group>

            <Group icon={Eye} title="Privacy">
              <Choice label="Who can see my profile"><Segmented value={settings.profileVisibility} onChange={(v) => setSetting("profileVisibility", v)} options={[{ id: "everyone", label: "Everyone" }, { id: "followers", label: "Followers" }, { id: "private", label: "Only me" }]} /></Choice>
              <Choice label="Who can message me"><Segmented value={settings.whoCanChat} onChange={(v) => setSetting("whoCanChat", v)} options={[{ id: "everyone", label: "Everyone" }, { id: "contacts", label: "My contacts" }]} /></Choice>
            </Group>

            {auth.status === "in" && (
              <Group icon={Lock} title="Security">
                <Row label="Change password" onClick={() => { setPw({ a: "", b: "", c: "" }); setSheet("password"); }} />
                <Row label="Sign out of other devices" sub="Keeps you signed in here" onClick={async () => { const { error } = await createClient().auth.signOut({ scope: "others" }); flash(error ? "Couldn't sign out other devices" : "Signed out everywhere else"); }} />
              </Group>
            )}

            <Group icon={FileText} title="Your data">
              <Row label="Download my data" sub="Courses, notes and settings as a file" onClick={exportData} />
              <Row label="Delete my account" sub="Removes everything on this device" danger onClick={() => setSheet("delete")} />
            </Group>

            <Group icon={BookOpen} title="About">
              <Row label="Terms of Service" onClick={() => window.open("/terms", "_blank")} />
              <Row label="Privacy Policy" onClick={() => window.open("/privacy", "_blank")} />
              <Row label="How to use Birdie" onClick={() => setSheet("about")} />
              {auth.status === "in" && <Row label="Log out" danger onClick={async () => { close(); await signOut(); resetAll(); }} />}
            </Group>
            <p className="pb-2 text-center text-[11.5px] text-[var(--dim)]">Birdie · powered by Unisupport</p>
          </div>
        </div>
      </Screen>

      <Sheet open={sheet === "profile"} onClose={() => setSheet(null)} title="Edit profile">
        <div className="space-y-3">
          <TextField value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Full name" />
          <TextField value={draft.handle} onChange={(v) => setDraft({ ...draft, handle: v.toLowerCase().replace(/[^a-z0-9._]/g, "") })} placeholder="Handle" />
          <TextField value={draft.level} onChange={(v) => setDraft({ ...draft, level: v })} placeholder="Level, e.g. 300 Level or Year 2" />
          <TextField value={draft.program} onChange={(v) => setDraft({ ...draft, program: v })} placeholder="Program, e.g. Computer Science" />
          <TextField value={draft.institution} onChange={(v) => setDraft({ ...draft, institution: v })} placeholder="School" />
          <TextField value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} placeholder="Country" />
          <TextField value={draft.region ?? ""} onChange={(v) => setDraft({ ...draft, region: v })} placeholder="State or region, e.g. Lagos" />
          <TextField multiline value={draft.bio} onChange={(v) => setDraft({ ...draft, bio: v })} placeholder="Channel description: what you post, what you study" />
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Links (up to 5)</div>
            <div className="space-y-2">
              {(draft.links ?? []).map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={l.label} onChange={(e) => setDraft({ ...draft, links: (draft.links ?? []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Label" className="w-24 shrink-0 rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13px] outline-none" />
                  <input value={l.url} onChange={(e) => setDraft({ ...draft, links: (draft.links ?? []).map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} placeholder="instagram.com/you" className="min-w-0 flex-1 rounded-xl bg-[var(--paper-dim)] px-3 py-2.5 text-[13px] outline-none" />
                  <button onClick={() => setDraft({ ...draft, links: (draft.links ?? []).filter((_, j) => j !== i) })} aria-label="Remove link" className="text-[var(--dim)]"><X size={16} /></button>
                </div>
              ))}
              {(draft.links ?? []).length < 5 && <button onClick={() => setDraft({ ...draft, links: [...(draft.links ?? []), { label: "", url: "" }] })} className="text-[12.5px] font-bold text-[var(--study)]">+ Add a link</button>}
            </div>
          </div>
          <p className="text-[11.5px] leading-snug text-[var(--dim)]">Your name, handle, school, country, description and links show on your public channel. Country, region and school also decide which shared courses limited to a place you can see.</p>
          <Btn variant="study" disabled={!draft.name.trim() || saving} onClick={async () => {
            const links = (draft.links ?? []).filter((l) => l.url.trim());
            const bad = links.find((l) => !cleanUrl(l.url));
            if (bad) return flash(`"${bad.url}" isn't a valid web link`);
            setSaving(true);
            const err = await saveProfile({ ...draft, links: links.map((l) => ({ label: l.label.trim(), url: cleanUrl(l.url)! })) });
            setSaving(false);
            if (err === "handle_taken") return flash(`@${draft.handle} is taken. Try another handle.`);
            if (err) return flash("Couldn't save your profile. Check your connection.");
            setSheet(null); flash("Profile saved");
          }}>{saving ? "Saving..." : "Save"}</Btn>
        </div>
      </Sheet>
      <Sheet open={sheet === "password"} onClose={() => setSheet(null)} title="Change password">
        <div className="space-y-3">
          <TextField type="password" value={pw.b} onChange={(v) => setPw({ ...pw, b: v })} placeholder="New password" />
          <TextField type="password" value={pw.c} onChange={(v) => setPw({ ...pw, c: v })} placeholder="Repeat new password" />
          <p className="text-[12px] text-[var(--dim)]">You&apos;ll stay signed in on this device. Other devices are signed out next time they need to check.</p>
          <Btn variant="study" disabled={pwBusy || pw.b.length < 8 || pw.b !== pw.c} onClick={async () => {
            setPwBusy(true);
            const { error } = await createClient().auth.updateUser({ password: pw.b });
            setPwBusy(false);
            if (error) return flash(error.message);
            setSheet(null); flash("Password updated");
          }}>{pwBusy ? "Updating..." : "Update password"}</Btn>
        </div>
      </Sheet>
      <Sheet open={sheet === "delete"} onClose={() => setSheet(null)} title="Delete account?">
        <p className="mb-4 text-[14px] leading-relaxed text-[var(--dim)]">This clears your courses, notes, chats and settings from this device and can't be undone.</p>
        <button onClick={async () => { setSheet(null); close(); await signOut(); resetAll(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--help)] py-3.5 text-[15px] font-semibold text-white active:scale-[0.97]"><Trash2 size={16} /> Delete everything</button>
        <button onClick={() => setSheet(null)} className="mt-2 w-full py-2.5 text-[13.5px] font-semibold text-[var(--dim)]">Keep my account</button>
      </Sheet>
      <Sheet open={sheet === "about"} onClose={() => setSheet(null)} title="About Birdie">
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[var(--dim)]">
          <p><b className="text-[var(--text)]">Birdie</b> turns your courses into a study partner that knows what you were taught: ask it questions, make flashcards, get quizzed, and it only answers from your own notes and files. Help is provided by <b className="text-[var(--text)]">Unisupport</b>, the company behind our writers and help desk.</p>
          <p><b className="text-[var(--text)]">Study</b> holds your courses, notes, files and recordings. <b className="text-[var(--text)]">Explore</b> is where students share and follow each other. <b className="text-[var(--text)]">Birdie</b> is your AI study partner. <b className="text-[var(--text)]">Help</b> connects you to a real writer for mentoring or full write-ups.</p>
          <div className="flex items-center gap-2 text-[var(--uni-deep)]"><ShieldCheck size={16} /> Your recordings and notes stay private to you.</div>
          <div className="flex items-center gap-2 text-[var(--study)]"><UserRound size={16} /> You control who can see and message you.</div>
        </div>
      </Sheet>
    </>
  );
}
