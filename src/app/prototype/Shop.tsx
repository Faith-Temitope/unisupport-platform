"use client";

// Campus businesses, as a student sees them: a category in Mini Programs (Food, Print, Lodges...), a shop
// page with its menu, offers and reviews, a cart and checkout paid with Paystack, print jobs priced by
// Birdie from the files you upload, inspections and appointments, and My Orders, where you confirm,
// report a problem (refunds happen by rule, on their own) and review.
import { BadgeCheck, CalendarClock, Clock, FileText, MapPin, MessageCircle, Minus, Phone, Plus, Search, ShoppingBag, Star, Tag, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Area, BizAvatar, Box, Empty, Field, Head, Pick, Pill, Primary, Row, Secondary, Stars, when } from "./bizkit";
import { countPdfPages } from "./extract";
import { adminTestPay, bizDirectory, bizObject, bizStore, bookingAct, bookingRequest, errText, myBookings, myOrders, naira, ORDER_LABEL, orderCancel, orderConfirm, orderCreate, orderGet, orderProblem, orderReview, startPayment, verifyPayment, type Biz, type Booking, type Item, type Order, type Store } from "./live/bizData";
import { followOfficial } from "./live/chatData";
import { safeName, uploadTo } from "./live/helpData";
import { uid, useApp } from "./store";
import { Page } from "./ui";

export const openStore = (id: string) => window.dispatchEvent(new CustomEvent("birdie-open-store", { detail: { id } }));
export const openOrders = (order?: string, tab?: "orders" | "bookings") => window.dispatchEvent(new CustomEvent("birdie-open-orders", { detail: { order, tab } }));

/** Mounted once: the shop page, My Orders, and coming back from Paystack (?paid=reference). */
export function ShopHost() {
  const { flash } = useApp();
  const [store, setStore] = useState<string | null>(null);
  const [orders, setOrders] = useState<{ order?: string; tab?: "orders" | "bookings" } | null>(null);
  useEffect(() => {
    const s = (e: Event) => setStore((e as CustomEvent).detail?.id ?? null);
    const o = (e: Event) => setOrders((e as CustomEvent).detail ?? {});
    const paid = (e: Event) => {
      const ref = String((e as CustomEvent).detail ?? "");
      void verifyPayment(ref).then((r) => {
        if (r.status !== "paid") return flash(r.status === "failed" ? "The payment didn't go through" : "Still waiting for the payment to confirm");
        if (r.purpose === "order") { flash("Paid. The shop has your order."); setOrders({ order: r.target }); }
        else { flash(r.purpose === "ad_credit" ? "Ad credit added" : "Verification fee paid"); window.dispatchEvent(new CustomEvent("birdie-open-biz", { detail: { id: r.target, view: r.purpose === "ad_credit" ? "ads" : "verify" } })); }
      });
    };
    window.addEventListener("birdie-open-store", s); window.addEventListener("birdie-open-orders", o); window.addEventListener("birdie-paid", paid);
    return () => { window.removeEventListener("birdie-open-store", s); window.removeEventListener("birdie-open-orders", o); window.removeEventListener("birdie-paid", paid); };
  }, [flash]);
  return (<>
    {store && <StorePage key={store} id={store} onClose={() => setStore(null)} onOrdered={(id) => { setStore(null); setOrders({ order: id }); }} />}
    <MyOrders open={!!orders} startOrder={orders?.order} startTab={orders?.tab} onClose={() => setOrders(null)} />
  </>);
}

// ---------- A category in Mini Programs
export function Directory({ category, title, onBack }: { category: string | null; title: string; onBack: () => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Awaited<ReturnType<typeof bizDirectory>> | null>(null);
  useEffect(() => { const t = setTimeout(() => void bizDirectory(category, q).then(setList), q ? 300 : 0); return () => clearTimeout(t); }, [category, q]);
  return (
    <Page open onClose={onBack} title={title} right={<button onClick={() => openOrders()} aria-label="My orders" className="flex h-10 w-10 items-center justify-center"><ShoppingBag size={21} /></button>}>
      <div className="px-3 pb-2 pt-1"><div className="flex items-center gap-2 rounded-[6px] bg-[var(--we-cell)] px-3 py-2"><Search size={17} className="text-[var(--we-hint)]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={category === "Lodges" ? "Search lodges" : "Search shops and what they sell"} className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" /></div></div>
      {list === null ? <p className="py-10 text-center text-[14px] text-[var(--we-sub)]">Loading...</p> : list.length === 0 ? <Empty icon={<ShoppingBag size={36} />} title={q ? "Nothing found" : `No ${title.toLowerCase()} at your school yet`} sub={q ? undefined : "Run a business? Open Me > Switch Account > Create a business account."} /> : (
        <Box>{list.map((b) => (
          <button key={b.id} onClick={() => openStore(b.id)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0 active:bg-[var(--we-bg)]">
            <BizAvatar b={b} size={52} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5"><span className="truncate text-[16px] text-[var(--we-text)]">{b.name}</span>{b.verified && <BadgeCheck size={15} className="shrink-0 text-[#2F6FEB]" />}{b.featured && <Pill tone="amber">Sponsored</Pill>}{b.is_test && <Pill tone="blue">Test</Pill>}</span>
              <span className="flex items-center gap-1.5 text-[13px] text-[var(--we-sub)]">{b.rating ? <><Star size={12} className="fill-[#F5A623] text-[#F5A623]" />{b.rating} ({b.rating_count})</> : "New"}{" · "}<span className={b.is_open ? "text-[#1E9E6A]" : ""}>{b.is_open ? "Open" : "Closed"}</span>{b.delivery_fee != null ? ` · Delivers ${naira(b.delivery_fee)}` : ""}</span>
              {b.offer && <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-[#E8742A]"><Tag size={12} />{b.offer.title}</span>}
            </span>
          </button>
        ))}</Box>
      )}
    </Page>
  );
}

// ---------- A shop page
type Cart = Record<string, number>;
function StorePage({ id, onClose, onOrdered }: { id: string; onClose: () => void; onOrdered: (order: string) => void }) {
  const { flash, setTab, setChatView, auth, setAuthOpen } = useApp();
  const [s, setS] = useState<Store | null | undefined>(undefined);
  const [cart, setCart] = useState<Cart>({});
  const [checkout, setCheckout] = useState(false);
  const [book, setBook] = useState<Item | null | "general">(null);
  const [print, setPrint] = useState(false);
  const load = useCallback(() => { void bizStore(id).then(setS); }, [id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  if (s === undefined) return <Page open onClose={onClose} title=""><p className="py-20 text-center text-[var(--we-sub)]">Loading...</p></Page>;
  if (!s) return <Page open onClose={onClose} title=""><Empty title="This business isn't available" /></Page>;
  const orderItems = s.items.filter((i) => i.mode === "order" && i.available), bookItems = s.items.filter((i) => i.mode === "book" && i.available);
  const sections = [...new Set(orderItems.map((i) => i.section ?? ""))];
  const count = Object.values(cart).reduce((a, n) => a + n, 0);
  const sub = orderItems.reduce((a, i) => a + (cart[i.id] ?? 0) * i.price, 0);
  const add = (i: Item, d: number) => setCart((c) => { const n = Math.max(0, Math.min(50, (c[i.id] ?? 0) + d)); const x = { ...c, [i.id]: n }; if (!n) delete x[i.id]; return x; });
  const need = (f: () => void) => () => (auth.status === "in" ? f() : setAuthOpen(true));
  return (
    <Page open onClose={onClose} title={s.name}>
      <div className="pb-24">
        {s.cover_url && <img src={s.cover_url} alt="" className="h-36 w-full object-cover" />}
        <div className="flex items-start gap-3 bg-[var(--we-cell)] px-4 py-4">
          <BizAvatar b={s} size={60} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5"><span className="text-[19px] font-semibold text-[var(--we-text)]">{s.name}</span>{s.verified && <BadgeCheck size={17} className="text-[#2F6FEB]" />}{s.is_test && <Pill tone="blue">Test</Pill>}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-[var(--we-sub)]">
              {s.rating ? <span className="flex items-center gap-1"><Stars value={s.rating} size={12} />{s.rating} ({s.rating_count})</span> : <span>New</span>}
              <span className={s.is_open ? "text-[#1E9E6A]" : "text-[var(--we-red)]"}>{s.is_open ? "Open" : "Closed"}</span>
              {s.biz_category && <span>{s.biz_category}</span>}
            </div>
            {s.about && <p className="mt-1.5 text-[14px] leading-snug text-[var(--we-text)]">{s.about}</p>}
          </div>
        </div>
        <Box className="border-t border-[var(--we-sep)]">
          {s.address && <Row icon={<MapPin size={18} className="text-[var(--we-sub)]" />} label={s.address} onClick={s.lat ? () => window.open(`https://maps.google.com/?q=${s.lat},${s.lng}`, "_blank") : undefined} />}
          {s.hours && <Row icon={<Clock size={18} className="text-[var(--we-sub)]" />} label={s.hours} />}
          {s.phone && <Row icon={<Phone size={18} className="text-[var(--we-sub)]" />} label={s.phone} onClick={() => { window.location.href = `tel:${s.phone}`; }} />}
        </Box>
        <div className="grid grid-cols-2 gap-2 px-4 py-3">
          <Secondary onClick={need(async () => { const r = await followOfficial(s.id, !s.following); if (r.error) return flash("Couldn't do that"); load(); })}>{s.following ? "Following" : "Follow"}</Secondary>
          <Secondary onClick={need(() => { onClose(); setTab("chats"); setChatView({ k: "oa", id: s.id }); })}><span className="inline-flex items-center gap-1.5"><MessageCircle size={16} /> Message</span></Secondary>
        </div>
        {s.objection_open && !s.objected && (
          <div className="mx-4 mb-3 rounded-[6px] bg-[#FFF4E0] px-3 py-2.5 text-[13.5px] text-[#9A5B00]">New account for {s.school}. Isn&apos;t this the real one? <button className="underline" onClick={need(async () => { const why = prompt("Why isn't this the real account?"); if (why === null) return; const r = await bizObject(s.id, why); flash(r.error ? errText(r.error) : "Thanks. Enough objections and it gets checked."); load(); })}>Object</button></div>
        )}
        {!s.serves_me && s.biz_type === "campus_business" && <p className="px-4 pb-2 text-[13px] text-[#C77700]">They don&apos;t serve your school.</p>}
        {s.offers.length > 0 && (<>
          <Head>Offers</Head>
          <Box>{s.offers.map((o) => <Row key={o.id} icon={<Tag size={18} className="text-[#E8742A]" />} label={o.title} sub={[o.body, o.code ? `Use code ${o.code}` : null].filter(Boolean).join(" · ")} />)}</Box>
        </>)}
        {s.biz_category === "Print" && s.print_prices && s.can_order && (<>
          <Head>Print and deliver</Head>
          <Box><Row icon={<FileText size={20} className="text-[var(--we-accent)]" />} label="Send a print job" sub={`Upload your files. ${naira(s.print_prices.bw)} a page, ${naira(s.print_prices.colour)} colour${s.print_prices.handwrite ? `, handwriting ${naira(s.print_prices.handwrite)} a page` : ""}.`} onClick={need(() => setPrint(true))} /></Box>
        </>)}
        {bookItems.length > 0 && (<>
          <Head>{s.biz_category === "Lodges" ? "Rooms" : "Book a time"}</Head>
          <Box>{bookItems.map((i) => (
            <div key={i.id} className="flex items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 last:border-0">
              {i.image_url && <img src={i.image_url} alt="" className="h-16 w-16 rounded-[6px] object-cover" />}
              <div className="min-w-0 flex-1"><div className="text-[16px] text-[var(--we-text)]">{i.name}</div>{i.description && <div className="text-[13px] text-[var(--we-sub)]">{i.description}</div>}<div className="text-[14px] text-[var(--we-text)]">{naira(i.price)}{i.unit ? ` ${i.unit}` : ""}</div></div>
              <button onClick={need(() => setBook(i))} className="shrink-0 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white">{s.biz_category === "Lodges" ? "Inspect" : "Book"}</button>
            </div>
          ))}</Box>
          {s.biz_category === "Lodges" && <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">Rent and deposits aren&apos;t paid on Birdie. See the room first, and pay the landlord directly.</p>}
        </>)}
        {sections.map((sec) => (
          <div key={sec}>
            <Head>{sec || (s.biz_category === "Print" ? "Other things" : "Menu")}</Head>
            <Box>{orderItems.filter((i) => (i.section ?? "") === sec).map((i) => (
              <div key={i.id} className="flex items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 last:border-0">
                {i.image_url && <img src={i.image_url} alt="" className="h-16 w-16 rounded-[6px] object-cover" />}
                <div className="min-w-0 flex-1"><div className="text-[16px] text-[var(--we-text)]">{i.name}</div>{i.description && <div className="line-clamp-2 text-[13px] text-[var(--we-sub)]">{i.description}</div>}<div className="text-[14.5px] font-medium text-[var(--we-text)]">{naira(i.price)}{i.unit ? <span className="font-normal text-[var(--we-sub)]"> {i.unit}</span> : ""}</div></div>
                {s.can_order && (cart[i.id] ? (
                  <div className="flex items-center gap-2"><button onClick={() => add(i, -1)} aria-label="Less" className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--we-accent)] text-[var(--we-accent)]"><Minus size={15} /></button><span className="w-5 text-center text-[15px]">{cart[i.id]}</span><button onClick={() => add(i, 1)} aria-label="More" className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--we-accent)] text-white"><Plus size={15} /></button></div>
                ) : <button onClick={need(() => add(i, 1))} aria-label={`Add ${i.name}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--we-accent)] text-white"><Plus size={15} /></button>)}
              </div>
            ))}</Box>
          </div>
        ))}
        {s.biz_type === "campus_business" && !s.can_order && <p className="px-4 pt-3 text-[13.5px] text-[var(--we-sub)]">{s.is_open ? "Not taking orders on Birdie yet." : "Closed right now."}</p>}
        {s.reviews.length > 0 && (<>
          <Head>Reviews</Head>
          <Box>{s.reviews.map((r, i) => (
            <div key={i} className="border-b border-[var(--we-sep)] px-4 py-3 last:border-0">
              <div className="flex items-center gap-2"><Stars value={r.rating} /><span className="text-[13px] text-[var(--we-sub)]">{r.who} · {new Date(r.created_at).toLocaleDateString()}</span></div>
              {r.body && <p className="mt-1 text-[14.5px] text-[var(--we-text)]">{r.body}</p>}
              {r.reply && <p className="mt-1 rounded-[4px] bg-[var(--we-bg)] px-2 py-1 text-[13.5px] text-[var(--we-sub)]">{s.name}: {r.reply}</p>}
            </div>
          ))}</Box>
        </>)}
      </div>
      {count > 0 && (
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-[var(--we-sep)] bg-[var(--we-cell)] px-4 py-3">
          <span className="flex-1 text-[15px] text-[var(--we-text)]">{count} item{count === 1 ? "" : "s"} · <b>{naira(sub)}</b></span>
          <button onClick={() => setCheckout(true)} className="rounded-[6px] bg-[var(--we-accent)] px-6 py-2.5 text-[15.5px] font-medium text-white">Checkout</button>
        </div>
      )}
      <Checkout open={checkout} store={s} cart={cart} onClose={() => setCheckout(false)} onDone={(o) => { setCart({}); onOrdered(o); }} />
      {s.print_prices && <PrintJob open={print} store={s} onClose={() => setPrint(false)} onDone={onOrdered} />}
      <BookPage item={book} store={s} onClose={() => setBook(null)} />
    </Page>
  );
}

/** Pays an order: Paystack checkout, or (admins, test shops) the test button. */
async function pay(o: Order, flash: (t: string) => void, onTest: (o: Order) => void) {
  if (o.is_test) { const r = await adminTestPay(o.id); if (r.error || !r.data) return flash(r.error === "admins only" ? "Only admins can pay test orders" : errText(r.error)); return onTest(r.data); }
  const r = await startPayment("order", o.id);
  if (r.authorization_url) window.location.href = r.authorization_url; else flash(errText(r.error));
}

function Checkout({ open, store, cart, onClose, onDone }: { open: boolean; store: Store; cart: Cart; onClose: () => void; onDone: (order: string) => void }) {
  const { flash, profile } = useApp();
  const [f, setF] = useState({ fulfil: store.pickup ? "pickup" : "delivery", address: "", phone: "", note: "", code: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) void Promise.resolve().then(() => setF((x) => ({ ...x, address: x.address || profile.address || "" }))); }, [open, profile.address]);
  const lines = store.items.filter((i) => cart[i.id]);
  const sub = lines.reduce((a, i) => a + cart[i.id] * i.price, 0);
  const del = f.fulfil === "delivery" ? store.delivery_fee ?? 0 : 0;
  async function go() {
    setBusy(true);
    const r = await orderCreate(store.id, { items: lines.map((i) => ({ id: i.id, qty: cart[i.id] })), fulfil: f.fulfil, address: f.address, phone: f.phone, note: f.note, code: f.code });
    if (r.error || !r.data) { setBusy(false); return flash(errText(r.error)); }
    await pay(r.data, flash, (o) => onDone(o.id));
    setBusy(false);
  }
  return (
    <Page open={open} onClose={onClose} title="Checkout">
      <Head>Your order</Head>
      <Box>{lines.map((i) => <Row key={i.id} label={`${cart[i.id]} x ${i.name}`} value={naira(cart[i.id] * i.price)} />)}</Box>
      <Head>How</Head>
      <Box>
        <Pick label="Get it by" value={f.fulfil} onChange={(v) => setF((x) => ({ ...x, fulfil: v }))} options={[...(store.pickup ? [["pickup", "Pickup"]] as [string, string][] : []), ...(store.delivery_fee != null ? [["delivery", `Delivery (${naira(store.delivery_fee)})`]] as [string, string][] : [])]} />
        {f.fulfil === "delivery" && <Field label="Deliver to" value={f.address} onChange={(v) => setF((x) => ({ ...x, address: v }))} placeholder="Hostel, block, room" />}
        <Field label="Phone" value={f.phone} onChange={(v) => setF((x) => ({ ...x, phone: v }))} type="tel" inputMode="tel" placeholder="So they can reach you" />
        <Field label="Code" value={f.code} onChange={(v) => setF((x) => ({ ...x, code: v.toUpperCase() }))} placeholder="Discount code (optional)" />
        <Area label="Note" value={f.note} onChange={(v) => setF((x) => ({ ...x, note: v }))} rows={2} max={400} placeholder="e.g. no pepper" />
      </Box>
      <Box className="mt-2"><Row label="Items" value={naira(sub)} />{del > 0 && <Row label="Delivery" value={naira(del)} />}<Row label={<b>Total</b>} value={<b className="text-[var(--we-text)]">{naira(sub + del)}{f.code ? " before code" : ""}</b>} /></Box>
      <div className="px-4 pb-10 pt-4">
        <Primary disabled={busy || !lines.length || (f.fulfil === "delivery" && f.address.trim().length < 4)} onClick={() => void go()}>{busy ? "Starting payment..." : store.is_test ? "Pay (Test)" : `Pay ${naira(sub + del)}`}</Primary>
        <p className="mt-2 text-center text-[12.5px] leading-snug text-[var(--we-hint)]">Paid with Paystack. If they don&apos;t accept within 20 minutes, you&apos;re refunded on your own.</p>
      </div>
    </Page>
  );
}

function PrintJob({ open, store, onClose, onDone }: { open: boolean; store: Store; onClose: () => void; onDone: (order: string) => void }) {
  const { flash } = useApp();
  const pp = store.print_prices!;
  const [files, setFiles] = useState<{ path: string; name: string; pages: number }[]>([]);
  const [f, setF] = useState({ copies: "1", colour: false, binding: "none", handwrite: false, fulfil: store.pickup ? "pickup" : "delivery", address: "", phone: "", note: "" });
  const [busy, setBusy] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function attach(list: FileList | null) {
    if (!list?.length) return;
    const user = (await createClient().auth.getSession()).data.session?.user;
    if (!user) return flash("Sign in first");
    setBusy("upload");
    for (const file of Array.from(list)) {
      const path = `${user.id}/orders/${uid()}-${safeName(file.name)}`;
      if (await uploadTo("study-files", path, file)) { flash(`Couldn't upload ${file.name}`); continue; }
      setFiles((x) => [...x, { path, name: file.name, pages: 0 }]);
      const n = await countPdfPages(file);
      setFiles((x) => x.map((y) => (y.path === path ? { ...y, pages: n ?? 1 } : y)));
    }
    setBusy(""); if (input.current) input.current.value = "";
  }
  const pages = files.reduce((a, x) => a + (x.pages || 0), 0);
  const copies = Math.max(1, Number(f.copies) || 1);
  const cost = f.handwrite ? pages * (pp.handwrite ?? 0) : pages * copies * (f.colour ? pp.colour : pp.bw) + (f.binding !== "none" ? copies * (pp[f.binding as "spiral" | "hard"] ?? 0) : 0);
  const total = cost + (f.fulfil === "delivery" ? store.delivery_fee ?? 0 : 0);
  async function go() {
    setBusy("pay");
    const r = await orderCreate(store.id, { kind: "print", print: { files, copies, colour: f.colour, binding: f.binding, handwrite: f.handwrite }, fulfil: f.fulfil, address: f.address, phone: f.phone, note: f.note });
    if (r.error || !r.data) { setBusy(""); return flash(errText(r.error)); }
    await pay(r.data, flash, (o) => onDone(o.id));
    setBusy("");
  }
  return (
    <Page open={open} onClose={onClose} title={`Print at ${store.name}`}>
      <Head>Files</Head>
      <Box>
        {files.map((x) => (
          <div key={x.path} className="flex items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3">
            <FileText size={20} className="text-[var(--we-sub)]" /><span className="min-w-0 flex-1 truncate text-[15px] text-[var(--we-text)]">{x.name}</span>
            <input value={x.pages || ""} onChange={(e) => setFiles((l) => l.map((y) => (y.path === x.path ? { ...y, pages: Number(e.target.value.replace(/\D/g, "")) || 0 } : y)))} inputMode="numeric" className="w-12 rounded-[4px] bg-[var(--we-bg)] px-2 py-1 text-center text-[14px] outline-none" aria-label="Pages" />
            <span className="text-[13px] text-[var(--we-sub)]">pages</span>
          </div>
        ))}
        <Row icon={<Upload size={20} className="text-[var(--we-accent)]" />} label={busy === "upload" ? "Uploading..." : "Add files"} sub="PDF pages are counted for you; check Word files" onClick={() => input.current?.click()} />
        <input ref={input} type="file" multiple hidden accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" onChange={(e) => void attach(e.target.files)} />
      </Box>
      <Head>How</Head>
      <Box>
        {pp.handwrite ? <Pick label="Job" value={f.handwrite ? "hand" : "print"} onChange={(v) => setF((x) => ({ ...x, handwrite: v === "hand" }))} options={[["print", "Print"], ["hand", "Write it out by hand"]]} /> : null}
        {!f.handwrite && <>
          <Field label="Copies" value={f.copies} onChange={(v) => setF((x) => ({ ...x, copies: v.replace(/\D/g, "").slice(0, 2) }))} inputMode="numeric" />
          <Pick label="Colour" value={f.colour ? "c" : "bw"} onChange={(v) => setF((x) => ({ ...x, colour: v === "c" }))} options={[["bw", `Black and white (${naira(pp.bw)}/page)`], ["c", `Colour (${naira(pp.colour)}/page)`]]} />
          <Pick label="Binding" value={f.binding} onChange={(v) => setF((x) => ({ ...x, binding: v }))} options={[["none", "None"], ["spiral", `Spiral (${naira(pp.spiral)})`], ["hard", `Hard cover (${naira(pp.hard)})`]]} />
        </>}
        <Pick label="Get it by" value={f.fulfil} onChange={(v) => setF((x) => ({ ...x, fulfil: v }))} options={[...(store.pickup ? [["pickup", "Pickup"]] as [string, string][] : []), ...(store.delivery_fee != null ? [["delivery", `Delivery (${naira(store.delivery_fee)})`]] as [string, string][] : [])]} />
        {f.fulfil === "delivery" && <Field label="Deliver to" value={f.address} onChange={(v) => setF((x) => ({ ...x, address: v }))} />}
        <Field label="Phone" value={f.phone} onChange={(v) => setF((x) => ({ ...x, phone: v }))} type="tel" inputMode="tel" />
        <Area label="Instructions" value={f.note} onChange={(v) => setF((x) => ({ ...x, note: v }))} rows={2} max={400} placeholder={f.handwrite ? "Name and matric to write, foolscap or A4, pen colour" : "e.g. pages 1 to 20 only, double-sided"} />
      </Box>
      <Box className="mt-2"><Row label={`${pages} page${pages === 1 ? "" : "s"}${f.handwrite ? " by hand" : ` x ${copies}`}`} value={naira(cost)} />{f.fulfil === "delivery" && <Row label="Delivery" value={naira(store.delivery_fee ?? 0)} />}<Row label={<b>Total</b>} value={<b className="text-[var(--we-text)]">{naira(total)}</b>} /></Box>
      <div className="px-4 pb-10 pt-4"><Primary disabled={!!busy || !pages || (f.fulfil === "delivery" && f.address.trim().length < 4)} onClick={() => void go()}>{busy === "pay" ? "Starting payment..." : store.is_test ? "Pay (Test)" : `Pay ${naira(total)}`}</Primary></div>
    </Page>
  );
}

function BookPage({ item, store, onClose }: { item: Item | null | "general"; store: Store; onClose: () => void }) {
  const { flash } = useApp();
  const [at, setAt] = useState(""); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const real = item && item !== "general" ? item : null;
  async function go() {
    setBusy(true); const r = await bookingRequest(store.id, real?.id ?? null, new Date(`${at}:00+01:00`), note); setBusy(false);
    if (r.error) return flash(r.error === "bad_time" ? "Pick a time at least an hour from now" : errText(r.error));
    flash("Requested. You'll get a notification when they confirm."); onClose();
  }
  return (
    <Page open={!!item} onClose={onClose} title={store.biz_category === "Lodges" ? "Book an Inspection" : "Book a Time"}>
      {real && <Box className="mt-2"><Row label={real.name} sub={`${naira(real.price)}${real.unit ? ` ${real.unit}` : ""}`} /></Box>}
      <Head>When</Head>
      <Box><Field label="Day and time" type="datetime-local" value={at} onChange={setAt} /><Area label="Note" value={note} onChange={setNote} rows={2} max={400} placeholder="Anything they should know" /></Box>
      <div className="px-4 pt-4"><Primary disabled={!at || busy} onClick={() => void go()}>Request</Primary></div>
      <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">Confirmed bookings show on your schedule in Courses.</p>
    </Page>
  );
}

// ---------- My Orders
function MyOrders({ open, startOrder, startTab, onClose }: { open: boolean; startOrder?: string; startTab?: "orders" | "bookings"; onClose: () => void }) {
  const [tab, setTab] = useState<"orders" | "bookings">("orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [one, setOne] = useState<string | null>(null);
  const load = useCallback(() => { void myOrders().then(setOrders); void myBookings().then(setBookings); }, []);
  useEffect(() => { if (open) void Promise.resolve().then(() => { setTab(startTab ?? "orders"); setOne(startOrder ?? null); load(); }); }, [open, startOrder, startTab, load]);
  return (
    <Page open={open} onClose={onClose} title="My Orders">
      <div className="flex justify-center gap-10 bg-[var(--we-bg)] pb-2 pt-1 text-[15.5px]">{([["orders", "Orders"], ["bookings", "Bookings"]] as const).map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`pb-1 ${tab === t ? "border-b-2 border-[var(--we-accent)] font-medium text-[var(--we-text)]" : "text-[var(--we-sub)]"}`}>{l}</button>)}</div>
      {tab === "orders" ? (orders === null ? <p className="py-10 text-center text-[var(--we-sub)]">Loading...</p> : orders.length === 0 ? <Empty icon={<ShoppingBag size={36} />} title="No orders yet" sub="Food, printing and more from shops at your school, in Discover > Mini Programs." /> : (
        <Box>{orders.map((o) => (
          <button key={o.id} onClick={() => setOne(o.id)} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
            <BizAvatar b={o.business} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[16px] text-[var(--we-text)]">{o.business.name}</span><span className="block truncate text-[13px] text-[var(--we-sub)]">{o.items.map((i) => i.name).join(", ")}</span></span>
            <span className="text-right"><span className="block text-[14.5px] text-[var(--we-text)]">{naira(o.total)}</span><span className="block text-[12px] text-[var(--we-sub)]">{ORDER_LABEL[o.status]}</span></span>
          </button>
        ))}</Box>
      )) : (bookings === null ? <p className="py-10 text-center text-[var(--we-sub)]">Loading...</p> : bookings.length === 0 ? <Empty icon={<CalendarClock size={36} />} title="No bookings" /> : (
        <Box>{bookings.map((x) => (
          <Row key={x.id} label={`${x.item ?? "Booking"} · ${x.business.name}`} sub={`${when(x.slot)}${x.business.address ? ` · ${x.business.address}` : ""}`}
            value={["requested", "confirmed"].includes(x.status) ? <span role="button" onClick={async () => { if (!confirm("Cancel this booking?")) return; await bookingAct(x.id, "cancel"); load(); }} className="text-[var(--we-red)]">Cancel</span> : x.status} />
        ))}</Box>
      ))}
      {one && <OrderPage id={one} onClose={() => { setOne(null); load(); }} />}
    </Page>
  );
}

const STEPS: Order["status"][] = ["paid", "accepted", "ready", "delivered", "completed"];
function OrderPage({ id, onClose }: { id: string; onClose: () => void }) {
  const { flash, setTab, setChatView } = useApp();
  const [o, setO] = useState<Order | null>(null);
  const [problem, setProblem] = useState(false);
  const [rate, setRate] = useState(0); const [text, setText] = useState("");
  const load = useCallback(() => { void orderGet(id).then(setO); }, [id]);
  useEffect(() => { void Promise.resolve().then(load); const i = setInterval(load, 20000); return () => clearInterval(i); }, [load]);
  const step = useMemo(() => (o ? (o.status === "out" ? 2 : STEPS.indexOf(o.status)) : -1), [o]);
  if (!o) return <Page open onClose={onClose} title="Order"><p className="py-20 text-center text-[var(--we-sub)]">Loading...</p></Page>;
  const doAct = async (p: Promise<{ data: Order | null; error: string | null }>, ok: string) => { const r = await p; if (r.error) return flash(errText(r.error)); if (r.data) setO(r.data); flash(ok); };
  const canProblem = ["accepted", "ready", "out", "delivered"].includes(o.status);
  return (
    <Page open onClose={onClose} title={o.business.name}>
      <div className="bg-[var(--we-cell)] px-4 py-4">
        <div className="text-[20px] font-semibold text-[var(--we-text)]">{ORDER_LABEL[o.status]}</div>
        <div className="text-[13px] text-[var(--we-sub)]">{o.cancel_reason ?? (o.status === "paid" ? "Waiting for them to accept (20 minutes, or you're refunded)" : o.fulfil === "delivery" ? `Delivery to ${o.address}` : `Pickup at ${o.business.address ?? o.business.name}`)}</div>
        {step >= 0 && !["cancelled", "refunded", "part_refunded", "disputed"].includes(o.status) && (
          <div className="mt-4 flex items-center">{STEPS.map((s, i) => (<span key={s} className="flex flex-1 items-center last:flex-none"><span className={`h-3 w-3 rounded-full ${i <= step ? "bg-[var(--we-accent)]" : "bg-[var(--we-sep)]"}`} />{i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${i < step ? "bg-[var(--we-accent)]" : "bg-[var(--we-sep)]"}`} />}</span>))}</div>
        )}
      </div>
      <Head>Items</Head>
      <Box>
        {o.items.map((i, k) => <Row key={k} label={`${i.qty > 1 ? `${i.qty} x ` : ""}${i.name}`} value={naira(i.price * i.qty)} />)}
        {o.discount > 0 && <Row label="Discount" value={`-${naira(o.discount)}`} />}
        {o.delivery_fee > 0 && <Row label="Delivery" value={naira(o.delivery_fee)} />}
        <Row label={<b>Total</b>} value={<b className="text-[var(--we-text)]">{naira(o.total)}</b>} />
        {o.refund_amount > 0 && <Row label="Refunded" sub="To the card or account you paid with" value={naira(o.refund_amount)} />}
      </Box>
      <div className="space-y-2 px-4 pt-4">
        {o.status === "awaiting_payment" && <Primary onClick={() => void pay(o, flash, (x) => setO(x))}>{o.is_test ? "Pay (Test)" : `Pay ${naira(o.total)}`}</Primary>}
        {["ready", "out", "delivered"].includes(o.status) && <Primary onClick={() => void doAct(orderConfirm(o.id), "Thanks. Enjoy!")}>I Got It</Primary>}
        {canProblem && <Secondary onClick={() => setProblem(true)}>Report a Problem</Secondary>}
        {["awaiting_payment", "paid"].includes(o.status) && <Secondary onClick={async () => { if (!confirm(o.status === "paid" ? "Cancel? You get a full refund." : "Cancel this order?")) return; await doAct(orderCancel(o.id), "Cancelled"); }}><span className="text-[var(--we-red)]">Cancel Order</span></Secondary>}
        <Secondary onClick={() => { onClose(); setTab("chats"); setChatView({ k: "oa", id: o.oa_id }); }}><span className="inline-flex items-center gap-1.5"><MessageCircle size={16} /> Message {o.business.name}</span></Secondary>
      </div>
      {["completed", "part_refunded", "refunded"].includes(o.status) && !o.reviewed && (<>
        <Head>Rate it</Head>
        <Box className="px-4 py-3">
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRate(n)} aria-label={`${n} stars`} className={`text-[28px] ${n <= rate ? "text-[#F5A623]" : "text-[var(--we-hint)]"}`}>★</button>)}</div>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 600))} rows={2} placeholder="What was it like? (optional)" className="mt-2 w-full resize-none rounded-[4px] bg-[var(--we-bg)] px-2.5 py-2 text-[15px] text-[var(--we-text)] outline-none" />
          <button disabled={!rate} onClick={async () => { const r = await orderReview(o.id, rate, text); if (r.error) return flash(errText(r.error)); flash("Thanks for the review"); load(); }} className="mt-2 rounded-[4px] bg-[var(--we-accent)] px-4 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">Post Review</button>
        </Box>
      </>)}
      <p className="px-4 pb-10 pt-4 text-center text-[12px] text-[var(--we-hint)]">Order {o.reference?.slice(-8)} · {new Date(o.created_at).toLocaleString()}</p>
      <Page open={problem} onClose={() => setProblem(false)} title="Report a Problem">
        <p className="px-4 pb-2 pt-4 text-[14px] text-[var(--we-sub)]">Birdie settles it straight away.</p>
        <Box>
          {([["not_received", "I didn't get it", "Full refund"], ["wrong", "Wrong order", "Half back"], ["bad", "Bad quality", "Half back"]] as const).map(([r, l, s]) => (
            <Row key={r} label={l} sub={s} onClick={async () => { const x = await orderProblem(o.id, r); setProblem(false); if (x.error) return flash(errText(x.error)); if (x.data) setO(x.data); flash(x.data?.status === "disputed" ? "The Birdie team will check it" : "Refund on the way"); }} />
          ))}
        </Box>
        <p className="px-4 pt-2 text-[12.5px] text-[var(--we-hint)]">Reporting a lot sends your orders to the Birdie team instead.</p>
      </Page>
    </Page>
  );
}

export type { Biz };
