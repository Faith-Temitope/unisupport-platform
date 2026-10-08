"use client";

// Sponsored placements: create/edit what sponsors get, target it, and pull the numbers that sell
// the renewal. Everything goes through admin_* functions (admins only, checked server-side).
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { cleanUrl } from "../live/socialData";
import { adminDeletePlacement, adminListPlacements, adminSavePlacement, type AdminPlacement, type PlacementKind, type Surface } from "../live/sponsorData";
import { Btn2, Card, Pill, Switch } from "../staff/kit";

const KINDS: { id: PlacementKind; label: string; where: string }[] = [
  { id: "campus", label: "Campus business", where: "Explore > Campus & deals > Near your campus" },
  { id: "deal", label: "Student deal", where: "Explore > Campus & deals > Student deals" },
  { id: "internship", label: "Internship / SIWES", where: "Help > Internships & SIWES (hidden after the deadline)" },
  { id: "card", label: "Sponsored card", where: "Birdie new chat, end of long videos, or the Explore feed" },
];
const SURFACES: { id: Surface; label: string }[] = [{ id: "birdie", label: "Birdie (new chat)" }, { id: "video_end", label: "End of long videos" }, { id: "explore", label: "Explore feed" }];

type Draft = {
  id?: string; sponsor_name: string; sponsor_contact: string; kind: PlacementKind; surface: Surface | ""; title: string; body: string;
  cta_label: string; url: string; image_url: string; discount_code: string; company: string; location: string; deadline: string;
  countries: string; regions: string; schools: string; starts_at: string; ends_at: string; active: boolean; priority: string;
};
const blank: Draft = { sponsor_name: "", sponsor_contact: "", kind: "campus", surface: "", title: "", body: "", cta_label: "", url: "", image_url: "", discount_code: "", company: "", location: "", deadline: "", countries: "", regions: "", schools: "", starts_at: "", ends_at: "", active: true, priority: "0" };
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromRow = (p: AdminPlacement): Draft => ({
  id: p.id, sponsor_name: p.sponsor_name, sponsor_contact: p.sponsor_contact ?? "", kind: p.kind, surface: p.surface ?? "", title: p.title, body: p.body,
  cta_label: p.cta_label, url: p.url ?? "", image_url: p.image_url ?? "", discount_code: p.discount_code ?? "", company: p.company ?? "", location: p.location ?? "",
  deadline: p.deadline ?? "", countries: p.countries.join(", "), regions: p.regions.join(", "), schools: p.schools.join(", "),
  starts_at: day(p.starts_at), ends_at: day(p.ends_at), active: p.active, priority: String(p.priority),
});
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "-");
const field = "w-full rounded-xl border-2 border-[#E6DCF0] bg-white px-3 py-2 text-[13.5px] outline-none focus:border-[#8b3fa6]";

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-[11.5px] font-semibold text-[var(--dim)]">{label}</div>{children}{hint && <div className="mt-0.5 text-[11px] text-[var(--dim)]">{hint}</div>}</label>;
}

export function SponsorsTab({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<AdminPlacement[] | null>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void adminListPlacements().then(setRows); }, []);
  const reload = async () => setRows(await adminListPlacements());
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => (x ? { ...x, [k]: v } : x));

  async function save() {
    if (!d) return;
    if (!d.sponsor_name.trim() || !d.title.trim()) return show("Sponsor and title are required");
    if (d.kind === "card" && !d.surface) return show("Pick where the sponsored card shows");
    const url = d.url.trim() ? cleanUrl(d.url) : null;
    if (d.url.trim() && !url) return show("The link isn't a valid web address");
    if (d.image_url.trim() && !/^https:\/\//i.test(d.image_url.trim())) return show("The image link must start with https://");
    setBusy(true);
    const err = await adminSavePlacement({
      id: d.id, sponsor_name: d.sponsor_name.trim(), sponsor_contact: d.sponsor_contact.trim() || null, kind: d.kind, surface: d.kind === "card" ? (d.surface as Surface) : null,
      title: d.title.trim(), body: d.body.trim(), cta_label: d.cta_label.trim(), url, image_url: d.image_url.trim() || null, discount_code: d.discount_code.trim() || null,
      company: d.company.trim() || null, location: d.location.trim() || null, deadline: d.deadline || null,
      countries: list(d.countries), regions: list(d.regions), schools: list(d.schools),
      starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : undefined, ends_at: d.ends_at ? new Date(`${d.ends_at}T23:59:59`).toISOString() : null,
      active: d.active, priority: Number(d.priority) || 0,
    } as Partial<AdminPlacement>);
    setBusy(false);
    if (err) return show(err);
    show(d.id ? "Saved" : "Placement live"); setD(null); void reload();
  }
  async function remove(p: AdminPlacement) {
    if (!confirm(`Delete "${p.title}" and its numbers?`)) return;
    const err = await adminDeletePlacement(p.id); if (err) return show(err);
    show("Deleted"); void reload();
  }
  function copyReport(p: AdminPlacement) {
    const since = new Date(p.starts_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
    const text = `${p.sponsor_name} on Birdie: "${p.title}"\nRunning since ${since}${p.ends_at ? ` until ${new Date(p.ends_at).toLocaleDateString([], { day: "numeric", month: "short" })}` : ""}.\n${p.viewers} students saw it (${p.views} views).\n${p.clickers} students tapped it (${p.clicks} taps, ${pct(p.clickers, p.viewers)} of those who saw it).`;
    void navigator.clipboard.writeText(text); show("Report copied. Paste it to the sponsor.");
  }

  if (!rows) return <div className="p-10 text-center text-sm text-[var(--dim)]">Loading...</div>;
  const live = rows.filter((r) => r.active && (!r.ends_at || new Date(r.ends_at) > new Date()));
  const tViewers = rows.reduce((a, r) => a + r.viewers, 0), tClickers = rows.reduce((a, r) => a + r.clickers, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Live placements</div><div className="disp mt-1 text-[24px] font-bold">{live.length}</div></Card>
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Sponsors</div><div className="disp mt-1 text-[24px] font-bold">{new Set(rows.map((r) => r.sponsor_name.toLowerCase())).size}</div></Card>
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Students reached</div><div className="disp mt-1 text-[24px] font-bold">{tViewers}</div><div className="text-[11.5px] text-[var(--dim)]">summed per placement</div></Card>
        <Card pad><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Tap rate</div><div className="disp mt-1 text-[24px] font-bold">{pct(tClickers, tViewers)}</div></Card>
      </div>

      {d ? (
        <Card title={d.id ? "Edit placement" : "New placement"} sub={KINDS.find((k) => k.id === d.kind)?.where}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{KINDS.map((k) => (<button key={k.id} onClick={() => set("kind", k.id)} className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${d.kind === k.id ? "bg-[#1a1024] text-white" : "bg-[#F4EFF8]"}`}>{k.label}</button>))}</div>
            {d.kind === "card" && <div className="flex flex-wrap gap-2">{SURFACES.map((s) => (<button key={s.id} onClick={() => set("surface", s.id)} className={`rounded-xl px-3 py-1.5 text-[12.5px] font-semibold ${d.surface === s.id ? "bg-[#8b3fa6] text-white" : "bg-white ring-2 ring-[#E6DCF0]"}`}>{s.label}</button>))}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <F label="Sponsor (shown as 'Sponsored · name')"><input className={field} value={d.sponsor_name} onChange={(e) => set("sponsor_name", e.target.value)} placeholder="Chowdeck" /></F>
              <F label="Contact (internal only)"><input className={field} value={d.sponsor_contact} onChange={(e) => set("sponsor_contact", e.target.value)} placeholder="Name, phone, email" /></F>
              <F label={d.kind === "internship" ? "Role" : "Headline"}><input className={field} value={d.title} onChange={(e) => set("title", e.target.value)} placeholder={d.kind === "internship" ? "SIWES Intern, Software" : "20% off your first order"} /></F>
              <F label="Button text"><input className={field} value={d.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder={d.kind === "internship" ? "Apply" : "Order now"} /></F>
              <F label="Link" hint="Where the button goes. https:// is added if missing."><input className={field} value={d.url} onChange={(e) => set("url", e.target.value)} placeholder="chowdeck.com/..." /></F>
              <F label="Logo or image link (optional)" hint="An https:// image address, e.g. from their website."><input className={field} value={d.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." /></F>
              {d.kind !== "internship" && <F label="Discount code (optional)" hint="Students tap it to copy."><input className={field} value={d.discount_code} onChange={(e) => set("discount_code", e.target.value)} placeholder="BIRDIE20" /></F>}
              {(d.kind === "campus" || d.kind === "internship") && <F label={d.kind === "campus" ? "Where (shown under the name)" : "Location"}><input className={field} value={d.location} onChange={(e) => set("location", e.target.value)} placeholder={d.kind === "campus" ? "Opposite the main gate" : "Lagos, onsite"} /></F>}
              {d.kind === "internship" && <F label="Company (if different from sponsor)"><input className={field} value={d.company} onChange={(e) => set("company", e.target.value)} /></F>}
              {d.kind === "internship" && <F label="Apply by"><input type="date" className={field} value={d.deadline} onChange={(e) => set("deadline", e.target.value)} /></F>}
            </div>
            <F label="Details"><textarea className={`${field} min-h-[70px]`} value={d.body} onChange={(e) => set("body", e.target.value)} placeholder={d.kind === "internship" ? "What they'll do, who can apply, stipend, duration" : "One or two lines"} /></F>
            <div className="rounded-xl bg-[#F8F4FB] p-3">
              <div className="mb-2 text-[12.5px] font-bold">Who sees it <span className="font-normal text-[var(--dim)]">(leave blank for everyone; separate several with commas; matched to students&apos; profiles, any capitalisation)</span></div>
              <div className="grid gap-3 md:grid-cols-3">
                <F label="Countries"><input className={field} value={d.countries} onChange={(e) => set("countries", e.target.value)} placeholder="Nigeria" /></F>
                <F label="Regions / states"><input className={field} value={d.regions} onChange={(e) => set("regions", e.target.value)} placeholder="Lagos, Ogun" /></F>
                <F label="Schools"><input className={field} value={d.schools} onChange={(e) => set("schools", e.target.value)} placeholder="UNILAG, LASU" /></F>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <F label="Starts"><input type="date" className={field} value={d.starts_at} onChange={(e) => set("starts_at", e.target.value)} /></F>
              <F label="Ends (optional)"><input type="date" className={field} value={d.ends_at} onChange={(e) => set("ends_at", e.target.value)} /></F>
              <F label="Priority" hint="Higher shows first"><input type="number" className={field} value={d.priority} onChange={(e) => set("priority", e.target.value)} /></F>
              <F label="Live"><div className="pt-1.5"><Switch on={d.active} onChange={(v) => set("active", v)} /></div></F>
            </div>
            <div className="flex gap-2"><Btn2 disabled={busy} onClick={() => void save()}>{busy ? "Saving..." : d.id ? "Save changes" : "Publish"}</Btn2><button onClick={() => setD(null)} className="rounded-xl bg-white px-3.5 py-2 text-[13px] font-semibold ring-2 ring-[#E6DCF0]">Cancel</button></div>
          </div>
        </Card>
      ) : <Btn2 onClick={() => setD({ ...blank, starts_at: new Date().toISOString().slice(0, 10) })}>+ New placement</Btn2>}

      <Card title="Placements" sub="Views count each student once a day. 'Copy report' gives you a summary to send the sponsor." pad={false}>
        {rows.length === 0 ? <div className="p-6 text-center text-sm text-[var(--dim)]">No placements yet.</div> : (
          <div className="divide-y divide-[#F0EAF7]">{rows.map((p) => {
            const ended = !!p.ends_at && new Date(p.ends_at) <= new Date();
            return (
              <div key={p.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold">{p.title}</span><Pill tone={!p.active || ended ? "gray" : "green"}>{!p.active ? "paused" : ended ? "ended" : "live"}</Pill><Pill tone="purple">{KINDS.find((k) => k.id === p.kind)?.label}{p.surface ? ` · ${SURFACES.find((s) => s.id === p.surface)?.label}` : ""}</Pill></div>
                  <div className="text-[12px] text-[var(--dim)]">{p.sponsor_name}{p.sponsor_contact ? ` · ${p.sponsor_contact}` : ""} · {[...p.countries, ...p.regions, ...p.schools].join(", ") || "Everyone"}</div>
                  <div className="mt-1 text-[12.5px]"><b>{p.viewers}</b> students saw it · <b>{p.clickers}</b> tapped · tap rate <b>{pct(p.clickers, p.viewers)}</b></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyReport(p)} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-2 ring-[#E6DCF0]">Copy report</button>
                  <button onClick={() => setD(fromRow(p))} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold ring-2 ring-[#E6DCF0]">Edit</button>
                  <button onClick={() => void remove(p)} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#C2412D] ring-2 ring-[#E6DCF0]">Delete</button>
                </div>
              </div>
            );
          })}</div>
        )}
      </Card>
      <SponsoredPasses show={show} />
    </div>
  );
}

type PackRow = { code: string; seats: number; claimed: number; sponsor_name: string | null; school: string | null; expires_at: string | null; price_paid: number; buyer: string | null; created_at: string };

// Free Exam Pass packs a sponsor pays you for (or you give away): one code, N passes, optionally
// one school only. Student-bought packs show here too, for the record.
function SponsoredPasses({ show }: { show: (m: string) => void }) {
  const [rows, setRows] = useState<PackRow[]>([]);
  const [f, setF] = useState({ sponsor: "", seats: "100", school: "", expires: "" });
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data } = await createClient().rpc("admin_list_pass_packs"); setRows((data ?? []) as PackRow[]); };
  useEffect(() => { void createClient().rpc("admin_list_pass_packs").then(({ data }) => setRows((data ?? []) as PackRow[])); }, []);
  async function create() {
    const seats = Math.round(Number(f.seats));
    if (!f.sponsor.trim()) return show("Who is sponsoring it?");
    if (!(seats >= 1 && seats <= 5000)) return show("Seats must be 1 to 5000");
    setBusy(true);
    const { data, error } = await createClient().rpc("admin_create_pass_pack", { p_seats: seats, p_sponsor: f.sponsor.trim(), p_school: f.school.trim(), p_expires: f.expires ? new Date(`${f.expires}T23:59:59`).toISOString() : null });
    setBusy(false);
    if (error) return show(error.message);
    void navigator.clipboard.writeText(data as string);
    show(`Code ${data} created and copied`); setF({ sponsor: "", seats: "100", school: "", expires: "" }); void load();
  }
  return (
    <Card title="Sponsored Exam Passes" sub="One code, many free passes. Students enter it under Wallet > Have a pass code?">
      <div className="grid gap-3 md:grid-cols-4">
        <F label="Sponsor"><input className={field} value={f.sponsor} onChange={(e) => setF({ ...f, sponsor: e.target.value })} placeholder="MTN, or a well-wisher's name" /></F>
        <F label="Passes"><input type="number" className={field} value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} /></F>
        <F label="School only (optional)"><input className={field} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} placeholder="UNILAG" /></F>
        <F label="Code expires (optional)"><input type="date" className={field} value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} /></F>
      </div>
      <div className="mt-3"><Btn2 disabled={busy} onClick={() => void create()}>{busy ? "Creating..." : "Create code"}</Btn2></div>
      {rows.length > 0 && (
        <div className="mt-4 divide-y divide-[#F0EAF7] rounded-xl border-2 border-[#F0EAF7]">{rows.map((r) => (
          <div key={r.code} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-[13px]">
            <span className="font-mono font-bold">{r.code}</span>
            <span className="min-w-0 flex-1 text-[var(--dim)]">{r.sponsor_name ? `Sponsored by ${r.sponsor_name}` : `Bought by ${r.buyer ?? "a student"} for ₦${Math.round(Number(r.price_paid)).toLocaleString("en-NG")}`}{r.school ? ` · ${r.school} only` : ""}{r.expires_at ? ` · until ${new Date(r.expires_at).toLocaleDateString([], { day: "numeric", month: "short" })}` : ""}</span>
            <b>{r.claimed}/{r.seats} claimed</b>
          </div>
        ))}</div>
      )}
    </Card>
  );
}
