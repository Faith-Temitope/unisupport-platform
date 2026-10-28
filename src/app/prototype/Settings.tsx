"use client";

import { PushToggle } from "./PushToggle";
import Buddy, { SKINS } from "@/components/brand/Buddy";
import { Downloads } from "./Downloads";
import { ChevronLeft, Bell, BookOpen, Bot as BotIcon, Compass, CreditCard, Eye, FileText, Download, Lock, Palette, ShieldCheck, Sparkles, Type, UserRound } from "lucide-react";
import { pushTest } from "./live/verifyData";
import { ProfileSettingsPage } from "./ProfileSettings";
import { DataRows, SecurityRows } from "./Security";
import { RepPanel } from "./RepPanel";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { initials } from "./PostCard";
import { naira, useApp } from "./store";
import { Avatar, Page, Screen, Segmented, Sheet, Toggle } from "./ui";
import { BirdieSettings } from "./Companions";
import { useBackLayer } from "./nav";
import { ACCENTS } from "./theme";

function Group({ title, children }: { icon?: typeof Bell; title: string; children: ReactNode }) {
  return (
    <section>
      <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{title}</div>
      <div className="bg-[var(--we-cell)] px-4">{children}</div>
    </section>
  );
}
const Row = ({ label, sub, onClick, danger }: { label: string; sub?: string; onClick: () => void; danger?: boolean }) => (
  <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] py-3.5 text-left last:border-0 active:opacity-70">
    <div className="min-w-0 flex-1"><div className={`text-[16px] ${danger ? "text-[var(--we-red)]" : "text-[var(--we-text)]"}`}>{label}</div>{sub && <div className="mt-0.5 text-[12.5px] leading-snug text-[var(--we-sub)]">{sub}</div>}</div><span className="text-[var(--dim)]">›</span>
  </button>
);
const Choice = ({ label, children }: { label: string; children: ReactNode }) => (<div className="border-b border-[var(--we-sep)] py-3.5 last:border-0"><div className="mb-2.5 text-[16px] text-[var(--we-text)]">{label}</div>{children}</div>);

export default function Settings() {
  const { overlay, setOverlay, profile, settings, setSetting, demoOn, setDemo, balance, setWalletOpen, resetAll, flash, auth, signOut, setAuthOpen, plus, openPlus, setTourOpen } = useApp();
  const [sheet, setSheet] = useState<null | "profile" | "about" | "logout">(null);
  const close = () => setOverlay(null);
  const [birdie, setBirdie] = useState(false);
  useBackLayer(birdie, () => setBirdie(false));


  return (
    <>
      <Screen open={overlay?.t === "settings"} z={64}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex h-12 shrink-0 items-center justify-center bg-[var(--we-bg)] text-[var(--we-text)]"><button onClick={close} aria-label="Back" className="absolute left-2 flex h-10 w-10 items-center justify-center"><ChevronLeft size={26} /></button><span className="text-[16.5px] font-semibold">Settings</span></div>
          <div className="no-scrollbar flex-1 overflow-y-auto bg-[var(--we-bg)] pb-12">
            <button onClick={() => setSheet("profile")} className="flex w-full items-center gap-3.5 bg-[var(--we-cell)] px-4 py-4 text-left active:opacity-80">
              <Avatar initials={initials(profile.name)} color="#A63FBD" size={54} />
              <div className="min-w-0 flex-1"><div className="truncate text-[17px] font-semibold text-[var(--we-text)]">{profile.name || "Your name"}</div><div className="truncate text-[13px] text-[var(--we-sub)]">@{profile.handle || "handle"} · {[profile.level, profile.program].filter(Boolean).join(" · ") || "Add your level and course"}</div></div><span className="text-[var(--we-hint)]">›</span>
            </button>

            {auth.status === "guest" && (
              <div className="rounded-2xl bg-gradient-to-br from-[var(--ink)] to-[#2b1546] p-4 text-[var(--paper)]"><div className="disp text-[16px] font-bold">You&apos;re using Birdie as a guest</div><p className="mt-1 text-[12.5px] leading-snug text-white/65">Your work is saved on this device only. Create an account to keep it safe and use it anywhere.</p><button onClick={() => { close(); setAuthOpen(true); }} className="mt-3 rounded-xl bg-[var(--birdie)] px-4 py-2 text-[13px] font-semibold text-white active:scale-95">Create an account</button></div>
            )}
            {auth.status === "in" && <div className="px-4 pt-2 text-[12.5px] text-[var(--we-sub)]">Signed in as <b className="text-[var(--text)]">{auth.email}</b></div>}

            <Group icon={CreditCard} title="Wallet">
              <Row label="Balance" sub={naira(balance)} onClick={() => setWalletOpen(true)} />
              <Row label="How Birdie works" sub="The quick tour: studying, Birdie AI, earning and more" onClick={() => setTourOpen(true)} />
            </Group>

            <RepPanel />

            <Group title="Birdie AI">
              <Row label="Companion, thinking and memory" sub="Spark, Nova or Sage, how deep it thinks, what it knows about you" onClick={() => setBirdie(true)} />
            </Group>

            <Group icon={Sparkles} title="Birdie and study">
              <Toggle on={settings.recs12h} onChange={(v) => setSetting("recs12h", v)} label="Recommendations every 12 hours" sub="Birdie reads your recent chats and suggests what to review" />
              <Toggle on={settings.readAloud} onChange={(v) => setSetting("readAloud", v)} label="Read-aloud button on answers" />
              <Choice label="Answer length"><Segmented value={settings.answerLength} onChange={(v) => setSetting("answerLength", v)} options={[{ id: "short", label: "Short" }, { id: "normal", label: "Normal" }, { id: "detailed", label: "Detailed" }]} /></Choice>
              <Choice label="Daily study goal"><Segmented value={String(settings.dailyGoal)} onChange={(v) => setSetting("dailyGoal", Number(v))} options={[{ id: "1", label: "1 action" }, { id: "3", label: "3 actions" }, { id: "5", label: "5 actions" }]} /></Choice>
              <Toggle on={settings.recordReminder} onChange={(v) => setSetting("recordReminder", v)} label="Recording consent reminder" sub="Show a consent check before every recording" />
              <Toggle on={settings.improveBirdie} onChange={(v) => setSetting("improveBirdie", v)} label="Help improve Birdie" sub="When you rate an answer, share the question and your correction so we can train Birdie's own model. No name or email is attached. Your notes and files are never shared." />
              {auth.status === "in" && <Row label="Delete what I've shared" sub="Removes the questions and corrections you shared. Your 👍/👎 counts stay, with no text." onClick={async () => { const { data, error } = await createClient().rpc("forget_my_ai_feedback"); setSetting("improveBirdie", false); flash(error ? "Couldn't delete right now. Try again." : `Deleted ${data ?? 0} shared item${data === 1 ? "" : "s"}`); }} />}
            </Group>

            <Group icon={BotIcon} title="Birdie the mascot">
              <Toggle on={settings.mascotOn} onChange={(v) => setSetting("mascotOn", v)} label="Show the mascot" sub="Wanders, chats, and reacts to what you do" />
              <Toggle on={settings.mascotChatty} onChange={(v) => setSetting("mascotChatty", v)} label="Let it talk" sub="Tips and cheering in speech bubbles" />
              <Choice label="Your study buddy">
                <div className="grid grid-cols-4 gap-2">{SKINS.map((k) => (
                  <button key={k.id} onClick={() => (k.id === "robot" || plus ? setSetting("mascotSkin", k.id) : openPlus("The Bird, Spider and Me buddies are part of Birdie Plus."))} aria-pressed={settings.mascotSkin === k.id} className={`flex flex-col items-center gap-1 rounded-2xl p-2 ${settings.mascotSkin === k.id ? "bg-[var(--birdie-soft)] ring-2 ring-[var(--birdie)]" : "bg-[var(--paper-dim)]"}`}>
                    <Buddy skin={k.id} size={44} initials={initials(profile.name || "Me")} /><span className="text-[11px] font-semibold">{k.label}{k.id !== "robot" && !plus ? " 👑" : ""}</span>
                  </button>
                ))}</div>
              </Choice>
              <Toggle on={settings.mascotBoard && plus} onChange={(v) => (plus ? setSetting("mascotBoard", v) : openPlus("The sign board is part of Birdie Plus."))} label={plus ? "Hold up a sign" : "Hold up a sign 👑"} sub="It talks with a little hanging board instead of speech bubbles" />
              <p className="pb-3 text-[12px] leading-snug text-[var(--dim)]">Tap it for shortcuts. Poke it too much and it gets grumpy. Press and hold to pet it.</p>
            </Group>

            <Group icon={Compass} title="Explore">
              <Toggle on={settings.dataSaver} onChange={(v) => setSetting("dataSaver", v)} label="Data saver" sub="No video previews and lighter loading, to save your data" />
              <Toggle on={settings.personalTags} onChange={(v) => setSetting("personalTags", v)} label="Tags based on my chats" sub="Suggest topics from your courses and Birdie chats" />
              <Toggle on={demoOn} onChange={setDemo} label="Demo community" sub="Adds a few sample students, posts and shared courses so Explore isn't empty while you're the only one here. Kept separate from your own data." />
            </Group>

            <Group icon={Bell} title="Notifications">
              <PushToggle />
              {auth.status === "in" && <Row label="Send a test notification" sub="Check that notifications reach this phone" onClick={async () => { const ok = await pushTest(); flash(ok ? "Sent. It should pop up in a few seconds." : "That's enough tests for now. Try again in an hour."); }} />}
              <Toggle on={settings.notifRec} onChange={(v) => setSetting("notifRec", v)} label="Study recommendations" />
            </Group>

            <Group icon={Download} title="Downloads (offline)">
              <Downloads />
            </Group>

            <Group icon={Palette} title="Appearance">
              <Choice label="Theme"><Segmented value={settings.theme} onChange={(v) => setSetting("theme", v)} options={[{ id: "system", label: "System" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }]} /></Choice>
              <Choice label="Accent colour">
                <div className="flex gap-2.5">{ACCENTS.map(([id, label, hex]) => (
                  <button key={id} onClick={() => (id === "purple" || plus ? setSetting("accent", id) : openPlus("Accent colours are part of Birdie Plus. Dark mode stays free."))} aria-label={label} aria-pressed={settings.accent === id} className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-[var(--paper)] transition ${settings.accent === id ? "ring-2 ring-[var(--text)]" : ""}`} style={{ background: hex }} />
                ))}</div>
              </Choice>
            </Group>

            <Group icon={Type} title="Accessibility">
              <Toggle on={settings.dyslexia} onChange={(v) => setSetting("dyslexia", v)} label="Dyslexia-friendly reading" sub="Wider spacing and a clearer typeface" />
              <Choice label="Text size"><Segmented value={settings.textSize} onChange={(v) => setSetting("textSize", v)} options={[{ id: "s", label: "Small" }, { id: "m", label: "Medium" }, { id: "l", label: "Large" }]} /></Choice>
              <Toggle on={settings.reduceMotion} onChange={(v) => setSetting("reduceMotion", v)} label="Reduce motion" />
            </Group>


            <Group icon={Eye} title="Privacy">
              <Choice label="Who can see my profile"><Segmented value={settings.profileVisibility} onChange={(v) => setSetting("profileVisibility", v)} options={[{ id: "everyone", label: "Everyone" }, { id: "followers", label: "Followers" }, { id: "private", label: "Only me" }]} /></Choice>
              <Choice label="Who can message me"><Segmented value={settings.whoCanChat} onChange={(v) => setSetting("whoCanChat", v)} options={[{ id: "everyone", label: "Everyone" }, { id: "contacts", label: "My contacts" }]} /></Choice>
            </Group>

            {auth.status === "in" && (
              <Group icon={Lock} title="Security">
                <SecurityRows Row={Row} />
              </Group>
            )}

            {auth.status === "in" && (
              <Group icon={FileText} title="Your data">
                <DataRows Row={Row} />
              </Group>
            )}

            <Group icon={BookOpen} title="About">
              <Row label="Terms of Service" onClick={() => window.open("/terms", "_blank")} />
              <Row label="Privacy Policy" onClick={() => window.open("/privacy", "_blank")} />
              <Row label="How to use Birdie" onClick={() => setSheet("about")} />
            </Group>
            {auth.status === "in" && <button onClick={() => setSheet("logout")} className="mt-2 w-full bg-[var(--we-cell)] py-3.5 text-[16px] text-[var(--we-text)] active:bg-[var(--we-bg)]">Log Out</button>}
            <p className="pb-2 pt-6 text-center text-[12.5px] text-[var(--we-hint)]">Birdie, by Klvr</p>
          </div>
        </div>
      </Screen>
      {birdie && <div className="absolute inset-0 z-[66] flex flex-col bg-[var(--we-bg)]"><BirdieSettings onBack={() => setBirdie(false)} /></div>}

      <ProfileSettingsPage open={sheet === "profile"} onClose={() => setSheet(null)} />
      <Page open={sheet === "logout"} onClose={() => setSheet(null)} title="Log Out">
        <div className="flex flex-col items-center px-8 pb-6 pt-10 text-center">
          <Avatar initials={initials(profile.name)} color="#A63FBD" size={64} />
          <p className="mt-3 text-[17px] font-medium text-[var(--we-text)]">Log out of Birdie?</p>
          <p className="mt-1 text-[14px] text-[var(--we-sub)]">Your courses, chats and balance stay safe in your account. Log back in with {auth.email ?? "your email"} any time.</p>
        </div>
        <div className="space-y-2 px-4">
          <button onClick={async () => { setSheet(null); close(); await signOut(); resetAll(); }} className="w-full rounded-[6px] bg-[var(--we-cell)] py-3 text-[16px] font-medium text-[var(--we-red)]">Log Out</button>
          <button onClick={() => setSheet(null)} className="w-full rounded-[6px] py-3 text-[16px] text-[var(--we-text)]">Cancel</button>
        </div>
        <p className="pt-10 text-center text-[12.5px] text-[var(--we-hint)]">Birdie, by Klvr</p>
      </Page>
      <Sheet open={sheet === "about"} onClose={() => setSheet(null)} title="About Birdie">
        <div className="space-y-3 text-[13.5px] leading-relaxed text-[var(--dim)]">
          <p><b className="text-[var(--text)]">Birdie</b> turns your courses into a study partner that knows what you were taught: ask it questions, make flashcards, get quizzed, and it only answers from your own notes and files. Help is provided by <b className="text-[var(--text)]">Unisupport</b>, the company behind our writers and help desk.</p>
          <p><b className="text-[var(--text)]">Courses</b> holds your courses, notes, files and recordings. <b className="text-[var(--text)]">Chats</b> is where you talk to Birdie AI, Unisupport Help, classmates, groups and verified accounts like your SUG. <b className="text-[var(--text)]">Discover</b> is where students share and follow each other. <b className="text-[var(--text)]">Me</b> has your wallet, Plus and settings.</p>
          <div className="flex items-center gap-2 text-[var(--uni-deep)]"><ShieldCheck size={16} /> Your recordings and notes stay private to you.</div>
          <div className="flex items-center gap-2 text-[var(--study)]"><UserRound size={16} /> You control who can see and message you.</div>
        </div>
      </Sheet>
    </>
  );
}
