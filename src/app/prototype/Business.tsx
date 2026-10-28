"use client";

// Birdie for Business, inside the Birdie app: Me > Switch Account opens your businesses (admins see
// every one, plus Test Mode). Each business has its own tabs: a shop gets Orders and Menu, a company
// gets Jobs, a school body gets Updates; every type gets Home, Ads and More. Nothing here needs anyone
// at Birdie: listing, verification, payouts and refunds all run on their own.
import { BadgeCheck, Briefcase, Building2, Check, ChevronRight, CircleAlert, FlaskConical, GraduationCap, Home as HomeIcon, Inbox, LayoutGrid, Loader2, MapPin, Megaphone, Plus, ShoppingBag, Store as StoreIcon, Users, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BizAds } from "./BizAds";
import { BizJobs } from "./BizJobs";
import { BizBookings, BizMenu, BizOrders } from "./BizShop";
import { Area, Box, BizAvatar, Empty, Field, Head, PhotoPick, Pick, Pill, Primary, Row, SaveBtn, Secondary } from "./bizkit";
import { adminSelfRep, adminSelfVerifySchool, bankList, bankSet, bizCreate, bizHome, bizKycSubmit, bizTeamAdd, bizTeamRemove, bizUpdate, CATEGORIES, errText, myBusinesses, naira, ownerCheck, startPayment, type BizHome, type BizType, type MyBiz } from "./live/bizData";
import { useApp } from "./store";
import { Page } from "./ui";
import { Shot } from "./Verify";

export const openBusiness = (id?: string, view?: string) => window.dispatchEvent(new CustomEvent("birdie-open-biz", { detail: { id, view } }));

/** Mounted once. Opens Switch Account, or straight into a business (from a notification or a link). */
export function BusinessHost() {
  const [state, setState] = useState<{ switcher: boolean; id: string | null; view: string | null }>({ switcher: false, id: null, view: null });
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail ?? {}; setState({ switcher: !d.id, id: d.id ?? null, view: d.view ?? null }); };
    window.addEventListener("birdie-open-biz", on);
    return () => window.removeEventListener("birdie-open-biz", on);
  }, []);
  return (<>
    <SwitchAccount open={state.switcher} onClose={() => setState((s) => ({ ...s, switcher: false }))} onOpen={(id) => setState({ switcher: false, id, view: null })} />
    {state.id && <BusinessMode key={state.id} id={state.id} startView={state.view} onClose={() => setState({ switcher: false, id: null, view: null })} onSwitch={() => setState({ switcher: true, id: null, view: null })} />}
  </>);
}

const TYPE_LABEL: Record<BizType, string> = { campus_business: "Campus business", organisation: "Company or organisation", school_body: "School body" };
const levelPill = (b: { level: string; status?: string; is_test?: boolean }) => b.is_test ? <Pill tone="blue">Test</Pill> : b.status === "suspended" ? <Pill tone="red">Paused</Pill> : b.level === "verified" ? <Pill tone="green">Verified</Pill> : b.level === "listed" ? <Pill tone="accent">Live</Pill> : <Pill tone="amber">Setting up</Pill>;

function SwitchAccount({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const { profile, auth } = useApp();
  const [list, setList] = useState<MyBiz[] | null>(null);
  const [create, setCreate] = useState<false | "real" | "test">(false);
  const [test, setTest] = useState(false);
  const [admin, setAdmin] = useState(false);
  const load = useCallback(() => { void myBusinesses().then(setList); }, []);
  useEffect(() => { if (open) { void Promise.resolve().then(load); void import("@/lib/supabase").then(({ createClient }) => createClient().rpc("is_admin").then(({ data }) => setAdmin(data === true))); } }, [open, load]);
  const mine = (list ?? []).filter((b) => b.mine), others = (list ?? []).filter((b) => !b.mine);
  const rowOf = (b: MyBiz) => (
    <button key={b.id} onClick={() => onOpen(b.id)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0 active:bg-[var(--we-bg)]">
      <BizAvatar b={b} />
      <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-[16px] text-[var(--we-text)]">{b.name}</span>{levelPill(b)}</span>
        <span className="block truncate text-[13px] text-[var(--we-sub)]">{TYPE_LABEL[b.biz_type]}{b.biz_category ? ` · ${b.biz_category}` : ""} · {b.mine ? b.role : "admin access"}{b.pending_orders ? ` · ${b.pending_orders} open orders` : ""}</span></span>
      <ChevronRight size={18} className="text-[var(--we-hint)]" />
    </button>
  );
  return (
    <Page open={open} onClose={onClose} title="Switch Account">
      <Head>You</Head>
      <Box><button onClick={onClose} className="flex w-full items-center gap-3 px-4 py-3 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-[#A63FBD] text-[17px] font-semibold text-white">{(profile.name || "M").slice(0, 1)}</span><span className="flex-1 text-[16px] text-[var(--we-text)]">{profile.name || auth.email}</span><Check size={20} className="text-[var(--we-accent)]" /></button></Box>
      <Head>Your businesses</Head>
      <Box>
        {list === null ? <p className="py-6 text-center text-[14px] text-[var(--we-sub)]">Loading...</p> : mine.map(rowOf)}
        <Row icon={<Plus size={20} className="text-[var(--we-accent)]" />} label="Create a business account" sub="A shop, a company or a school body" onClick={() => setCreate("real")} />
      </Box>
      {admin && (<>
        <Head>Admin</Head>
        <Box>
          <Row icon={<FlaskConical size={20} className="text-[#2F6FEB]" />} label="Test Mode" sub="Try every role without money" onClick={() => setTest(true)} />
        </Box>
        {others.length > 0 && <><Head>Every business (you can act as owner)</Head><Box>{others.map(rowOf)}</Box></>}
      </>)}
      <CreateBusiness open={!!create} test={create === "test"} onClose={() => setCreate(false)} onMade={(id) => { setCreate(false); load(); onOpen(id); }} />
      <TestMode open={test} onClose={() => setTest(false)} onMake={() => setCreate("test")} />
    </Page>
  );
}

function TestMode({ open, onClose, onMake }: { open: boolean; onClose: () => void; onMake: () => void }) {
  const { flash, refreshRep, isRep } = useApp();
  return (
    <Page open={open} onClose={onClose} title="Test Mode">
      <p className="px-4 pt-3 text-[13.5px] leading-snug text-[var(--we-sub)]">Test businesses are only visible to admins and their team. Their orders are paid with a test button, never Paystack, and their refunds never touch real money.</p>
      <Head>Make</Head>
      <Box><Row icon={<Plus size={20} className="text-[var(--we-accent)]" />} label="Create a test business" sub="Any type, verified straight away, payouts ready" onClick={onMake} /></Box>
      <Head>Be someone else</Head>
      <Box>
        <Row label={isRep ? "Stop being a course rep" : "Make me a course rep"} sub="Rep Desk, class groups, timetable tools" onClick={async () => { const r = await adminSelfRep(!isRep); if (r.error) return flash(errText(r.error)); await refreshRep(); flash(isRep ? "You're not a rep now" : "You're a rep now"); }} />
        <Row label="Verify my school" sub="Gives you the tick, so you can make school bodies" onClick={async () => { const r = await adminSelfVerifySchool(true); flash(r.error ? errText(r.error) : "Your school is verified"); }} />
        <Row label="Remove my school tick" onClick={async () => { const r = await adminSelfVerifySchool(false); flash(r.error ? errText(r.error) : "Removed"); }} />
      </Box>
      <p className="px-4 pt-3 text-[12.5px] text-[var(--we-hint)]">To be a student customer, use your normal account: test businesses show up for you in Mini Programs, and you can pay their orders from the order page.</p>
    </Page>
  );
}

function CreateBusiness({ open, test, onClose, onMade }: { open: boolean; test: boolean; onClose: () => void; onMade: (id: string) => void }) {
  const { profile, flash } = useApp();
  const [t, setT] = useState<BizType | null>(null);
  const [f, setF] = useState({ name: "", handle: "", category: "company", biz_category: "Food", phone: "", school: "", about: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) void Promise.resolve().then(() => { setT(null); setF({ name: "", handle: "", category: "company", biz_category: "Food", phone: "", school: profile.institution || "", about: "" }); }); }, [open, profile.institution]);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  async function go() {
    setBusy(true);
    const r = await bizCreate({ biz_type: t, name: f.name, handle: f.handle, category: t === "school_body" ? f.category : t === "organisation" ? f.category : "business", biz_category: t === "campus_business" ? f.biz_category : null,
      phone: f.phone, school: f.school, schools: t === "campus_business" && f.school ? [f.school] : [], about: f.about, is_test: test });
    setBusy(false);
    if (r.error || !r.data) return flash(errText(r.error));
    onMade(r.data);
  }
  const types: [BizType, string, string, ReactNode][] = [
    ["campus_business", "Campus business", "Food, printing, lodges, laundry, repairs, gadgets", <StoreIcon key="s" size={22} />],
    ["organisation", "Company or organisation", "Internships, SIWES, graduate roles, ads", <Building2 key="b" size={22} />],
    ["school_body", "School body", "SUG, faculty, department, a school office", <GraduationCap key="g" size={22} />],
  ];
  return (
    <Page open={open} onClose={onClose} title={test ? "New Test Business" : "New Business"} right={t && <SaveBtn label="Create" disabled={busy || f.name.trim().length < 2 || f.handle.length < 3} onClick={() => void go()} />}>
      <Head>What is it?</Head>
      <Box>{types.map(([id, l, s, icon]) => (
        <button key={id} onClick={() => { setT(id); setF((x) => ({ ...x, category: id === "school_body" ? "department" : "company" })); }} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
          <span className="text-[var(--we-accent)]">{icon}</span>
          <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">{l}</span><span className="block text-[13px] text-[var(--we-sub)]">{s}</span></span>
          <span className={`h-5 w-5 rounded-full border-2 ${t === id ? "border-[var(--we-accent)] bg-[var(--we-accent)] shadow-[inset_0_0_0_3px_var(--we-cell)]" : "border-[var(--we-hint)]"}`} />
        </button>
      ))}</Box>
      {t && (<>
        <Head>Details</Head>
        <Box>
          <Field label="Name" value={f.name} onChange={set("name")} placeholder={t === "campus_business" ? "e.g. Mama Put Kitchen" : t === "organisation" ? "e.g. Acme Ltd" : "e.g. SUG FUL"} />
          <Field label="Handle" value={f.handle} onChange={(v) => set("handle")(v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30))} placeholder="e.g. mamaput" />
          {t === "campus_business" && <Pick label="Category" value={f.biz_category} onChange={set("biz_category")} options={CATEGORIES.map((c) => [c, c] as [string, string])} />}
          {t === "organisation" && <Pick label="Type" value={f.category} onChange={set("category")} options={[["company", "Company"], ["organisation", "Organisation or NGO"], ["government", "Government"]]} />}
          {t === "school_body" && <Pick label="Type" value={f.category} onChange={set("category")} options={[["sug", "Students' Union"], ["department", "Faculty or department"], ["school", "School office"]]} />}
          {t !== "organisation" && <Field label="School" value={f.school} onChange={set("school")} placeholder="The school you serve" />}
          <Field label="Phone" value={f.phone} onChange={set("phone")} type="tel" inputMode="tel" />
          <Area label="About" value={f.about} onChange={set("about")} rows={3} max={600} placeholder="What students get from you" />
        </Box>
        <p className="px-4 pt-2 text-[12.5px] leading-snug text-[var(--we-hint)]">
          {test ? "Test businesses are verified straight away and only admins see them." : t === "school_body" ? "You need your school verified first. Students at the school get 72 hours to object, then it's verified on its own." : t === "campus_business" ? "Next: an ID check, your payout bank and your location. Then students can find you." : "Next: an ID check. Jobs and ads beyond one school need the tick (₦5,000, checked against CAC)."}
        </p>
      </>)}
    </Page>
  );
}

// ---------- Business mode
type Tab = "home" | "orders" | "menu" | "jobs" | "ads" | "more";
function BusinessMode({ id, startView, onClose, onSwitch }: { id: string; startView: string | null; onClose: () => void; onSwitch: () => void }) {
  const { flash, setTab: setAppTab, setChatView } = useApp();
  const [b, setB] = useState<BizHome | null>(null);
  const [tab, setTab] = useState<Tab>((["orders", "menu", "jobs", "ads", "more"].includes(startView ?? "") ? startView : startView === "bookings" ? "more" : "home") as Tab);
  const [sub, setSub] = useState<null | "setup" | "verify" | "profile" | "team" | "bookings">(startView === "verify" ? "verify" : startView === "bookings" ? "bookings" : null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await bizHome(id); if (r.error) setErr(r.error); else setB(r.data); }, [id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  if (err) return <Page open onClose={onClose} title=""><Empty title={errText(err)} /></Page>;
  if (!b) return <Page open onClose={onClose} title=""><p className="py-20 text-center text-[var(--we-sub)]"><Loader2 className="mx-auto animate-spin" /></p></Page>;
  const tabs: [Tab, string, ReactNode][] = [
    ["home", "Home", <HomeIcon key="h" size={22} />],
    ...(b.biz_type === "campus_business" ? [["orders", "Orders", <ShoppingBag key="o" size={22} />], ["menu", b.biz_category === "Lodges" ? "Rooms" : "Menu", <UtensilsCrossed key="m" size={22} />]] as [Tab, string, ReactNode][] : []),
    ...(b.biz_type === "organisation" ? [["jobs", "Jobs", <Briefcase key="j" size={22} />]] as [Tab, string, ReactNode][] : []),
    ["ads", "Ads", <Megaphone key="a" size={22} />],
    ["more", "More", <LayoutGrid key="mo" size={22} />],
  ];
  const openInbox = () => { onClose(); setAppTab("chats"); setChatView({ k: "manage", id: b.id }); };
  const manager = b.role !== "staff";
  return (
    <Page open onClose={onClose} title={<span className="inline-flex items-center gap-1.5">{b.name}{b.verified && <BadgeCheck size={16} className="text-[#2F6FEB]" />}</span>} right={<button onClick={onSwitch} className="px-2 text-[14px] text-[var(--we-link)]">Switch</button>}>
      <div className="flex min-h-full flex-col">
        <div className="flex-1 pb-20">
          {tab === "home" && <HomeTab b={b} onGo={(t) => (["setup", "verify", "bookings"].includes(t) ? setSub(t as typeof sub) : setTab(t as Tab))} onInbox={openInbox} />}
          {tab === "orders" && <BizOrders b={b} onChanged={load} />}
          {tab === "menu" && <BizMenu b={b} onChanged={load} />}
          {tab === "jobs" && <BizJobs b={b} />}
          {tab === "ads" && <BizAds b={b} onChanged={load} />}
          {tab === "more" && (
            <div>
              <Head>Running it</Head>
              <Box>
                <Row icon={<Inbox size={20} className="text-[var(--we-accent)]" />} label="Messages, posts and updates" sub={b.biz_type === "school_body" ? "Campus Updates, Knowledge for the My School assistant, the inbox" : "Your inbox and posts to followers"} onClick={openInbox} />
                {b.biz_type === "campus_business" && <Row label="Bookings" sub="Inspections and appointments" value={b.bookings_open || undefined} onClick={() => setSub("bookings")} />}
                {manager && <Row label="Profile" sub="Name, photos, hours, location, delivery" onClick={() => setSub("profile")} />}
                {manager && <Row label="Setup and payouts" sub="ID check, bank account, location" onClick={() => setSub("setup")} />}
                {manager && b.biz_type !== "school_body" && <Row label="Verification" value={b.verified ? "Verified" : b.kyc_status === "queued" ? "Checking" : undefined} onClick={() => setSub("verify")} />}
                {manager && <Row icon={<Users size={20} className="text-[var(--we-accent)]" />} label="Team" value={b.team.length} onClick={() => setSub("team")} />}
              </Box>
              <div className="space-y-2 px-4 pt-5"><Secondary onClick={onSwitch}>Switch Account</Secondary><Secondary onClick={onClose}>Back to Birdie</Secondary></div>
            </div>
          )}
        </div>
        <nav className="sticky bottom-0 flex border-t border-[var(--we-sep)] bg-[var(--we-bar,var(--we-bg))] pb-[env(safe-area-inset-bottom)]">
          {tabs.map(([t, l, icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11.5px] ${tab === t ? "text-[var(--we-accent)]" : "text-[var(--we-sub)]"}`}>
              {icon}{l}
              {t === "orders" && b.orders_open > 0 && <span className="absolute right-[28%] top-1 min-w-[16px] rounded-full bg-[var(--we-red)] px-1 text-[10px] leading-[16px] text-white">{b.orders_open}</span>}
              {t === "jobs" && b.applicants_new > 0 && <span className="absolute right-[28%] top-1 min-w-[16px] rounded-full bg-[var(--we-red)] px-1 text-[10px] leading-[16px] text-white">{b.applicants_new}</span>}
            </button>
          ))}
        </nav>
      </div>
      <SetupPage open={sub === "setup"} b={b} onClose={() => setSub(null)} onChanged={load} />
      <VerifyBizPage open={sub === "verify"} b={b} onClose={() => setSub(null)} onChanged={load} />
      <ProfilePage open={sub === "profile"} b={b} onClose={() => setSub(null)} onChanged={load} />
      <TeamPage open={sub === "team"} b={b} onClose={() => setSub(null)} onChanged={load} />
      <Page open={sub === "bookings"} onClose={() => setSub(null)} title="Bookings"><BizBookings b={b} /></Page>
    </Page>
  );
}

function HomeTab({ b, onGo, onInbox }: { b: BizHome; onGo: (t: string) => void; onInbox: () => void }) {
  const c = b.checklist;
  const todo: [boolean, string, string][] = b.biz_type === "school_body" ? [] : [
    [c.owner_check, "Check your ID", "A photo of your ID and a selfie"],
    [c.phone, "Add a phone number", "Students and Birdie reach you on it"],
    ...(b.biz_type === "campus_business" ? [[c.pin, "Pin your location", "So students can find you"], [c.schools, "Pick the schools you serve", ""], [c.bank, "Add your payout bank", "Your share of each order goes straight there"]] as [boolean, string, string][] : []),
  ];
  const left = todo.filter(([d]) => !d);
  return (
    <div>
      <div className="flex items-center gap-3 bg-[var(--we-cell)] px-4 py-4">
        <BizAvatar b={b} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><span className="truncate text-[18px] font-semibold text-[var(--we-text)]">{b.name}</span>{levelPill(b)}</div>
          <div className="truncate text-[13px] text-[var(--we-sub)]">@{b.handle} · {TYPE_LABEL[b.biz_type]}{b.biz_category ? ` · ${b.biz_category}` : ""}</div>
        </div>
      </div>
      {b.status === "suspended" && <div className="mt-2 flex items-start gap-2 bg-[#FDECEA] px-4 py-3 text-[14px] text-[var(--we-red)]"><CircleAlert size={18} className="mt-0.5 shrink-0" />Paused because too many orders were refunded. Message Unisupport Help to appeal.</div>}
      {b.level === "none" && left.length > 0 && (<>
        <Head>To go live ({todo.length - left.length} of {todo.length} done)</Head>
        <Box>{todo.map(([done, l, s]) => <Row key={l} icon={done ? <Check size={18} className="text-[#1E9E6A]" /> : <span className="h-4 w-4 rounded-full border-2 border-[var(--we-hint)]" />} label={l} sub={s || undefined} onClick={done ? undefined : () => onGo("setup")} />)}</Box>
      </>)}
      {b.biz_type === "school_body" && b.objection_until && <div className="mt-2 bg-[var(--we-cell)] px-4 py-3 text-[14px] text-[var(--we-text)]">Students at {b.school} can object until {new Date(b.objection_until).toLocaleString([], { weekday: "long", hour: "numeric", minute: "2-digit" })}. {b.objections} so far. If fewer than 5 object, you&apos;re verified on your own.</div>}
      {b.probation && <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">First month: orders up to ₦20,000 each and 30 a day. It lifts on its own.</p>}
      <Head>Today</Head>
      <div className="grid grid-cols-3 bg-[var(--we-cell)] py-4 text-center">
        {(b.biz_type === "campus_business" ? [["Open orders", b.orders_open], ["Orders today", b.orders_today], ["Earned, 7 days", naira(b.earned_7d)]]
          : b.biz_type === "organisation" ? [["New applicants", b.applicants_new], ["Followers", b.followers], ["Ads live", b.ads_live]]
          : [["Followers", b.followers], ["Ads live", b.ads_live], ["Team", b.team.length]]).map(([l, v]) => (
          <span key={String(l)}><span className="block text-[19px] font-semibold text-[var(--we-text)]">{v}</span><span className="text-[12px] text-[var(--we-sub)]">{l}</span></span>
        ))}
      </div>
      <Head>Money</Head>
      <Box>
        {b.biz_type === "campus_business" && <Row label="Earned, 30 days" sub={`After Birdie's ${b.fee_pct}% and refunds. Paid to ${b.bank ? `${b.bank.bank_name ?? "your bank"} ••${b.bank.last4}` : "your bank"} by Paystack.`} value={naira(b.earned_30d)} />}
        {b.debt > 0 && <Row label="Owed from refunds" sub="Taken from your next orders, at most half of each" value={naira(b.debt)} />}
        <Row label="Ad credit" value={naira(b.ad_credit)} onClick={() => onGo("ads")} />
      </Box>
      <Head>Shortcuts</Head>
      <Box>
        {b.biz_type === "campus_business" && <Row label="Orders" value={b.orders_open || undefined} onClick={() => onGo("orders")} />}
        {b.biz_type === "campus_business" && <Row label="Bookings" value={b.bookings_open || undefined} onClick={() => onGo("bookings")} />}
        {b.biz_type === "organisation" && <Row label="Jobs and applicants" value={b.applicants_new || undefined} onClick={() => onGo("jobs")} />}
        <Row label="Messages and posts" onClick={onInbox} />
        {b.biz_type !== "school_body" && !b.verified && <Row label="Get verified" sub="The tick, jobs, and ads beyond your school" onClick={() => onGo("verify")} />}
      </Box>
    </div>
  );
}

function SetupPage({ open, b, onClose, onChanged }: { open: boolean; b: BizHome; onClose: () => void; onChanged: () => void }) {
  const { flash } = useApp();
  const [idCard, setIdCard] = useState<{ path: string; url: string } | null>(null);
  const [selfie, setSelfie] = useState<{ path: string; url: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [bank, setBank] = useState({ code: "", number: "" });
  const [f, setF] = useState({ phone: "", schools: "" });
  useEffect(() => { if (open) { void Promise.resolve().then(() => setF({ phone: b.phone ?? "", schools: b.schools.join(", ") })); if (b.biz_type === "campus_business") void bankList().then(setBanks); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  async function check() {
    setBusy("id"); const r = await ownerCheck(b.id, idCard!.path, selfie!.path); setBusy("");
    if (r.error) return flash(errText(r.error));
    flash(r.ok ? "ID checked" : r.note ?? "That didn't match"); onChanged();
  }
  async function pin() {
    if (!navigator.geolocation) return flash("Your phone can't share its location");
    setBusy("pin");
    navigator.geolocation.getCurrentPosition(async (p) => { const r = await bizUpdate(b.id, { lat: p.coords.latitude, lng: p.coords.longitude }); setBusy(""); if (r.error) return flash(errText(r.error)); flash("Location saved"); onChanged(); },
      () => { setBusy(""); flash("Allow location for Birdie, then try again"); }, { enableHighAccuracy: true, timeout: 15000 });
  }
  async function saveBank() {
    setBusy("bank"); const r = await bankSet(b.id, bank.code, bank.number); setBusy("");
    if (r.error) return flash(r.error === "name_mismatch" ? `${(r as { account_name?: string }).account_name ?? "That account"} doesn't match the business or your ID name` : errText(r.error));
    flash(`Payouts go to ${r.account_name}`); onChanged();
  }
  async function saveBasics() {
    const r = await bizUpdate(b.id, { phone: f.phone, ...(b.biz_type === "campus_business" ? { schools: f.schools.split(",").map((s) => s.trim()).filter(Boolean) } : {}) });
    if (r.error) return flash(errText(r.error)); flash("Saved"); onChanged();
  }
  const c = b.checklist;
  return (
    <Page open={open} onClose={onClose} title="Setup and Payouts">
      <Head right={c.owner_check ? <Pill tone="green">Done</Pill> : undefined}>1. Your ID</Head>
      {c.owner_check ? <Box><Row label={`Checked: ${b.owner_check?.name_on_id ?? "your ID"}`} sub="The owner's ID matched their selfie" /></Box> : (<>
        <Box>
          <Shot label="Your ID" hint="NIN slip, voter's card, driver's licence or passport" value={idCard} onDone={setIdCard} />
          <Shot label="A selfie, now" hint="So we know it's really you" selfie value={selfie} onDone={setSelfie} />
        </Box>
        {b.owner_check?.note && <p className="px-4 pt-2 text-[13px] text-[var(--we-red)]">{b.owner_check.note}</p>}
        <div className="px-4 pt-3"><Primary disabled={!idCard || !selfie || !!busy || b.role !== "owner"} onClick={() => void check()}>{busy === "id" ? "Checking..." : b.role !== "owner" ? "Only the owner can do this" : "Check My ID"}</Primary></div>
      </>)}
      <Head>2. Contact{b.biz_type === "campus_business" ? " and schools" : ""}</Head>
      <Box>
        <Field label="Phone" value={f.phone} onChange={(v) => setF((x) => ({ ...x, phone: v }))} type="tel" inputMode="tel" />
        {b.biz_type === "campus_business" && <Field label="Schools" value={f.schools} onChange={(v) => setF((x) => ({ ...x, schools: v }))} placeholder="Comma between schools" />}
      </Box>
      <div className="px-4 pt-3"><Secondary onClick={() => void saveBasics()}>Save</Secondary></div>
      {b.biz_type === "campus_business" && (<>
        <Head right={c.pin ? <Pill tone="green">Done</Pill> : undefined}>3. Location</Head>
        <Box><Row icon={<MapPin size={20} className="text-[var(--we-accent)]" />} label={c.pin ? "Location saved" : "Use my current location"} sub="Stand at your shop when you do this" onClick={() => void pin()} /></Box>
        <Head right={c.bank ? <Pill tone="green">Done</Pill> : undefined}>4. Payout bank</Head>
        {b.bank && <Box><Row label={`${b.bank.account_name}`} sub={`${b.bank.bank_name ?? "Bank"} ••${b.bank.last4}. Paystack pays your share of each order here.`} /></Box>}
        <Box>
          <label className="flex items-center border-b border-[var(--we-sep)] px-4"><span className="w-28 shrink-0 text-[16px] text-[var(--we-text)]">Bank</span>
            <select value={bank.code} onChange={(e) => setBank((x) => ({ ...x, code: e.target.value }))} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none"><option value="">Choose</option>{banks.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</select></label>
          <Field label="Account no." value={bank.number} onChange={(v) => setBank((x) => ({ ...x, number: v.replace(/\D/g, "").slice(0, 10) }))} inputMode="numeric" />
        </Box>
        <p className="px-4 pt-2 text-[12.5px] leading-snug text-[var(--we-hint)]">The account name must match the business or the name on your ID. Birdie keeps {b.fee_pct}% of each order; Paystack&apos;s fee comes out of your share.</p>
        <div className="px-4 pt-3 pb-10"><Primary disabled={!bank.code || bank.number.length !== 10 || !!busy || b.role !== "owner" || b.is_test} onClick={() => void saveBank()}>{busy === "bank" ? "Checking..." : b.is_test ? "Test businesses are already set" : b.bank ? "Change Payout Bank" : "Save Payout Bank"}</Primary></div>
      </>)}
    </Page>
  );
}

function VerifyBizPage({ open, b, onClose, onChanged }: { open: boolean; b: BizHome; onClose: () => void; onChanged: () => void }) {
  const { flash } = useApp();
  const [k, setK] = useState({ rc: "", type: "COMPANY", nin: "" });
  const [selfie, setSelfie] = useState<{ path: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true); const r = await startPayment("verify_fee", b.id); setBusy(false);
    if (r.authorization_url) window.location.href = r.authorization_url; else flash(errText(r.error));
  }
  async function submit() {
    setBusy(true); const r = await bizKycSubmit(b.id, { rc_number: k.rc.trim(), company_type: k.type, nin: k.nin, selfie: selfie!.path }); setBusy(false);
    if (r.error) return flash(errText(r.error));
    flash("Sent. It's checked automatically."); onChanged();
  }
  return (
    <Page open={open} onClose={onClose} title="Verification">
      <div className="flex flex-col items-center bg-[var(--we-cell)] px-6 pb-5 pt-6 text-center">
        <BadgeCheck size={40} className={b.verified ? "text-[#2F6FEB]" : "text-[var(--we-hint)]"} />
        <p className="mt-2 text-[17px] font-medium text-[var(--we-text)]">{b.verified ? "Verified" : b.kyc_status === "queued" ? "Being checked" : "Get the tick"}</p>
        <p className="mt-1 text-[13.5px] text-[var(--we-sub)]">{b.verified ? "Your business was checked against CAC." : "The tick lets you post jobs, reach other schools with ads, and shows students you're real."}</p>
      </div>
      {!b.verified && (<>
        <Head right={b.fee_paid ? <Pill tone="green">Paid</Pill> : undefined}>1. Verification fee</Head>
        <Box><Row label="₦5,000, once" sub="Covers the CAC and ID checks" value={b.fee_paid ? "Paid" : undefined} /></Box>
        {!b.fee_paid && <div className="px-4 pt-3"><Primary disabled={busy || b.role !== "owner" || b.is_test} onClick={() => void pay()}>{b.is_test ? "Test businesses are verified" : "Pay ₦5,000"}</Primary></div>}
        <Head right={b.kyc_status === "queued" ? <Pill tone="amber">Checking</Pill> : b.kyc_status === "failed" ? <Pill tone="red">Didn&apos;t pass</Pill> : undefined}>2. CAC and your NIN</Head>
        {b.kyc_status === "failed" && b.kyc_note && <p className="px-4 pb-2 text-[13px] text-[var(--we-red)]">{b.kyc_note}</p>}
        {b.kyc_status === "queued" ? <Box><Row label="Waiting for the check" sub="It runs on its own. You'll get a notification." /></Box> : (<>
          <Box>
            <Field label="CAC no." value={k.rc} onChange={(v) => setK((x) => ({ ...x, rc: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 13) }))} placeholder="RC or BN number" />
            <Pick label="Registered as" value={k.type} onChange={(v) => setK((x) => ({ ...x, type: v }))} options={[["COMPANY", "Company (Ltd)"], ["BUSINESS_NAME", "Business name"], ["INCORPORATED_TRUSTEES", "Incorporated trustees (NGO)"], ["LIMITED_PARTNERSHIP", "Limited partnership"], ["LIMITED_LIABILITY_PARTNERSHIP", "LLP"]]} />
            <Field label="Your NIN" value={k.nin} onChange={(v) => setK((x) => ({ ...x, nin: v.replace(/\D/g, "").slice(0, 11) }))} inputMode="numeric" placeholder="11 digits" />
            <Shot label="A selfie, now" hint="Compared with your NIN photo" selfie value={selfie} onDone={setSelfie} />
          </Box>
          <p className="px-4 pt-2 text-[12.5px] leading-snug text-[var(--we-hint)]">The registered name must match {b.name}. We keep the result and the last 4 digits of your NIN, not the NIN itself.</p>
          <div className="px-4 pb-10 pt-3"><Primary disabled={!b.fee_paid || k.rc.length < 4 || k.nin.length !== 11 || !selfie || busy || b.role !== "owner"} onClick={() => void submit()}>Submit for Checking</Primary></div>
        </>)}
      </>)}
    </Page>
  );
}

function ProfilePage({ open, b, onClose, onChanged }: { open: boolean; b: BizHome; onClose: () => void; onChanged: () => void }) {
  const { flash } = useApp();
  const [f, setF] = useState({ name: "", about: "", address: "", hours: "", delivery_fee: "", pickup: true, is_open: true, logo_url: null as string | null, cover_url: null as string | null, biz_category: "" });
  useEffect(() => { if (open) void Promise.resolve().then(() => setF({ name: b.name, about: b.about ?? "", address: b.address ?? "", hours: b.hours ?? "", delivery_fee: b.delivery_fee == null ? "" : String(b.delivery_fee), pickup: b.pickup, is_open: b.is_open, logo_url: b.logo_url, cover_url: b.cover_url, biz_category: b.biz_category ?? "" })); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save() {
    const r = await bizUpdate(b.id, { ...f, delivery_fee: f.delivery_fee.trim() === "" ? "" : Number(f.delivery_fee) });
    if (r.error) return flash(errText(r.error)); flash("Saved"); onChanged(); onClose();
  }
  const shop = b.biz_type === "campus_business";
  return (
    <Page open={open} onClose={onClose} title="Profile" right={<SaveBtn onClick={() => void save()} disabled={f.name.trim().length < 2} />}>
      <Head>Photos</Head>
      <Box><PhotoPick oa={b.id} label="Logo" square value={f.logo_url} onChange={(v) => setF((x) => ({ ...x, logo_url: v }))} /><PhotoPick oa={b.id} label="Cover" value={f.cover_url} onChange={(v) => setF((x) => ({ ...x, cover_url: v }))} /></Box>
      <Head>About</Head>
      <Box>
        <Field label="Name" value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} />
        {shop && <Pick label="Category" value={f.biz_category} onChange={(v) => setF((x) => ({ ...x, biz_category: v }))} options={CATEGORIES.map((c) => [c, c] as [string, string])} />}
        <Area label="Description" value={f.about} onChange={(v) => setF((x) => ({ ...x, about: v }))} rows={3} max={600} />
        <Field label="Address" value={f.address} onChange={(v) => setF((x) => ({ ...x, address: v }))} placeholder="Where to find you" />
        {shop && <Field label="Hours" value={f.hours} onChange={(v) => setF((x) => ({ ...x, hours: v }))} placeholder="e.g. Mon to Sat, 8am to 9pm" />}
      </Box>
      {shop && (<>
        <Head>Orders</Head>
        <Box className="px-4">
          <label className="flex items-center justify-between border-b border-[var(--we-sep)] py-3.5"><span className="text-[16px] text-[var(--we-text)]">Open now</span><input type="checkbox" checked={f.is_open} onChange={(e) => setF((x) => ({ ...x, is_open: e.target.checked }))} className="h-5 w-5 accent-[var(--we-accent)]" /></label>
          <label className="flex items-center justify-between border-b border-[var(--we-sep)] py-3.5"><span className="text-[16px] text-[var(--we-text)]">Pickup</span><input type="checkbox" checked={f.pickup} onChange={(e) => setF((x) => ({ ...x, pickup: e.target.checked }))} className="h-5 w-5 accent-[var(--we-accent)]" /></label>
        </Box>
        <Box><Field label="Delivery fee" value={f.delivery_fee} onChange={(v) => setF((x) => ({ ...x, delivery_fee: v.replace(/[^\d]/g, "") }))} inputMode="numeric" placeholder="Leave empty if you don't deliver" /></Box>
      </>)}
    </Page>
  );
}

function TeamPage({ open, b, onClose, onChanged }: { open: boolean; b: BizHome; onClose: () => void; onChanged: () => void }) {
  const { flash } = useApp();
  const [h, setH] = useState(""); const [role, setRole] = useState<"admin" | "staff">("staff");
  return (
    <Page open={open} onClose={onClose} title="Team">
      <Head>People</Head>
      <Box>{b.team.map((p) => (
        <Row key={p.id} label={p.name} sub={p.role === "owner" ? "Owner" : p.role === "admin" ? "Admin: everything except payouts and the team" : "Staff: orders and bookings only"}
          value={p.role !== "owner" && b.role === "owner" ? <span role="button" onClick={async () => { const r = await bizTeamRemove(b.id, p.id); if (r.error) flash(errText(r.error)); else onChanged(); }} className="text-[var(--we-red)]">Remove</span> : undefined} />
      ))}</Box>
      {b.role === "owner" && (<>
        <Head>Add someone</Head>
        <Box><Field label="Birdie ID" value={h} onChange={setH} placeholder="@their_id" /><Pick label="Role" value={role} onChange={setRole} options={[["staff", "Staff"], ["admin", "Admin"]]} /></Box>
        <div className="px-4 pt-3"><Primary disabled={h.trim().length < 3} onClick={async () => { const r = await bizTeamAdd(b.id, h, role); if (r.error) return flash(r.error === "no_such_user" ? "No one has that Birdie ID" : errText(r.error)); setH(""); flash("Added"); onChanged(); }}>Add</Primary></div>
      </>)}
      {b.team.length === 0 && <Empty title="Just you" />}
    </Page>
  );
}
