"use client";

// Settings > your profile, as a page: what shows on your channel, your Birdie ID (changes once a week),
// your school (with the ID card check), and private details only you and Birdie use.
import { BadgeCheck, ChevronRight, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cleanUrl } from "./live/socialData";
import { myHandleInfo, mySchoolVerification, type SchoolCheck } from "./live/verifyData";
import { CountryPicker, RegionPicker, SchoolPicker } from "./PlacePicker";
import { useApp, type Profile } from "./store";
import { Page } from "./ui";
import { SchoolVerifyPage } from "./Verify";

const Head = ({ children }: { children: ReactNode }) => <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{children}</div>;
const Input = ({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: "text" | "numeric" }) => (
  <label className="flex items-center border-b border-[var(--we-sep)] px-4 last:border-0">
    <span className="w-24 shrink-0 text-[16px] text-[var(--we-text)]">{label}</span>
    <input value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
  </label>
);
const Nav = ({ label, value, onClick }: { label: string; value?: ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="flex w-full items-center gap-2 border-b border-[var(--we-sep)] px-4 py-3.5 text-left last:border-0 active:bg-[var(--we-bg)]">
    <span className="w-24 shrink-0 text-[16px] text-[var(--we-text)]">{label}</span>
    <span className="min-w-0 flex-1 truncate text-right text-[15px] text-[var(--we-sub)]">{value}</span>
    <ChevronRight size={18} className="shrink-0 text-[var(--we-hint)]" />
  </button>
);
const INTERESTS = ["Tech", "Business", "Football", "Music", "Faith", "Fashion", "Writing", "Gaming", "Design", "Health", "Politics", "Movies", "Photography", "Volunteering"];

export function ProfileSettingsPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, saveProfile, flash } = useApp();
  const [d, setD] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [sub, setSub] = useState<null | "id" | "school" | "verify">(null);
  const [check, setCheck] = useState<SchoolCheck | null>(null);
  const [custom, setCustom] = useState("");
  useEffect(() => { if (open) { void Promise.resolve().then(() => setD(profile)); void mySchoolVerification().then(setCheck); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Profile>(k: K) => (v: Profile[K]) => setD((x) => ({ ...x, [k]: v }));
  const interests = d.interests ?? [];
  const toggle = (t: string) => set("interests")(interests.includes(t) ? interests.filter((x) => x !== t) : [...interests, t].slice(0, 12));

  async function save() {
    const links = (d.links ?? []).filter((l) => l.url.trim());
    const bad = links.find((l) => !cleanUrl(l.url));
    if (bad) return flash(`"${bad.url}" isn't a valid web link`);
    setSaving(true);
    // The Birdie ID has its own page (once a week), so it isn't saved from here.
    const err = await saveProfile({ ...d, handle: profile.handle, links: links.map((l) => ({ label: l.label.trim(), url: cleanUrl(l.url)! })) });
    setSaving(false);
    if (err) return flash("Couldn't save. Check your connection.");
    onClose(); flash("Profile saved");
  }
  const schoolChanged = (check?.status === "verified") && d.institution !== profile.institution;

  return (
    <Page open={open} onClose={onClose} title="My Profile" right={<button disabled={!d.name.trim() || saving} onClick={() => void save()} className="mr-2 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">{saving ? "Saving" : "Save"}</button>}>
      <Head>On your channel</Head>
      <div className="bg-[var(--we-cell)]">
        <Input label="Name" value={d.name} onChange={set("name")} placeholder="Your full name" />
        <Nav label="Birdie ID" value={profile.handle ? `@${profile.handle}` : "Not set"} onClick={() => setSub("id")} />
        <Input label="Level" value={d.level} onChange={set("level")} placeholder="e.g. 300 Level" />
        <Input label="Course" value={d.program} onChange={set("program")} placeholder="e.g. Computer Science" />
        <label className="block border-b border-[var(--we-sep)] px-4 py-3"><span className="mb-1.5 block text-[16px] text-[var(--we-text)]">Description</span>
          <textarea value={d.bio} onChange={(e) => set("bio")(e.target.value.slice(0, 300))} rows={3} placeholder="What you post, what you study" className="w-full resize-none bg-transparent text-[15px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" /></label>
        <div className="px-4 py-3">
          <div className="mb-2 text-[16px] text-[var(--we-text)]">Links</div>
          <div className="space-y-2">
            {(d.links ?? []).map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={l.label} onChange={(e) => set("links")((d.links ?? []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label" className="w-24 shrink-0 rounded-[4px] bg-[var(--we-bg)] px-2.5 py-2 text-[14px] text-[var(--we-text)] outline-none" />
                <input value={l.url} onChange={(e) => set("links")((d.links ?? []).map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="instagram.com/you" className="min-w-0 flex-1 rounded-[4px] bg-[var(--we-bg)] px-2.5 py-2 text-[14px] text-[var(--we-text)] outline-none" />
                <button onClick={() => set("links")((d.links ?? []).filter((_, j) => j !== i))} aria-label="Remove link" className="text-[var(--we-hint)]"><X size={17} /></button>
              </div>
            ))}
            {(d.links ?? []).length < 5 && <button onClick={() => set("links")([...(d.links ?? []), { label: "", url: "" }])} className="text-[14.5px] text-[var(--we-link)]">+ Add a link</button>}
          </div>
        </div>
      </div>

      <Head>School</Head>
      <div className="bg-[var(--we-cell)]">
        <div className="space-y-2 px-4 py-3">
          <CountryPicker value={d.country} onChange={(v) => setD((x) => ({ ...x, country: v, region: v === x.country ? x.region : "" }))} />
          <RegionPicker country={d.country} value={d.region ?? ""} onChange={set("region")} />
          <SchoolPicker country={d.country} region={d.region} value={d.institution} onChange={set("institution")} />
        </div>
        <Nav label="Verified" value={check?.current ? <span className="inline-flex items-center gap-1 text-[#2AAE67]"><BadgeCheck size={16} /> Yes</span> : check?.status === "review" ? "Being checked" : "Verify with your ID card"} onClick={() => setSub("verify")} />
      </div>
      {schoolChanged && <p className="px-4 pt-2 text-[12.5px] text-[#C77700]">Changing your school removes your verified tick until you verify the new one.</p>}

      <Head>Only you and Birdie see these</Head>
      <div className="bg-[var(--we-cell)]">
        <Input label="Matric no." value={d.matric ?? ""} onChange={(v) => set("matric")(v.toUpperCase().slice(0, 40))} placeholder="Your student ID number" />
        <Input label="Address" value={d.address ?? ""} onChange={(v) => set("address")(v.slice(0, 160))} placeholder="Hostel, room or home address" />
        <div className="px-4 py-3">
          <div className="mb-2 text-[16px] text-[var(--we-text)]">What you&apos;re into</div>
          <div className="flex flex-wrap gap-2">
            {[...INTERESTS, ...interests.filter((t) => !INTERESTS.includes(t))].map((t) => (
              <button key={t} onClick={() => toggle(t)} className={`rounded-full px-3 py-1.5 text-[14px] ${interests.includes(t) ? "bg-[var(--we-accent)] text-white" : "bg-[var(--we-bg)] text-[var(--we-text)]"}`}>{t}</button>
            ))}
            <input value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 24))} onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { toggle(custom.trim()); setCustom(""); } }} placeholder="+ Add your own" className="w-32 rounded-full bg-[var(--we-bg)] px-3 py-1.5 text-[14px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
          </div>
        </div>
      </div>
      <p className="px-4 pb-10 pt-2 text-[12.5px] leading-snug text-[var(--we-hint)]">Your matric number is checked against your student ID card. Birdie uses your interests to pick Discover posts and suggest people. None of this shows on your channel.</p>

      <BirdieIdPage open={sub === "id"} onClose={() => setSub(null)} />
      <SchoolVerifyPage open={sub === "verify"} onClose={() => { setSub(null); void mySchoolVerification().then(setCheck); }} />
    </Page>
  );
}

/** Your Birdie ID: people find you with it. It changes at most once every 7 days. */
export function BirdieIdPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, saveProfile, flash } = useApp();
  const [v, setV] = useState("");
  const [next, setNext] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => { if (open) { void Promise.resolve().then(() => { setV(profile.handle); setNow(Date.now()); }); void myHandleInfo().then((i) => setNext(i?.next_change ?? null)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = !!next && new Date(next).getTime() > now;
  const valid = /^[a-z0-9._]{4,24}$/.test(v) && !/^[._]|[._]$/.test(v);
  async function save() {
    setBusy(true);
    const err = await saveProfile({ ...profile, handle: v });
    setBusy(false);
    if (err === "handle_taken") return flash(`@${v} is taken. Try another.`);
    if (err === "handle_weekly") return flash("You can change it once a week");
    if (err) return flash("Couldn't save. Check your connection.");
    onClose(); flash("Birdie ID changed");
  }
  return (
    <Page open={open} onClose={onClose} title="Birdie ID" right={!locked && <button disabled={!valid || v === profile.handle || busy} onClick={() => void save()} className="mr-2 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">Save</button>}>
      <div className="mt-3 flex items-center bg-[var(--we-cell)] px-4">
        <span className="text-[16px] text-[var(--we-hint)]">@</span>
        <input value={v} disabled={locked} onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 24))} className="min-w-0 flex-1 bg-transparent py-3.5 pl-1 text-[16px] text-[var(--we-text)] outline-none disabled:text-[var(--we-sub)]" />
      </div>
      <p className="px-4 pt-2 text-[13px] leading-snug text-[var(--we-sub)]">
        {next === undefined ? "" : locked ? `You changed it recently. You can change it again on ${new Date(next!).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}.`
          : "4 to 24 letters, numbers, dots or underscores. Friends find you with it. You can change it once a week."}
      </p>
    </Page>
  );
}
