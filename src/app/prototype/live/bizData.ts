// Birdie for Business: business accounts, catalogue, orders, bookings, jobs and ads, for both sides.
import { createClient } from "@/lib/supabase";
import type { ChatPerson } from "./chatData";

const clean = (m?: string) => (m ?? "").replace(/^.*?exception:\s*/i, "") || "failed";
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await createClient().rpc(fn, args);
  return { data: (data as T) ?? null, error: error ? clean(error.message) : null };
}
const post = async <T>(url: string, body: unknown): Promise<T & { error?: string }> =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ error: "offline" }));

export type BizType = "school_body" | "campus_business" | "organisation";
export type Level = "none" | "listed" | "verified";
export const CATEGORIES = ["Food", "Print", "Laundry", "Lodges", "Repairs", "Gadgets", "Fashion", "Transport", "Beauty", "Groceries", "Other"] as const;
export const FEE_PCT = 5;

export interface Biz {
  id: string; handle: string; name: string; about: string | null; category: string; logo_url: string | null; color: string | null; school: string | null;
  verified: boolean; level: Level; biz_type: BizType; biz_category: string | null; schools: string[]; address: string | null; phone: string | null;
  cover_url: string | null; hours: string | null; is_open: boolean; pickup: boolean; delivery_fee: number | null; print_prices: PrintPrices | null;
  rating: number | null; rating_count: number; is_test: boolean; lat: number | null; lng: number | null;
}
export interface PrintPrices { bw: number; colour: number; spiral: number; hard: number; handwrite?: number }
export interface MyBiz extends Biz { role: "owner" | "admin" | "staff"; status: string; mine: boolean; pending_orders: number }
export interface BizHome extends Biz {
  status: string; role: "owner" | "admin" | "staff"; checklist: { owner_check: boolean; phone: boolean; pin: boolean; schools: boolean; bank: boolean; fee: boolean; kyc: string };
  bank: { bank_name: string | null; account_name: string; last4: string } | null; payouts_ready: boolean; owner_check: { ok: boolean; note: string | null; name_on_id?: string } | null;
  kyc_status: "none" | "queued" | "passed" | "failed"; kyc_note: string | null; fee_paid: boolean; debt: number; ad_credit: number;
  objection_until: string | null; objections: number; probation: boolean; followers: number; orders_open: number; orders_today: number;
  earned_7d: number; earned_30d: number; bookings_open: number; applicants_new: number; ads_live: number; fee_pct: number;
  team: (ChatPerson & { role: string })[];
}
export interface Item { id: string; oa_id: string; section: string | null; name: string; description: string | null; price: number; unit: string | null; image_url: string | null; mode: "order" | "book"; available: boolean; sort: number }
export interface Offer { id: string; title: string; body: string | null; code: string | null; has_code: boolean; percent_off: number | null; ends_at: string | null; active: boolean }
export interface Review { rating: number; body: string | null; reply: string | null; created_at: string; who: string }
export interface Store extends Biz {
  following: boolean; followers: number; my_role: string | null; serves_me: boolean; can_order: boolean;
  items: Item[]; offers: Offer[]; reviews: Review[]; opportunities: Opportunity[]; objection_open: boolean; objected: boolean;
}
export type OrderStatus = "awaiting_payment" | "paid" | "accepted" | "ready" | "out" | "delivered" | "completed" | "cancelled" | "refunded" | "part_refunded" | "disputed";
export interface Order {
  id: string; oa_id: string; user_id: string; kind: "order" | "print"; items: { id?: string; name: string; price: number; qty: number }[];
  print_spec: Record<string, unknown> | null; files: { path: string; name?: string; pages: number }[] | null;
  subtotal: number; discount: number; delivery_fee: number; total: number; birdie_fee: number; fulfil: "pickup" | "delivery"; address: string | null; phone: string | null; note: string | null;
  status: OrderStatus; reference: string; paid_at: string | null; accept_by: string | null; accepted_at: string | null; delivered_at: string | null; created_at: string;
  cancel_reason: string | null; problem: { reason: string; outcome: string } | null; refund_amount: number; is_test: boolean; reviewed: boolean;
  business: { id: string; name: string; handle: string; logo_url: string | null; color: string | null; phone: string | null; address: string | null; is_test: boolean };
  customer: ChatPerson;
}
export interface Booking { id: string; oa_id: string; user_id: string; item_id: string | null; item: string | null; slot: string; note: string | null; status: "requested" | "confirmed" | "declined" | "cancelled" | "done"; customer: ChatPerson; business: { id: string; name: string; address: string | null; phone: string | null } }
export type OppKind = "internship" | "siwes" | "graduate" | "part_time" | "volunteer";
export interface Opportunity {
  id: string; oa_id: string; kind: OppKind; title: string; description: string; location: string | null; mode: "onsite" | "remote" | "hybrid"; paid: boolean; stipend: string | null;
  schools: string[]; courses: string[]; levels: string[]; states: string[]; deadline: string | null; questions: string[]; status: "live" | "closed" | "removed"; created_at: string;
  business: { id: string; name: string; handle: string; logo_url: string | null; color: string | null; verified: boolean }; applicants: number; new?: number;
  my_application: { id: string; status: AppStatus; interview_at: string | null } | null;
}
export type AppStatus = "new" | "shortlisted" | "interview" | "offer" | "hired" | "rejected" | "withdrawn";
export interface Application {
  id: string; opp_id: string; user_id: string; answers: string[]; status: AppStatus; interview_at: string | null; interview_note: string | null; created_at: string;
  cv?: { summary?: string; projects?: { title: string; detail?: string; finalYear?: boolean }[]; experience?: { title: string; detail?: string }[]; skills?: string[] } | null;
  who?: { name: string; school: string | null; course: string | null; level: string | null; verified: boolean; handle: string | null };
  person?: ChatPerson; opportunity?: Opportunity;
}
export type AdFormat = "moment" | "channels" | "featured" | "search" | "course_card" | "boost";
export interface Campaign {
  id: string; oa_id: string; format: AdFormat; goal: "visits" | "orders" | "applications" | "followers"; title: string; body: string | null; cta_label: string;
  target: "profile" | "opportunity" | "url"; target_id: string | null; url: string | null; media_kind: "none" | "image" | "video"; media_url: string | null;
  scope: "own_school" | "multi"; schools: string[]; states: string[]; levels: string[]; courses: string[]; interests: string[];
  cpm: number; budget: number; spent: number; refunded: number; reach: number; views: number; clicks: number; reports: number;
  starts_at: string; ends_at: string | null; status: "review" | "live" | "paused" | "ended" | "rejected"; moderation: { ok: boolean; reason: string | null } | null; created_at: string; results?: number;
}
export interface Ad { id: string; campaign: true; format: AdFormat; title: string; body: string | null; cta_label: string; target: Campaign["target"]; target_id: string | null; url: string | null; media_kind: Campaign["media_kind"]; media_url: string | null; sponsor_name: string; business: Biz }

// ---------- Business side
export const myBusinesses = async () => (await call<MyBiz[]>("my_businesses")).data ?? [];
export const bizCreate = (p: Record<string, unknown>) => call<string>("biz_create", { p });
export const bizHome = (oa: string) => call<BizHome>("biz_home", { p_oa: oa });
export const bizUpdate = (oa: string, p: Record<string, unknown>) => call<BizHome>("biz_update", { p_oa: oa, p });
export const bizTeamAdd = (oa: string, handle: string, role: "admin" | "staff") => call("biz_team_add", { p_oa: oa, p_handle: handle, p_role: role });
export const bizTeamRemove = (oa: string, user: string) => call("biz_team_remove", { p_oa: oa, p_user: user });
export const bizItemSave = (oa: string, p: Partial<Item>) => call<Item>("biz_item_save", { p_oa: oa, p });
export const bizItemDelete = (id: string) => call("biz_item_delete", { p_id: id });
export const bizOfferSave = (oa: string, p: Partial<Offer> & { code?: string | null }) => call<Offer>("biz_offer_save", { p_oa: oa, p });
export const bizOrders = async (oa: string, open: boolean) => (await call<Order[]>("biz_orders", { p_oa: oa, p_open: open })).data ?? [];
export const bizOrderAct = (id: string, action: "accept" | "decline" | "ready" | "out" | "delivered") => call<Order>("biz_order_act", { p_id: id, p_action: action });
export const bizBookings = async (oa: string) => (await call<Booking[]>("biz_bookings", { p_oa: oa })).data ?? [];
export const bookingAct = (id: string, action: "confirm" | "decline" | "done" | "cancel") => call<Booking>("booking_act", { p_id: id, p_action: action });
export const bizReviewReply = (order: string, reply: string) => call("biz_review_reply", { p_order: order, p_reply: reply });
export const bizKycSubmit = (oa: string, p: { rc_number: string; company_type: string; nin: string; selfie: string }) => call("biz_kyc_submit", { p_oa: oa, p });
export const bizOpportunities = async (oa: string) => (await call<Opportunity[]>("biz_opportunities", { p_oa: oa })).data ?? [];
export const oppSave = (oa: string, p: Record<string, unknown>) => call<Opportunity>("opp_save", { p_oa: oa, p });
export const oppClose = (id: string) => call("opp_close", { p_id: id });
export const oppApplicants = async (opp: string) => (await call<Application[]>("opp_applicants", { p_opp: opp })).data ?? [];
export const appSet = (id: string, status: AppStatus, interviewAt?: Date | null, note?: string) => call<Application>("app_set", { p_id: id, p_status: status, p_interview_at: interviewAt?.toISOString() ?? null, p_note: note ?? null });
export const bizAds = async (oa: string) => (await call<Campaign[]>("biz_ads", { p_oa: oa })).data ?? [];
export const adCreate = (oa: string, p: Record<string, unknown>) => call<Campaign>("ad_create", { p_oa: oa, p });
export const adSet = (id: string, action: "pause" | "resume" | "end") => call<Campaign>("ad_set", { p_id: id, p_action: action });
export const adReview = (id: string) => post<{ ok?: boolean; reason?: string | null }>("/api/biz/ad-review", { id });
export const ownerCheck = (oa: string, idCard: string, selfie: string) => post<{ ok?: boolean; note?: string | null }>("/api/biz/owner-check", { oa, id_card: idCard, selfie });
export const bankList = async () => ((await fetch("/api/biz/bank").then((r) => r.json()).catch(() => ({}))) as { banks?: { name: string; code: string }[] }).banks ?? [];
export const bankSet = (oa: string, bankCode: string, accountNumber: string) => post<{ ok?: boolean; account_name?: string }>("/api/biz/bank", { oa, bank_code: bankCode, account_number: accountNumber });

// ---------- Paying (Paystack checkout; test businesses are paid from Test Mode)
export const startPayment = (purpose: "order" | "verify_fee" | "ad_credit", id: string, amount?: number) => post<{ authorization_url?: string; reference?: string }>("/api/biz/pay", { purpose, id, amount });
export const verifyPayment = (reference: string) => post<{ status?: string; purpose?: string; target?: string }>("/api/biz/pay/verify", { reference });

// ---------- Student side
export const bizDirectory = async (category?: string | null, q?: string) => (await call<(Biz & { items: number; offer: { title: string; percent_off: number | null } | null; featured: boolean })[]>("biz_directory", { p_category: category ?? null, p_q: q ?? null })).data ?? [];
export const bizStore = async (oa: string) => (await call<Store>("biz_store", { p_oa: oa })).data;
export const orderCreate = (oa: string, p: Record<string, unknown>) => call<Order>("order_create", { p_oa: oa, p });
export const myOrders = async () => (await call<Order[]>("my_orders")).data ?? [];
export const orderGet = async (id: string) => (await call<Order>("order_get", { p_id: id })).data;
export const orderCancel = (id: string) => call<Order>("order_cancel", { p_id: id });
export const orderConfirm = (id: string) => call<Order>("order_confirm", { p_id: id });
export const orderProblem = (id: string, reason: "not_received" | "wrong" | "bad", note?: string) => call<Order>("order_problem", { p_id: id, p_reason: reason, p_note: note ?? null });
export const orderReview = (id: string, rating: number, body: string) => call("order_review", { p_id: id, p_rating: rating, p_body: body });
export const bookingRequest = (oa: string, item: string | null, slot: Date, note: string) => call<Booking>("booking_request", { p_oa: oa, p_item: item, p_slot: slot.toISOString(), p_note: note });
export const myBookings = async () => (await call<Booking[]>("my_bookings")).data ?? [];
export const bizObject = (oa: string, reason: string) => call("biz_object", { p_oa: oa, p_reason: reason });
export const oppsForMe = async (q?: string) => (await call<Opportunity[]>("opps_for_me", { p_q: q ?? null })).data ?? [];
export const oppGet = async (id: string) => (await call<Opportunity>("opp_get", { p_id: id })).data;
export const oppApply = (opp: string, answers: string[]) => call<Application>("opp_apply", { p_opp: opp, p_answers: answers });
export const myApplications = async () => (await call<Application[]>("my_applications")).data ?? [];
export const appWithdraw = (id: string) => call("app_withdraw", { p_id: id });

// ---------- Ads, as a student sees them
const adCache = new Map<string, { at: number; data: Ad[] }>();
export async function adsFor(surface: "moment" | "channels" | "featured" | "search" | "course_card", limit = 1): Promise<Ad[]> {
  const key = `${surface}:${limit}`;
  const hit = adCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.data;
  const data = (await call<Ad[]>("ads_for_me", { p_surface: surface, p_limit: limit })).data ?? [];
  adCache.set(key, { at: Date.now(), data });
  return data;
}
export const adEvent = (id: string, kind: "view" | "click" | "report", reason?: string) => call("ad_event", { p_id: id, p_kind: kind, p_reason: reason ?? null });

// ---------- Admin
export const adminBusinesses = async (q?: string) => (await call<(Biz & { status: string; debt: number; ad_credit: number; kyc_status: string; kyc: Record<string, unknown> | null; fee_paid: boolean; payouts_ready: boolean; owner_check: { ok: boolean } | null; created_at: string; owners: ChatPerson[] | null; orders_60d: number; refunded_60d: number; objections: number })[]>("admin_businesses", { p_q: q ?? null })).data ?? [];
export const adminBizAct = (oa: string, action: "verify" | "suspend" | "unsuspend" | "clear_debt" | "delete") => call("admin_biz_act", { p_oa: oa, p_action: action });
export const adminDisputes = async () => (await call<Order[]>("admin_disputes")).data ?? [];
export const adminDisputeDecide = (id: string, refund: number) => call("admin_dispute_decide", { p_id: id, p_refund: refund });
export const adminTestPay = (order: string) => call<Order>("admin_test_pay", { p_order: order });
export const adminTestCredit = (oa: string, amount: number) => call("admin_test_credit", { p_oa: oa, p_amount: amount });
export const adminSelfRep = (on: boolean) => call("admin_self_rep", { p_on: on });
export const adminSelfVerifySchool = (on: boolean) => call("admin_self_verify_school", { p_on: on });

export const naira = (n: number) => "₦" + Math.round(Number(n) || 0).toLocaleString("en-NG");
export const ORDER_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Not paid", paid: "Waiting to be accepted", accepted: "Accepted", ready: "Ready", out: "On the way", delivered: "Delivered",
  completed: "Completed", cancelled: "Cancelled", refunded: "Refunded", part_refunded: "Partly refunded", disputed: "Being checked",
};
export const OPP_LABEL: Record<OppKind, string> = { internship: "Internship", siwes: "SIWES / IT", graduate: "Graduate role", part_time: "Part-time", volunteer: "Volunteer" };
export const APP_LABEL: Record<AppStatus, string> = { new: "Applied", shortlisted: "Shortlisted", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Not this time", withdrawn: "Withdrawn" };
export const ERRORS: Record<string, string> = {
  not_allowed: "You can't do that here", sign_in_required: "Sign in first", handle_taken: "That handle is taken", bad_handle: "Handles are 3 to 30 letters, numbers or _",
  verify_school_first: "Verify your school first (Me > Settings > My Profile)", not_your_school: "That's not your school", too_many: "That's the limit", school_required: "Add the school",
  closed: "They're closed right now", not_taking_orders: "Not taking orders yet", item_unavailable: "Something in your order isn't available", empty: "Add something first",
  bad_code: "That code doesn't work", no_delivery: "They don't deliver", address_required: "Add where to deliver", delivery_only: "Delivery only",
  new_business_limit: "New businesses take orders up to ₦20,000 for their first month", busy_today: "They've hit today's limit. Try tomorrow.", too_small: "That's too small an order",
  slow_down: "Slow down a little", not_now: "That can't be done right now", too_late: "It's too late for that", wait_a_bit: "Give them a little longer first",
  verify_first: "Get verified first", more_detail: "Add a bit more detail", bad_deadline: "That deadline has passed", answer_all: "Answer every question",
  already_applied: "You already applied", top_up_first: "Top up your ad credit first", verify_for_multi: "Get verified to reach other schools", min_budget: "The minimum is ₦1,000",
  needs_video: "Channels ads need a video", not_live: "Finish setting up first", no_school: "Add the school you serve", fee_first: "Pay the verification fee first",
  bad_rc: "Check the CAC number", bad_nin: "A NIN is 11 digits", test_business: "Test businesses are paid from Test Mode", name_mismatch: "That account name doesn't match the business or your ID",
  account_not_found: "We couldn't find that account", owner_only: "Only the owner can do this", three_a_day: "That's 3 tries today. Try tomorrow.",
  no_files: "Add your files", no_handwriting: "They don't do handwriting", one_sug_per_school: "Your school already has an SUG account",
};
export const errText = (e: string | null | undefined) => (e && (ERRORS[e] ?? (/duplicate key.*one_sug/.test(e) ? ERRORS.one_sug_per_school : null))) ?? "Something went wrong. Try again.";
