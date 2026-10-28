"use client";

// A campus business's shop: the order queue (accept within 20 minutes or it's refunded on its own),
// the menu or rooms, offers and discount codes, print prices, and bookings for inspections and repairs.
import { CalendarClock, ShoppingBag, Tag, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Area, Box, Empty, Field, Head, PhotoPick, Pick, Pill, Row, SaveBtn, Secondary, when } from "./bizkit";
import { bizBookings, bizItemDelete, bizItemSave, bizOfferSave, bizOrderAct, bizOrders, bizStore, bizUpdate, bookingAct, errText, naira, ORDER_LABEL, type Booking, type BizHome, type Item, type Offer, type Order, type PrintPrices } from "./live/bizData";
import { useApp } from "./store";
import { Page } from "./ui";

const tone = (s: Order["status"]) => (["paid"].includes(s) ? "red" : ["accepted", "ready", "out"].includes(s) ? "amber" : ["delivered", "completed"].includes(s) ? "green" : "grey") as "red" | "amber" | "green" | "grey";

export function BizOrders({ b, onChanged }: { b: BizHome; onChanged: () => void }) {
  const { flash } = useApp();
  const [open, setOpen] = useState(true);
  const [list, setList] = useState<Order[] | null>(null);
  const [now, setNow] = useState(0);
  const load = useCallback(() => { void bizOrders(b.id, open).then((l) => { setList(l); setNow(Date.now()); }); }, [b.id, open]);
  useEffect(() => { void Promise.resolve().then(load); const i = setInterval(load, 20000); return () => clearInterval(i); }, [load]);
  async function act(o: Order, a: "accept" | "decline" | "ready" | "out" | "delivered") {
    if (a === "decline" && !confirm("Decline this order? The student gets a full refund.")) return;
    const r = await bizOrderAct(o.id, a);
    if (r.error) return flash(errText(r.error));
    load(); onChanged();
  }
  return (
    <div>
      <div className="flex justify-center gap-10 bg-[var(--we-bg)] pb-2 pt-3 text-[15.5px]">
        {([[true, "Open"], [false, "Done"]] as const).map(([v, l]) => <button key={l} onClick={() => setOpen(v)} className={`pb-1 ${open === v ? "border-b-2 border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "text-[var(--we-sub)]"}`}>{l}</button>)}
      </div>
      {list === null ? <p className="py-10 text-center text-[14px] text-[var(--we-sub)]">Loading...</p> : list.length === 0 ? <Empty icon={<ShoppingBag size={36} />} title={open ? "No open orders" : "Nothing yet"} sub={open ? "New orders show here and on your phone. Accept them within 20 minutes." : undefined} /> : (
        <div className="space-y-2 pt-1">{list.map((o) => {
          const mins = o.accept_by ? Math.max(0, Math.round((new Date(o.accept_by).getTime() - now) / 60000)) : null;
          return (
            <div key={o.id} className="bg-[var(--we-cell)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[16px] font-medium text-[var(--we-text)]">{o.customer?.name ?? "Student"}</span>
                {o.is_test && <Pill tone="blue">Test</Pill>}
                <Pill tone={tone(o.status)}>{o.status === "paid" && mins !== null ? `Accept in ${mins} min` : ORDER_LABEL[o.status]}</Pill>
              </div>
              <div className="mt-1 text-[14.5px] text-[var(--we-text)]">{o.items.map((i) => `${i.qty > 1 ? `${i.qty} x ` : ""}${i.name}`).join(", ")}</div>
              {o.kind === "print" && o.files && <div className="mt-1 text-[13px] text-[var(--we-sub)]">{o.files.length} file{o.files.length === 1 ? "" : "s"} · {String(o.print_spec?.colour ? "Colour" : "Black and white")}{o.print_spec?.binding && o.print_spec.binding !== "none" ? ` · ${String(o.print_spec.binding)} binding` : ""}{o.print_spec?.handwrite ? " · handwriting" : ""}</div>}
              {o.kind === "print" && o.files && <div className="mt-1.5 flex flex-wrap gap-1.5">{o.files.map((f, i) => (
                <button key={f.path} onClick={async () => { const w = window.open("", "_blank"); const r = await fetch(`/api/biz/order-file?order=${o.id}&i=${i}`).then((x) => x.json()).catch(() => ({})); if (r.url && w) w.location.href = r.url; else { w?.close(); flash("Couldn't open the file"); } }}
                  className="rounded-[4px] bg-[var(--we-bg)] px-2 py-1 text-[13px] text-[var(--we-link)]">{f.name ?? `File ${i + 1}`} · {f.pages}p</button>
              ))}</div>}
              <div className="mt-1 text-[13px] text-[var(--we-sub)]">{o.fulfil === "delivery" ? `Deliver to ${o.address}` : "Pickup"}{o.phone ? ` · ${o.phone}` : ""} · {o.paid_at ? when(o.paid_at) : ""}</div>
              {o.note && <div className="mt-1 rounded-[4px] bg-[var(--we-bg)] px-2 py-1 text-[13.5px] text-[var(--we-text)]">{o.note}</div>}
              {o.problem && <div className="mt-1 text-[13px] text-[var(--we-red)]">Problem: {o.problem.reason.replace("_", " ")} · {o.problem.outcome.replace("_", " ")}</div>}
              <div className="mt-2 flex items-center gap-2">
                <span className="flex-1 text-[15px] font-medium text-[var(--we-text)]">{naira(o.total)} <span className="text-[12.5px] font-normal text-[var(--we-sub)]">you get {naira(o.total - o.birdie_fee - o.refund_amount)}</span></span>
                {o.status === "paid" && <><button onClick={() => void act(o, "decline")} className="rounded-[4px] px-3 py-1.5 text-[14px] text-[var(--we-red)]">Decline</button><button onClick={() => void act(o, "accept")} className="rounded-[4px] bg-[var(--we-accent)] px-4 py-1.5 text-[14px] font-medium text-white">Accept</button></>}
                {o.status === "accepted" && o.fulfil === "pickup" && <button onClick={() => void act(o, "ready")} className="rounded-[4px] bg-[var(--we-accent)] px-4 py-1.5 text-[14px] font-medium text-white">Ready</button>}
                {(o.status === "accepted" || o.status === "ready") && o.fulfil === "delivery" && <button onClick={() => void act(o, "out")} className="rounded-[4px] bg-[var(--we-accent)] px-4 py-1.5 text-[14px] font-medium text-white">On the Way</button>}
                {["accepted", "ready", "out"].includes(o.status) && <button onClick={() => void act(o, "delivered")} className="rounded-[4px] bg-[var(--we-bg)] px-3 py-1.5 text-[14px] text-[var(--we-text)]">{o.fulfil === "delivery" ? "Delivered" : "Collected"}</button>}
              </div>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}

export function BizMenu({ b, onChanged }: { b: BizHome; onChanged: () => void }) {
  const { flash } = useApp();
  const [items, setItems] = useState<Item[] | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [edit, setEdit] = useState<Partial<Item> | null>(null);
  const [offer, setOffer] = useState<(Partial<Offer> & { code?: string | null }) | null>(null);
  const [prices, setPrices] = useState<PrintPrices | null>(null);
  const lodge = b.biz_category === "Lodges";
  const load = useCallback(() => { void bizStore(b.id).then((s) => { setItems(s?.items ?? []); setOffers(s?.offers ?? []); }); }, [b.id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function save() {
    const r = await bizItemSave(b.id, { ...edit, price: Number(edit?.price ?? 0), mode: lodge ? "book" : edit?.mode ?? "order" });
    if (r.error) return flash(errText(r.error)); setEdit(null); load(); onChanged();
  }
  const sections = [...new Set((items ?? []).map((i) => i.section ?? ""))];
  return (
    <div>
      {b.biz_category === "Print" && (<>
        <Head right={<button onClick={() => setPrices(b.print_prices ?? { bw: 50, colour: 200, spiral: 500, hard: 3000, handwrite: 300 })} className="text-[var(--we-link)]">Edit</button>}>Print prices</Head>
        <Box><Row label="Per page" sub={`Black and white ${naira(b.print_prices?.bw ?? 50)} · Colour ${naira(b.print_prices?.colour ?? 200)}`} /><Row label="Binding" sub={`Spiral ${naira(b.print_prices?.spiral ?? 500)} · Hard cover ${naira(b.print_prices?.hard ?? 3000)}`} /><Row label="Handwriting, per page" sub={b.print_prices?.handwrite ? naira(b.print_prices.handwrite) : "Not offered"} /></Box>
        <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">Students upload their files in Birdie, Birdie counts the pages and prices it, and you print.</p>
      </>)}
      <Head right={<button onClick={() => setEdit({ name: "", price: 0, section: sections[sections.length - 1] || null, available: true })} className="text-[var(--we-link)]">Add</button>}>{lodge ? "Rooms" : b.biz_category === "Print" ? "Other things you sell" : "Menu"}</Head>
      {items === null ? <p className="py-6 text-center text-[var(--we-sub)]">Loading...</p> : items.length === 0 ? <Box><Empty icon={<UtensilsCrossed size={32} />} title={lodge ? "No rooms yet" : "Nothing on the menu"} sub={lodge ? "Students book an inspection; rent isn't paid on Birdie." : "Add what students can order."} /></Box> : sections.map((s) => (
        <div key={s}>
          {s && <div className="px-4 pb-1 pt-3 text-[12.5px] uppercase tracking-wide text-[var(--we-hint)]">{s}</div>}
          <Box>{items.filter((i) => (i.section ?? "") === s).map((i) => (
            <button key={i.id} onClick={() => setEdit(i)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
              {i.image_url ? <img src={i.image_url} alt="" className="h-12 w-12 rounded-[6px] object-cover" /> : <span className="h-12 w-12 rounded-[6px] bg-[var(--we-bg)]" />}
              <span className="min-w-0 flex-1"><span className={`block truncate text-[16px] ${i.available ? "text-[var(--we-text)]" : "text-[var(--we-hint)] line-through"}`}>{i.name}</span><span className="block truncate text-[13px] text-[var(--we-sub)]">{naira(i.price)}{i.unit ? ` ${i.unit}` : ""}{i.mode === "book" ? " · bookings" : ""}</span></span>
              {!i.available && <Pill>Hidden</Pill>}
            </button>
          ))}</Box>
        </div>
      ))}
      <Head right={<button onClick={() => setOffer({ title: "", body: "", code: "", percent_off: 10 })} className="text-[var(--we-link)]">Add</button>}>Offers</Head>
      <Box>{offers.length === 0 ? <Row icon={<Tag size={18} className="text-[var(--we-hint)]" />} label="No offers" sub="A discount code shows in Campus Deals for students at your school" /> : offers.map((o) => (
        <Row key={o.id} icon={<Tag size={18} className="text-[#FA9D3B]" />} label={o.title} sub={[o.percent_off ? `${o.percent_off}% off` : null, o.code ? `Code ${o.code}` : null, o.ends_at ? `until ${new Date(o.ends_at).toLocaleDateString()}` : null].filter(Boolean).join(" · ")} onClick={() => setOffer(o)} />
      ))}</Box>

      <Page open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit" : lodge ? "New Room" : "New Item"} right={<SaveBtn onClick={() => void save()} disabled={(edit?.name ?? "").trim().length < 2} />}>
        {edit && (<>
          <Box><PhotoPick oa={b.id} square value={edit.image_url ?? null} onChange={(v) => setEdit((x) => ({ ...x, image_url: v }))} /></Box>
          <Head>Details</Head>
          <Box>
            <Field label="Name" value={edit.name ?? ""} onChange={(v) => setEdit((x) => ({ ...x, name: v }))} placeholder={lodge ? "e.g. Self-contain, room 4" : "e.g. Jollof rice and chicken"} />
            <Field label="Price (₦)" value={String(edit.price ?? "")} onChange={(v) => setEdit((x) => ({ ...x, price: Number(v.replace(/\D/g, "")) }))} inputMode="numeric" />
            <Field label="Unit" value={edit.unit ?? ""} onChange={(v) => setEdit((x) => ({ ...x, unit: v }))} placeholder={lodge ? "per session" : "e.g. per plate (optional)"} />
            <Field label="Section" value={edit.section ?? ""} onChange={(v) => setEdit((x) => ({ ...x, section: v }))} placeholder="e.g. Mains, Drinks (optional)" />
            <Area label="Description" value={edit.description ?? ""} onChange={(v) => setEdit((x) => ({ ...x, description: v }))} rows={3} max={400} />
            {!lodge && <Pick label="Students can" value={edit.mode ?? "order"} onChange={(v) => setEdit((x) => ({ ...x, mode: v }))} options={[["order", "Order and pay"], ["book", "Book a time"]]} />}
          </Box>
          <Box className="mt-2 px-4"><label className="flex items-center justify-between py-3.5"><span className="text-[16px] text-[var(--we-text)]">Available</span><input type="checkbox" checked={edit.available ?? true} onChange={(e) => setEdit((x) => ({ ...x, available: e.target.checked }))} className="h-5 w-5 accent-[var(--we-accent)]" /></label></Box>
          {edit.id && <div className="px-4 pt-4"><Secondary onClick={async () => { if (!confirm("Delete this?")) return; const r = await bizItemDelete(edit.id!); if (r.error) return flash(errText(r.error)); setEdit(null); load(); }}><span className="text-[var(--we-red)]">Delete</span></Secondary></div>}
        </>)}
      </Page>
      <Page open={!!offer} onClose={() => setOffer(null)} title={offer?.id ? "Edit Offer" : "New Offer"} right={<SaveBtn onClick={async () => { const r = await bizOfferSave(b.id, { ...offer, percent_off: offer?.percent_off ? Number(offer.percent_off) : null }); if (r.error) return flash(errText(r.error)); setOffer(null); load(); }} disabled={(offer?.title ?? "").trim().length < 3} />}>
        {offer && (<>
          <Box>
            <Field label="Title" value={offer.title ?? ""} onChange={(v) => setOffer((x) => ({ ...x, title: v }))} placeholder="e.g. 10% off for freshers" />
            <Field label="Code" value={offer.code ?? ""} onChange={(v) => setOffer((x) => ({ ...x, code: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) }))} placeholder="e.g. FRESH (optional)" />
            <Field label="% off" value={String(offer.percent_off ?? "")} onChange={(v) => setOffer((x) => ({ ...x, percent_off: Number(v.replace(/\D/g, "").slice(0, 2)) || null }))} inputMode="numeric" />
            <Field label="Ends" type="date" value={offer.ends_at ? offer.ends_at.slice(0, 10) : ""} onChange={(v) => setOffer((x) => ({ ...x, ends_at: v ? `${v}T23:59:00+01:00` : null }))} />
            <Area label="Details" value={offer.body ?? ""} onChange={(v) => setOffer((x) => ({ ...x, body: v }))} rows={2} max={300} />
          </Box>
          {offer.id && <Box className="mt-2 px-4"><label className="flex items-center justify-between py-3.5"><span className="text-[16px] text-[var(--we-text)]">Running</span><input type="checkbox" checked={offer.active ?? true} onChange={(e) => setOffer((x) => ({ ...x, active: e.target.checked }))} className="h-5 w-5 accent-[var(--we-accent)]" /></label></Box>}
          <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">With a code and a % off, students type the code at checkout. The discount comes out of the order total.</p>
        </>)}
      </Page>
      <Page open={!!prices} onClose={() => setPrices(null)} title="Print Prices" right={<SaveBtn onClick={async () => { const r = await bizUpdate(b.id, { print_prices: prices }); if (r.error) return flash(errText(r.error)); setPrices(null); onChanged(); }} />}>
        {prices && <Box>
          {([["bw", "B&W page"], ["colour", "Colour page"], ["spiral", "Spiral bind"], ["hard", "Hard cover"], ["handwrite", "Handwriting/pg"]] as const).map(([k, l]) => (
            <Field key={k} label={l} value={String(prices[k] ?? "")} onChange={(v) => setPrices((x) => x && ({ ...x, [k]: v === "" ? undefined : Number(v.replace(/\D/g, "")) }))} inputMode="numeric" placeholder={k === "handwrite" ? "Empty if you don't" : ""} />
          ))}
        </Box>}
      </Page>
    </div>
  );
}

export function BizBookings({ b }: { b: BizHome }) {
  const { flash } = useApp();
  const [list, setList] = useState<Booking[] | null>(null);
  const load = useCallback(() => { void bizBookings(b.id).then(setList); }, [b.id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function act(x: Booking, a: "confirm" | "decline" | "done") { const r = await bookingAct(x.id, a); if (r.error) return flash(errText(r.error)); load(); }
  if (list === null) return <p className="py-10 text-center text-[14px] text-[var(--we-sub)]">Loading...</p>;
  if (list.length === 0) return <Empty icon={<CalendarClock size={36} />} title="No bookings" sub="When a student books an inspection or a time, it shows here." />;
  return (
    <div className="space-y-2 pt-2">{list.map((x) => (
      <div key={x.id} className="bg-[var(--we-cell)] px-4 py-3">
        <div className="flex items-center gap-2"><span className="flex-1 text-[16px] font-medium text-[var(--we-text)]">{x.customer?.name}</span><Pill tone={x.status === "requested" ? "red" : x.status === "confirmed" ? "green" : "grey"}>{x.status}</Pill></div>
        <div className="mt-1 text-[14.5px] text-[var(--we-text)]">{when(x.slot)}{x.item ? ` · ${x.item}` : ""}</div>
        {x.note && <div className="mt-1 text-[13.5px] text-[var(--we-sub)]">{x.note}</div>}
        {x.status === "requested" && <div className="mt-2 flex justify-end gap-2"><button onClick={() => void act(x, "decline")} className="px-3 py-1.5 text-[14px] text-[var(--we-red)]">Can&apos;t Make It</button><button onClick={() => void act(x, "confirm")} className="rounded-[4px] bg-[var(--we-accent)] px-4 py-1.5 text-[14px] font-medium text-white">Confirm</button></div>}
        {x.status === "confirmed" && <div className="mt-2 flex justify-end"><button onClick={() => void act(x, "done")} className="rounded-[4px] bg-[var(--we-bg)] px-3 py-1.5 text-[14px] text-[var(--we-text)]">Done</button></div>}
      </div>
    ))}</div>
  );
}

