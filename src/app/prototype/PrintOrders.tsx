"use client";

import { FileText, Paperclip, PenLine, Printer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { countPdfPages } from "./extract";
import { safeName, uploadTo } from "./live/helpData";
import { naira, uid, useApp } from "./store";
import { Btn, Segmented, Sheet, TextField } from "./ui";

type OrderFile = { name: string; path: string };
type Order = {
  id: string; kind: "print" | "handwrite"; status: "paid" | "in_progress" | "ready" | "delivered" | "cancelled"; files: OrderFile[];
  pages: number; copies: number; colour: boolean; binding: string; fulfil: "pickup" | "delivery"; price: number; staff_note: string;
  needed_by: string | null; created_at: string;
};
const STATUS: Record<Order["status"], string> = { paid: "Received", in_progress: "Being worked on", ready: "Ready", delivered: "Delivered", cancelled: "Cancelled" };
const ERRORS: Record<string, string> = {
  name_and_matric_required: "Add the name and matric number to write on it.",
  address_required: "Add a delivery address and phone number.",
  no_files: "Attach the file first.", bad_files: "Re-attach the file and try again.",
  already_started: "We've already started on it, so it can't be cancelled now. Message the help desk.",
};
const msg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

/** One global sheet (mounted in Sheets) for placing print / handwrite orders and tracking them. */
export function PrintOrders() {
  const { printIntent, closePrint, flash, refreshWallet, setWalletOpen, auth, profile } = useApp();
  const open = !!printIntent;
  const [view, setView] = useState<"new" | "orders">("new");
  const [kind, setKind] = useState<"print" | "handwrite">("print");
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [pages, setPages] = useState(""); const [copies, setCopies] = useState("1");
  const [colour, setColour] = useState(false); const [binding, setBinding] = useState<"none" | "spiral" | "hard">("none");
  const [w, setW] = useState({ name: "", matric: "", dept: "", course: "" });
  const [instructions, setInstructions] = useState("");
  const [fulfil, setFulfil] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState(""); const [phone, setPhone] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [quote, setQuote] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Opening from Help or a Study file resets the form to what was asked for.
  useEffect(() => {
    if (!printIntent) return;
    const t = setTimeout(() => {
      setView(printIntent.kind === "orders" ? "orders" : "new");
      if (printIntent.kind !== "orders") setKind(printIntent.kind);
      setFiles(printIntent.file ? [printIntent.file] : []);
      setW((x) => ({ ...x, name: x.name || profile.name, dept: x.dept || profile.program }));
    }, 0);
    return () => clearTimeout(t);
  }, [printIntent, profile.name, profile.program]);

  const loadOrders = () => void createClient().rpc("my_print_orders").then(({ data }) => setOrders((data ?? []) as Order[]));
  useEffect(() => { if (open && view === "orders") void createClient().rpc("my_print_orders").then(({ data }) => setOrders((data ?? []) as Order[])); }, [open, view]);

  const order = () => ({
    kind, files, pages: Math.round(Number(pages) || 0), copies: Math.max(1, Math.round(Number(copies) || 1)), colour, binding: kind === "print" ? binding : "none",
    write_name: w.name, write_matric: w.matric, write_department: w.dept, write_course: w.course, instructions, fulfil,
    address: fulfil === "delivery" ? address : "", phone: fulfil === "delivery" ? phone : "", needed_by: neededBy ? new Date(neededBy).toISOString() : "",
  });
  const n = Math.round(Number(pages) || 0);
  useEffect(() => {
    if (!open || view !== "new" || n < 1) return;
    const t = setTimeout(() => {
      void createClient().rpc("print_quote", { p: { kind, pages: n, copies: Math.max(1, Math.round(Number(copies) || 1)), colour, binding: kind === "print" ? binding : "none", fulfil } }).then(({ data }) => setQuote(Number(data)));
    }, 250);
    return () => clearTimeout(t);
  }, [open, view, kind, n, copies, colour, binding, fulfil]);

  async function attach(list: FileList | null) {
    if (!list?.length) return;
    const sb = createClient(); const { data: { user } } = await sb.auth.getUser();
    if (!user) return flash("Sign in to place an order");
    setUploading(true);
    let added = 0;
    for (const f of Array.from(list)) {
      const path = `${user.id}/orders/${uid()}-${safeName(f.name)}`;
      const err = await uploadTo("study-files", path, f);
      if (err) { flash(`Couldn't upload ${f.name}`); continue; }
      setFiles((x) => [...x, { name: f.name, path }]);
      const p = await countPdfPages(f); if (p) added += p;
    }
    if (added) setPages((x) => String((Number(x) || 0) + added));
    setUploading(false);
    if (input.current) input.current.value = "";
  }

  async function place() {
    setBusy(true);
    const { error } = await createClient().rpc("place_print_order", { p: order() });
    setBusy(false);
    if (error) {
      if (/insufficient_funds/.test(error.message)) { flash(`Top up first. This order is ${quote ? naira(quote) : "more than your balance"}`); closePrint(); setWalletOpen(true); return; }
      return flash(ERRORS[msg(error)] ?? "Couldn't place the order. Try again.");
    }
    flash("Order placed. We'll update you here."); void refreshWallet();
    setFiles([]); setPages(""); setInstructions(""); setView("orders");
  }
  async function cancel(o: Order) {
    const { error } = await createClient().rpc("cancel_my_print_order", { p_id: o.id });
    if (error) return flash(ERRORS[msg(error)] ?? "Couldn't cancel.");
    flash(`Cancelled. ${naira(o.price)} is back in your balance.`); void refreshWallet(); loadOrders();
  }

  const ready = files.length > 0 && n >= 1 && (kind === "print" || (w.name.trim() && w.matric.trim())) && (fulfil === "pickup" || (address.trim() && phone.trim())) && !!quote;
  const chip = (on: boolean) => `flex-1 rounded-xl border-2 py-2 text-[12.5px] font-bold transition active:scale-95 ${on ? "border-[var(--uni)] bg-[var(--uni-soft)] text-[var(--uni-deep)]" : "border-[var(--line)] text-[var(--dim)]"}`;

  return (
    <Sheet open={open} onClose={closePrint} title={view === "orders" ? "Your print orders" : kind === "print" ? "Print & deliver" : "Handwrite my assignment"}>
      {auth.status !== "in" ? <p className="text-[13.5px] text-[var(--dim)]">Sign in to place an order.</p> : view === "orders" ? (
        <div className="space-y-2.5">
          {orders.length === 0 ? <p className="text-[13px] text-[var(--dim)]">No orders yet.</p> : orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-[var(--line)] bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="text-[14px] font-bold">{o.kind === "print" ? `Print · ${o.pages} pages${o.copies > 1 ? ` × ${o.copies}` : ""}` : `Handwritten · ${o.pages} pages`}</div>
                  <div className="truncate text-[12px] text-[var(--dim)]">{o.files.map((f) => f.name).join(", ")}</div></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${o.status === "ready" ? "bg-[var(--uni-soft)] text-[var(--uni-deep)]" : o.status === "cancelled" ? "bg-[var(--paper-dim)] text-[var(--dim)]" : "bg-[var(--birdie-soft)] text-[var(--birdie-text)]"}`}>{STATUS[o.status]}</span>
              </div>
              <div className="mt-1.5 text-[12px] text-[var(--dim)]">{naira(o.price)} · {o.fulfil === "delivery" ? "Delivery" : "Pickup"}{o.needed_by ? ` · needed by ${new Date(o.needed_by).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</div>
              {o.staff_note && <div className="mt-1.5 rounded-lg bg-[var(--paper-dim)] px-2.5 py-1.5 text-[12.5px]">{o.staff_note}</div>}
              {o.status === "paid" && <button onClick={() => void cancel(o)} className="mt-2 text-[12px] font-semibold text-[var(--help)]">Cancel and refund</button>}
            </div>
          ))}
          <Btn variant="ghost" onClick={() => setView("new")}>New order</Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <Segmented value={kind} onChange={setKind} options={[{ id: "print", label: "Print it" }, { id: "handwrite", label: "Handwrite it" }]} />
          <p className="-mt-1 text-[12.5px] leading-snug text-[var(--dim)]">{kind === "print" ? "Projects, assignments, past questions: we print and bind it, and you pick it up or we bring it to you." : "Did it in softcopy but it has to be handwritten? We write it out on paper with your name and matric number and get it to you."}</p>

          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">{kind === "print" ? "File to print" : "Your softcopy"}</div>
            <input ref={input} type="file" multiple hidden accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" onChange={(e) => void attach(e.target.files)} />
            <div className="space-y-1.5">{files.map((f) => (
              <div key={f.path} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-[var(--line)]"><FileText size={15} className="shrink-0 text-[var(--uni)]" /><span className="min-w-0 flex-1 truncate">{f.name}</span><button onClick={() => setFiles((x) => x.filter((y) => y.path !== f.path))} aria-label="Remove"><X size={15} className="text-[var(--dim)]" /></button></div>
            ))}</div>
            <button onClick={() => input.current?.click()} disabled={uploading} className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--uni)]"><Paperclip size={14} /> {uploading ? "Uploading..." : files.length ? "Add another file" : "Attach a file"}</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TextField value={pages} onChange={(v) => setPages(v.replace(/[^\d]/g, "").slice(0, 4))} placeholder={kind === "print" ? "Pages" : "Handwritten pages"} />
            {kind === "print" && <TextField value={copies} onChange={(v) => setCopies(v.replace(/[^\d]/g, "").slice(0, 2))} placeholder="Copies" />}
          </div>
          {kind === "print" && <p className="-mt-2 text-[11.5px] text-[var(--dim)]">PDF pages are counted for you. For Word files, enter the page count.</p>}

          {kind === "print" ? (<>
            <div className="flex gap-2"><button onClick={() => setColour(false)} className={chip(!colour)}>Black & white</button><button onClick={() => setColour(true)} className={chip(colour)}>Colour</button></div>
            <div className="flex gap-2">{([["none", "No binding"], ["spiral", "Spiral"], ["hard", "Hard cover"]] as const).map(([id, l]) => (<button key={id} onClick={() => setBinding(id)} className={chip(binding === id)}>{l}</button>))}</div>
          </>) : (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Write on it</div>
              <TextField value={w.name} onChange={(v) => setW({ ...w, name: v })} placeholder="Full name" />
              <TextField value={w.matric} onChange={(v) => setW({ ...w, matric: v })} placeholder="Matric number" />
              <div className="grid grid-cols-2 gap-2"><TextField value={w.dept} onChange={(v) => setW({ ...w, dept: v })} placeholder="Department" /><TextField value={w.course} onChange={(v) => setW({ ...w, course: v })} placeholder="Course code" /></div>
            </div>
          )}
          <TextField multiline value={instructions} onChange={setInstructions} placeholder={kind === "print" ? "Anything else? e.g. print pages 1-20 only, double-sided" : "Anything else? e.g. foolscap, blue pen, include diagrams"} />

          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">How you get it</div>
            <div className="flex gap-2"><button onClick={() => setFulfil("pickup")} className={chip(fulfil === "pickup")}>I&apos;ll pick it up</button><button onClick={() => setFulfil("delivery")} className={chip(fulfil === "delivery")}>Deliver it</button></div>
            {fulfil === "delivery" && <div className="mt-2 space-y-2"><TextField value={address} onChange={setAddress} placeholder="Hostel, room or address" /><TextField value={phone} onChange={setPhone} placeholder="Phone number" /></div>}
            {fulfil === "pickup" && <p className="mt-1.5 text-[11.5px] text-[var(--dim)]">We&apos;ll tell you where to collect it when it&apos;s ready.</p>}
          </div>
          <div><div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Needed by</div><input type="datetime-local" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="w-full rounded-2xl bg-[var(--paper-dim)] px-4 py-3 text-[14px] outline-none" /></div>

          <Btn variant="study" disabled={busy || !ready} onClick={() => void place()}><span className="inline-flex items-center gap-2">{kind === "print" ? <Printer size={16} /> : <PenLine size={16} />} {busy ? "Placing order..." : quote && n >= 1 ? `Pay ${naira(quote)} from balance` : "Pay"}</span></Btn>
          <p className="text-center text-[11.5px] text-[var(--dim)]">You can cancel for a full refund until we start on it.</p>
          <button onClick={() => setView("orders")} className="w-full text-center text-[12.5px] font-bold text-[var(--uni)]">See my orders</button>
        </div>
      )}
    </Sheet>
  );
}
