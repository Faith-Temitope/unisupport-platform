"use client";

// Ads, bought and run by the business itself. Ad credit is topped up with Paystack; a campaign holds its
// budget from the credit and spends ₦500 per 1,000 students reached at your school (₦1,000 beyond it,
// verified only). Each student is charged once. Every ad is checked before it runs, students can report
// it, and whatever isn't spent goes back to your credit.
import { Megaphone, Pause, Play, Rocket, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Area, Box, Empty, Field, Head, PhotoPick, Pick, Pill, Primary, Row, SaveBtn, Secondary } from "./bizkit";
import { adCreate, adminTestCredit, adReview, adSet, bizAds, bizOpportunities, errText, naira, startPayment, type AdFormat, type BizHome, type Campaign, type Opportunity } from "./live/bizData";
import { useApp } from "./store";
import { Page } from "./ui";

const FORMATS: [AdFormat, string, string][] = [
  ["boost", "Boost", "Moments and the top of your category. The easy one."],
  ["moment", "Moments", "A sponsored post in the Moments feed"],
  ["featured", "Featured", "Top of Campus Deals, your Mini Programs category and Internships"],
  ["search", "Search", "First result when students search"],
  ["course_card", "Courses", "A card in the Courses tab"],
  ["channels", "Channels", "A sponsored video in the Channels feed (needs a video)"],
];
const STATUS_TONE: Record<Campaign["status"], "green" | "amber" | "grey" | "red"> = { live: "green", review: "amber", paused: "amber", ended: "grey", rejected: "red" };

export function BizAds({ b, onChanged }: { b: BizHome; onChanged: () => void }) {
  const { flash } = useApp();
  const [list, setList] = useState<Campaign[] | null>(null);
  const [make, setMake] = useState<null | "boost" | "full">(null);
  const [topUp, setTopUp] = useState(false);
  const [one, setOne] = useState<Campaign | null>(null);
  const load = useCallback(() => { void bizAds(b.id).then(setList); }, [b.id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const live = b.level !== "none" && b.status === "active";
  return (
    <div>
      <div className="bg-[var(--we-cell)] px-4 py-4">
        <div className="text-[13px] text-[var(--we-sub)]">Ad credit</div>
        <div className="text-[28px] font-semibold text-[var(--we-text)]">{naira(b.ad_credit)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setTopUp(true)} className="rounded-[6px] bg-[var(--we-bg)] py-2.5 text-[15px] text-[var(--we-text)]">Top Up</button>
          <button disabled={!live} onClick={() => setMake("boost")} className="flex items-center justify-center gap-1.5 rounded-[6px] bg-[var(--we-accent)] py-2.5 text-[15px] font-medium text-white disabled:opacity-40"><Rocket size={16} /> Boost</button>
        </div>
      </div>
      {!live && <p className="px-4 pt-2 text-[13px] text-[#C77700]">Finish setting up (Home) before running ads.</p>}
      <Head right={live ? <button onClick={() => setMake("full")} className="text-[var(--we-link)]">New ad</button> : undefined}>Your ads</Head>
      {list === null ? <p className="py-6 text-center text-[var(--we-sub)]">Loading...</p> : list.length === 0 ? <Box><Empty icon={<Megaphone size={32} />} title="No ads yet" sub={`₦${500} reaches 1,000 students at your school. Each student is counted once.`} /></Box> : (
        <Box>{list.map((c) => (
          <Row key={c.id} label={<span className="flex items-center gap-1.5"><span className="truncate">{c.title}</span><Pill tone={STATUS_TONE[c.status]}>{c.status}</Pill></span>}
            sub={`${FORMATS.find((f) => f[0] === c.format)?.[1]} · ${c.reach.toLocaleString()} reached · ${c.clicks} taps · ${naira(c.spent)} of ${naira(c.budget)}`} onClick={() => setOne(c)} />
        ))}</Box>
      )}
      <p className="px-4 pb-8 pt-3 text-[12.5px] leading-snug text-[var(--we-hint)]">Your school: ₦500 per 1,000 students reached. Other schools or nationwide: ₦1,000 per 1,000 (verified businesses). Advertisers never see who the students are, only totals. Plus members only see featured listings.</p>
      <TopUp open={topUp} b={b} onClose={() => setTopUp(false)} onDone={() => { setTopUp(false); onChanged(); }} />
      <MakeAd open={!!make} quick={make === "boost"} b={b} onClose={() => setMake(null)} onMade={() => { setMake(null); load(); onChanged(); }} />
      {one && <AdStats c={one} onClose={() => { setOne(null); load(); onChanged(); }} />}
    </div>
  );
}

function TopUp({ open, b, onClose, onDone }: { open: boolean; b: BizHome; onClose: () => void; onDone: () => void }) {
  const { flash } = useApp();
  const [amt, setAmt] = useState("5000");
  const [busy, setBusy] = useState(false);
  async function go() {
    const n = Number(amt);
    setBusy(true);
    if (b.is_test) { const r = await adminTestCredit(b.id, n); setBusy(false); if (r.error) return flash(errText(r.error)); flash("Test credit added"); return onDone(); }
    const r = await startPayment("ad_credit", b.id, n); setBusy(false);
    if (r.authorization_url) window.location.href = r.authorization_url; else flash(errText(r.error));
  }
  return (
    <Page open={open} onClose={onClose} title="Top Up Ad Credit">
      <div className="flex flex-wrap gap-2 px-4 pt-4">{[2000, 5000, 10000, 25000, 50000].map((n) => <button key={n} onClick={() => setAmt(String(n))} className={`rounded-full px-4 py-2 text-[14.5px] ${amt === String(n) ? "bg-[var(--we-accent)] text-white" : "bg-[var(--we-cell)] text-[var(--we-text)]"}`}>{naira(n)}</button>)}</div>
      <Box className="mt-3"><Field label="Amount (₦)" value={amt} onChange={(v) => setAmt(v.replace(/\D/g, ""))} inputMode="numeric" /></Box>
      <p className="px-4 pt-2 text-[13px] text-[var(--we-sub)]">{naira(Number(amt) || 0)} reaches about {Math.floor((Number(amt) || 0) / 0.5).toLocaleString()} students at your school.</p>
      <div className="px-4 pt-4"><Primary disabled={busy || Number(amt) < 1000} onClick={() => void go()}>{b.is_test ? "Add Test Credit" : `Pay ${naira(Number(amt) || 0)}`}</Primary></div>
      <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">Ad credit is for ads only and isn&apos;t refunded as cash. Unspent campaign budget always comes back to your credit.</p>
    </Page>
  );
}

function MakeAd({ open, quick, b, onClose, onMade }: { open: boolean; quick: boolean; b: BizHome; onClose: () => void; onMade: () => void }) {
  const { flash } = useApp();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const blank = { format: "boost" as AdFormat, goal: b.biz_type === "organisation" ? "applications" : b.biz_type === "campus_business" ? "orders" : "followers", title: "", body: "", cta_label: b.biz_type === "campus_business" ? "Order Now" : b.biz_type === "organisation" ? "Apply" : "Follow",
    target: b.biz_type === "organisation" ? "opportunity" : "profile", target_id: "", url: "", media_url: null as string | null, scope: "own_school", schools: "", states: "", levels: "", courses: "", interests: "", budget: "1000", days: "7" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { void Promise.resolve().then(() => setF(blank)); if (b.biz_type === "organisation") void bizOpportunities(b.id).then((o) => setOpps(o.filter((x) => x.status === "live"))); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const cpm = f.scope === "multi" ? 1000 : 500;
  const reach = Math.floor((Number(f.budget) || 0) / cpm * 1000);
  async function go() {
    setBusy(true);
    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const days = Number(f.days) || 0;
    const r = await adCreate(b.id, { ...f, format: quick ? "boost" : f.format, budget: Number(f.budget), target_id: f.target === "opportunity" ? f.target_id : null,
      media_kind: f.media_url ? (/\.(mp4|mov|webm)(\?|$)/i.test(f.media_url) ? "video" : "image") : "none",
      schools: split(f.schools), states: split(f.states), levels: split(f.levels), courses: split(f.courses), interests: split(f.interests),
      ends_at: days > 0 ? new Date(Date.now() + days * 86400e3).toISOString() : null });
    if (r.error || !r.data) { setBusy(false); return flash(errText(r.error)); }
    const m = await adReview(r.data.id);
    setBusy(false);
    flash(m.ok ? "Your ad is live" : m.reason ?? "It's being checked");
    onMade();
  }
  const ok = f.title.trim().length >= 3 && Number(f.budget) >= 1000 && Number(f.budget) <= b.ad_credit && (f.target !== "opportunity" || f.target_id) && (f.target !== "url" || /^https:\/\//.test(f.url));
  return (
    <Page open={open} onClose={onClose} title={quick ? "Boost" : "New Ad"} right={<SaveBtn label="Run" disabled={!ok || busy} onClick={() => void go()} />}>
      {!quick && (<>
        <Head>Where</Head>
        <Box>{FORMATS.map(([id, l, s]) => (
          <button key={id} onClick={() => set("format")(id)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
            <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">{l}</span><span className="block text-[13px] text-[var(--we-sub)]">{s}</span></span>
            <span className={`h-5 w-5 rounded-full border-2 ${f.format === id ? "border-[var(--we-accent)] bg-[var(--we-accent)] shadow-[inset_0_0_0_3px_var(--we-cell)]" : "border-[var(--we-hint)]"}`} />
          </button>
        ))}</Box>
      </>)}
      <Head>The ad</Head>
      <Box>
        <Field label="Headline" value={f.title} onChange={set("title")} placeholder={b.biz_type === "campus_business" ? "e.g. Jollof Friday: ₦1,200 plates" : "e.g. SIWES places open"} />
        <Area label="Text" value={f.body} onChange={set("body")} rows={3} max={300} />
        <PhotoPick oa={b.id} label="Picture or video" video value={f.media_url} onChange={set("media_url")} />
        <Field label="Button" value={f.cta_label} onChange={(v) => set("cta_label")(v.slice(0, 24))} />
        {!quick && <Pick label="Opens" value={f.target} onChange={set("target")} options={[["profile", "Your page"], ...(b.biz_type === "organisation" ? [["opportunity", "A job"]] as [string, string][] : []), ["url", "A website"]]} />}
        {f.target === "opportunity" && <Pick label="Job" value={f.target_id} onChange={set("target_id")} options={[["", "Choose"], ...opps.map((o) => [o.id, o.title] as [string, string])]} />}
        {f.target === "url" && <Field label="Link" value={f.url} onChange={set("url")} placeholder="https://..." />}
        {!quick && <Pick label="Goal" value={f.goal} onChange={set("goal")} options={[["visits", "Visits"], ["orders", "Orders"], ["applications", "Applications"], ["followers", "Followers"]]} />}
      </Box>
      <Head>Who</Head>
      <Box>
        <Pick label="Reach" value={f.scope} onChange={set("scope")} options={[["own_school", `My school${b.schools.length > 1 ? "s" : ""} (₦500 / 1,000)`], ...(b.verified ? [["multi", "Other schools or nationwide (₦1,000 / 1,000)"]] as [string, string][] : [])]} />
        {f.scope === "multi" && <Field label="Schools" value={f.schools} onChange={set("schools")} placeholder="Empty = every school" />}
        {!quick && <>
          <Field label="States" value={f.states} onChange={set("states")} placeholder="Empty = any" />
          <Field label="Levels" value={f.levels} onChange={set("levels")} placeholder="e.g. 100, 200 (empty = any)" />
          <Field label="Courses" value={f.courses} onChange={set("courses")} placeholder="Empty = any" />
          <Field label="Interests" value={f.interests} onChange={set("interests")} placeholder="e.g. Food, Tech (empty = any)" />
        </>}
      </Box>
      <Head>Budget</Head>
      <Box>
        <Field label="Budget (₦)" value={f.budget} onChange={(v) => set("budget")(v.replace(/\D/g, ""))} inputMode="numeric" />
        <Field label="Days" value={f.days} onChange={(v) => set("days")(v.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="Empty = until the budget runs out" />
      </Box>
      <p className="px-4 pb-10 pt-2 text-[13px] text-[var(--we-sub)]">Reaches up to {reach.toLocaleString()} students, each counted once. {Number(f.budget) > b.ad_credit ? <span className="text-[var(--we-red)]">Top up first: you have {naira(b.ad_credit)}.</span> : "Every ad is checked before it runs. Unspent budget comes back to your credit."}</p>
    </Page>
  );
}

function AdStats({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const { flash } = useApp();
  const [x, setX] = useState(c);
  async function act(a: "pause" | "resume" | "end") {
    if (a === "end" && !confirm("End this ad? What's left goes back to your credit.")) return;
    const r = await adSet(x.id, a);
    if (r.error || !r.data) return flash(errText(r.error)); setX(r.data);
  }
  const ctr = x.reach ? Math.round((x.clicks / x.reach) * 1000) / 10 : 0;
  return (
    <Page open onClose={onClose} title={x.title}>
      <div className="grid grid-cols-3 bg-[var(--we-cell)] py-4 text-center">
        {([["Reached", x.reach.toLocaleString()], ["Taps", `${x.clicks} (${ctr}%)`], ["Results", String(x.results ?? 0)]] as const).map(([l, v]) => <span key={l}><span className="block text-[19px] font-semibold text-[var(--we-text)]">{v}</span><span className="text-[12px] text-[var(--we-sub)]">{l}</span></span>)}
      </div>
      <Box className="mt-2">
        <Row label="Status" value={<Pill tone={STATUS_TONE[x.status]}>{x.status}</Pill>} />
        {x.moderation?.reason && <Row label="Why" sub={x.moderation.reason} />}
        <Row label="Spent" value={`${naira(x.spent)} of ${naira(x.budget)}`} />
        {x.refunded > 0 && <Row label="Back to credit" value={naira(x.refunded)} />}
        <Row label="Price" value={`${naira(x.cpm)} / 1,000 students`} />
        <Row label="Views" value={x.views.toLocaleString()} />
        {x.reports > 0 && <Row label="Reports" value={x.reports} />}
        {x.results !== undefined && x.goal !== "visits" && x.results > 0 && <Row label={`Cost per ${x.goal.replace(/s$/, "")}`} value={naira(x.spent / x.results)} />}
        <Row label="Ends" value={x.ends_at ? new Date(x.ends_at).toLocaleDateString() : "When the budget runs out"} />
      </Box>
      <div className="space-y-2 px-4 pb-10 pt-4">
        {x.status === "live" && <Secondary onClick={() => void act("pause")}><span className="inline-flex items-center gap-2"><Pause size={16} /> Pause</span></Secondary>}
        {x.status === "paused" && <Secondary onClick={() => void act("resume")}><span className="inline-flex items-center gap-2"><Play size={16} /> Resume</span></Secondary>}
        {x.status === "review" && <Secondary onClick={async () => { const r = await adReview(x.id); flash(r.ok ? "It's live now" : r.reason ?? errText(r.error)); onClose(); }}>Check It Again</Secondary>}
        {["live", "paused", "review"].includes(x.status) && <Secondary onClick={() => void act("end")}><span className="inline-flex items-center gap-2 text-[var(--we-red)]"><Square size={16} /> End and Get the Rest Back</span></Secondary>}
      </div>
    </Page>
  );
}
