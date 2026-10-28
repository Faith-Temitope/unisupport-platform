"use client";

// Verification. Students prove their school with their student ID card and a selfie: Birdie reads the
// card and checks it against their profile, and the tick shows next to their name at their school.
// Verified accounts (an SUG, a department, a company) send documents and a selfie of the person applying,
// and agree that it's all true. The Birdie team checks every one.
import { BadgeCheck, Building2, Camera, CheckCircle2, FileText, GraduationCap, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { applyOfficial, myOfficialApplications } from "./live/chatData";
import { mySchoolVerification, uploadVerification, verifyStudent, type SchoolCheck } from "./live/verifyData";
import { useApp } from "./store";
import { Page } from "./ui";

/** A photo slot: opens the camera (front for selfies), shows the shot, uploads it privately. */
export function Shot({ label, hint, selfie, pdf, value, onDone }: { label: string; hint: string; selfie?: boolean; pdf?: boolean; value: { path: string; url: string } | null; onDone: (v: { path: string; url: string } | null) => void }) {
  const { flash } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    const r = await uploadVerification(f);
    setBusy(false);
    if (r.error || !r.path) return flash(r.error ?? "Couldn't upload it");
    onDone({ path: r.path, url: f.type.startsWith("image/") ? URL.createObjectURL(f) : "" });
  }
  return (
    <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0 active:bg-[var(--we-bg)]">
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-[var(--we-bg)] text-[var(--we-hint)] ${selfie ? "rounded-full" : "rounded-[6px]"}`}>
        {busy ? <Loader2 size={22} className="animate-spin" /> : value?.url ? <img src={value.url} alt="" className="h-full w-full object-cover" /> : value ? <FileText size={22} /> : <Camera size={22} />}
      </span>
      <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">{label}</span><span className="block text-[13px] text-[var(--we-sub)]">{value ? "Added. Tap to retake." : hint}</span></span>
      {value && <CheckCircle2 size={20} className="shrink-0 text-[#2AAE67]" />}
      <input ref={input} type="file" hidden accept={pdf ? "image/*,application/pdf" : "image/*"} {...(selfie ? { capture: "user" as const } : pdf ? {} : { capture: "environment" as const })} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
    </button>
  );
}

const Declare = ({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: ReactNode }) => (
  <label className="flex items-start gap-3 px-4 py-4 text-[13.5px] leading-snug text-[var(--we-sub)]">
    <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--we-accent)]" />
    <span>{children}</span>
  </label>
);

const Field = ({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <label className="flex items-center border-b border-[var(--we-sep)] px-4 last:border-0">
    <span className="w-28 shrink-0 text-[16px] text-[var(--we-text)]">{label}</span>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
  </label>
);
const Head = ({ children }: { children: ReactNode }) => <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{children}</div>;

// ---------- Students
export function SchoolVerifyPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile, flash } = useApp();
  const [check, setCheck] = useState<SchoolCheck | null>(null);
  const [matric, setMatric] = useState("");
  const [card, setCard] = useState<{ path: string; url: string } | null>(null);
  const [selfie, setSelfie] = useState<{ path: string; url: string } | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string; note?: string | null } | null>(null);
  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => { setMatric(profile.matric ?? ""); setCard(null); setSelfie(null); setAgree(false); setResult(null); });
    void mySchoolVerification().then(setCheck);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!profile.institution) return flash("Add your school to your profile first");
    setBusy(true);
    if (matric.trim() && matric.trim() !== profile.matric) setProfile({ matric: matric.trim() });
    const r = await verifyStudent(card!.path, selfie!.path, matric.trim());
    setBusy(false);
    if (!r.status) return flash(r.error === "three_a_day" ? "That's 3 tries today. Try again tomorrow." : r.error === "no_school" ? "Add your school to your profile first" : "Couldn't check it right now. Try again.");
    setResult({ status: r.status, note: r.note });
    void mySchoolVerification().then(setCheck);
  }

  const done = check?.current;
  return (
    <Page open={open} onClose={onClose} title="Verify Your School">
      <div className="flex flex-col items-center bg-[var(--we-cell)] px-6 pb-5 pt-6 text-center">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full ${done ? "bg-[#E7F7EE] text-[#2AAE67]" : "bg-[var(--we-bg)] text-[var(--we-accent)]"}`}>{done ? <BadgeCheck size={34} /> : <GraduationCap size={34} />}</span>
        <p className="mt-3 text-[17px] font-medium text-[var(--we-text)]">{done ? `Verified at ${check?.school}` : profile.institution || "Add your school first"}</p>
        <p className="mt-1 text-[13.5px] text-[var(--we-sub)]">{done ? "Classmates see the tick next to your name." : check?.status === "review" ? "Being checked by the Birdie team." : "Anyone can type a school. A tick shows you really go there."}</p>
      </div>

      {result ? (
        <div className="mt-2 flex items-start gap-3 bg-[var(--we-cell)] px-4 py-4">
          {result.status === "verified" ? <CheckCircle2 size={24} className="shrink-0 text-[#2AAE67]" /> : result.status === "review" ? <ShieldCheck size={24} className="shrink-0 text-[#F5A623]" /> : <XCircle size={24} className="shrink-0 text-[var(--we-red)]" />}
          <span className="text-[15px] text-[var(--we-text)]">{result.status === "verified" ? "You're verified. The tick is on your profile." : result.status === "review" ? "Almost. The Birdie team will look at it and let you know." : result.note || "That didn't match. Try again with a clear photo."}</span>
        </div>
      ) : !done && profile.institution ? (<>
        <Head>Your details</Head>
        <div className="bg-[var(--we-cell)]">
          <Field label="Name" value={profile.name} onChange={() => {}} />
          <Field label="School" value={profile.institution} onChange={() => {}} />
          <Field label="Matric no." value={matric} onChange={(v) => setMatric(v.toUpperCase().slice(0, 40))} placeholder="As on your ID card" />
        </div>
        <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">Name and school come from your profile. They have to match the card.</p>
        <Head>Photos</Head>
        <div className="bg-[var(--we-cell)]">
          <Shot label="Student ID card" hint="The front, flat, in good light, every word readable" value={card} onDone={setCard} />
          <Shot label="A selfie, now" hint="Your face, clear, no glasses or cap" selfie value={selfie} onDone={setSelfie} />
        </div>
        <Declare on={agree} set={setAgree}>This is my own student ID card and my own face. I understand that a fake or someone else&apos;s card gets my account removed.</Declare>
        <div className="px-4 pb-10"><button disabled={!card || !selfie || !agree || busy} onClick={() => void submit()} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white disabled:opacity-40">{busy ? "Checking..." : "Verify"}</button>
          <p className="mt-3 text-center text-[12px] text-[var(--we-hint)]">Your photos stay private. Only Birdie and the Birdie team see them.</p></div>
      </>) : null}
    </Page>
  );
}

// ---------- Verified accounts
const KINDS = [
  { id: "school", label: "School body", sub: "SUG, faculty, department, a school office", Icon: GraduationCap, categories: [["sug", "Students' Union"], ["department", "Department or faculty"], ["school", "School office"]] },
  { id: "company", label: "Company or organisation", sub: "A business, NGO or government office", Icon: Building2, categories: [["company", "Company"], ["organisation", "Organisation or NGO"], ["government", "Government"]] },
] as const;

export function ApplyVerifiedPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { flash, profile } = useApp();
  const empty = { name: "", handle: "", category: "", school: "", about: "", phone: "", email: "", role: "", address: "", cac: "", website: "", staff_id: "" };
  const [kind, setKind] = useState<"school" | "company" | null>(null);
  const [f, setF] = useState(empty);
  const [files, setFiles] = useState<Record<string, { path: string; url: string } | null>>({});
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apps, setApps] = useState<Awaited<ReturnType<typeof myOfficialApplications>>>([]);
  useEffect(() => { if (open) void myOfficialApplications().then(setApps); }, [open]);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const file = (k: string) => (v: { path: string; url: string } | null) => setFiles((x) => ({ ...x, [k]: v }));
  const ready = kind && f.name.trim().length > 1 && f.phone.trim() && f.role.trim() && files.selfie && files.id_card && agree && (kind === "school" ? f.school.trim() : f.cac.trim());

  async function submit() {
    setBusy(true);
    const r = await applyOfficial({
      name: f.name, handle: f.handle, category: f.category || (kind === "school" ? "school" : "company"), school: f.school, about: f.about,
      contact_name: profile.name, phone: f.phone, email: f.email, proof: [f.cac && `CAC ${f.cac}`, f.website].filter(Boolean).join(" · "),
      declared: "true",
      details: { role: f.role, address: f.address, cac: f.cac, website: f.website, staff_id: f.staff_id },
      files: Object.fromEntries(Object.entries(files).filter(([, v]) => v).map(([k, v]) => [k, v!.path])),
    });
    setBusy(false);
    if (r.error) return flash(r.error === "too_many" ? "You already have requests being checked" : r.error === "declaration_required" ? "Tick the declaration first" : r.error === "selfie_required" ? "Add a selfie" : "Couldn't send it. Check the details.");
    flash("Sent. We'll check it and let you know."); setF(empty); setFiles({}); setAgree(false); setKind(null);
    void myOfficialApplications().then(setApps);
  }

  return (
    <Page open={open} onClose={onClose} title="Get a Verified Account">
      {apps.length > 0 && (<>
        <Head>Your requests</Head>
        <div className="bg-[var(--we-cell)]">{apps.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b border-[var(--we-sep)] px-4 py-3 last:border-0"><span className="text-[16px] text-[var(--we-text)]">{a.name}</span><span className={`text-[14px] ${a.status === "approved" ? "text-[#2AAE67]" : a.status === "rejected" ? "text-[var(--we-red)]" : "text-[var(--we-sub)]"}`}>{a.status === "pending" ? "Being checked" : a.status === "approved" ? "Approved" : "Not approved"}</span></div>
        ))}</div>
      </>)}
      <Head>Who is it for?</Head>
      <div className="bg-[var(--we-cell)]">{KINDS.map((k) => (
        <button key={k.id} onClick={() => { setKind(k.id); setF((x) => ({ ...x, category: k.categories[0][0] })); }} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
          <k.Icon size={22} className="shrink-0 text-[var(--we-accent)]" />
          <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">{k.label}</span><span className="block text-[13px] text-[var(--we-sub)]">{k.sub}</span></span>
          <span className={`h-5 w-5 rounded-full border-2 ${kind === k.id ? "border-[var(--we-accent)] bg-[var(--we-accent)] shadow-[inset_0_0_0_3px_var(--we-cell)]" : "border-[var(--we-hint)]"}`} />
        </button>
      ))}</div>

      {kind && (<>
        <Head>The account</Head>
        <div className="bg-[var(--we-cell)]">
          <Field label="Name" value={f.name} onChange={set("name")} placeholder={kind === "school" ? "e.g. SUG FUL" : "e.g. Dangote SIWES"} />
          <Field label="Handle" value={f.handle} onChange={(v) => set("handle")(v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30))} placeholder="e.g. sug_ful" />
          <label className="flex items-center border-b border-[var(--we-sep)] px-4"><span className="w-28 shrink-0 text-[16px] text-[var(--we-text)]">Type</span>
            <select value={f.category} onChange={(e) => set("category")(e.target.value)} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none">{KINDS.find((k) => k.id === kind)!.categories.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          {kind === "school" ? <Field label="School" value={f.school} onChange={set("school")} placeholder="e.g. Federal University Lokoja" /> : <>
            <Field label="CAC no." value={f.cac} onChange={(v) => set("cac")(v.toUpperCase().slice(0, 20))} placeholder="RC or BN number" />
            <Field label="Website" value={f.website} onChange={set("website")} placeholder="If you have one" type="url" />
          </>}
          <Field label="Address" value={f.address} onChange={set("address")} placeholder="Office address" />
          <Field label="About" value={f.about} onChange={set("about")} placeholder="What students get from you" />
        </div>
        <Head>You, the person applying</Head>
        <div className="bg-[var(--we-cell)]">
          <Field label="Your role" value={f.role} onChange={set("role")} placeholder={kind === "school" ? "e.g. SUG PRO, HOD's secretary" : "e.g. HR manager"} />
          {kind === "school" && <Field label="Staff/ID no." value={f.staff_id} onChange={set("staff_id")} placeholder="Staff or matric number" />}
          <Field label="Phone" value={f.phone} onChange={set("phone")} type="tel" />
          <Field label="Email" value={f.email} onChange={set("email")} type="email" placeholder="Official email if you have one" />
        </div>
        <Head>Documents</Head>
        <div className="bg-[var(--we-cell)]">
          <Shot label={kind === "school" ? "Your staff or student ID card" : "Your ID card"} hint={kind === "school" ? "The card from the school" : "NIN slip, voter's card, driver's licence or passport"} value={files.id_card ?? null} onDone={file("id_card")} />
          <Shot label="A selfie, now" hint="So we know it's really you" selfie value={files.selfie ?? null} onDone={file("selfie")} />
          {kind === "company" && <Shot label="CAC certificate" hint="Photo or PDF (helps it go faster)" pdf value={files.cac ?? null} onDone={file("cac")} />}
          {kind === "school" && <Shot label="Letter or appointment (optional)" hint="Anything that shows you speak for this office" pdf value={files.letter ?? null} onDone={file("letter")} />}
        </div>
        <Declare on={agree} set={setAgree}>Everything I&apos;ve given here is true and not falsified, and I&apos;m allowed to speak for this {kind === "school" ? "office" : "company"}. I understand that false information gets the account removed and can be reported.</Declare>
        <div className="px-4 pb-10">
          <button disabled={!ready || busy} onClick={() => void submit()} className="w-full rounded-[6px] bg-[var(--we-accent)] py-3 text-[16px] font-medium text-white disabled:opacity-40">{busy ? "Sending..." : "Request Verification"}</button>
          <p className="mt-3 text-center text-[12px] leading-snug text-[var(--we-hint)]">The Birdie team checks every request before the blue tick. Your documents stay private. Verified accounts can only message students who wrote to them in the last 7 days.</p>
        </div>
      </>)}
    </Page>
  );
}
