// Verification (student ID, verified-account documents), password-protected account actions,
// your main phone, the weekly Birdie ID limit, and a rep's class groups.
import { createClient } from "@/lib/supabase";

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await createClient().rpc(fn, args);
  return { data: (data as T) ?? null, error: error ? (error.message ?? "").replace(/^.*?exception:\s*/i, "") || "failed" : null };
}
const post = async <T>(url: string, body: unknown): Promise<T & { error?: string }> =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({ error: "offline" }));

/** Phone photos are big: shrink to a clear JPEG before upload. */
export async function shrinkPhoto(file: File, max = 1800): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/heic") return file;
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.88));
}

/** Upload an ID card, selfie or document to the private verification folder. Returns its path. */
export async function uploadVerification(file: File): Promise<{ path?: string; error?: string }> {
  const blob = await shrinkPhoto(file);
  const type = blob.type || file.type;
  const r = await post<{ path?: string; token?: string }>("/api/verify/upload", { type, size: blob.size });
  if (!r.path || !r.token) return { error: r.error === "too_large" ? "That file is over 10 MB" : r.error === "bad_type" ? "Use a photo or a PDF" : "Couldn't upload it" };
  const { error } = await createClient().storage.from("verifications").uploadToSignedUrl(r.path, r.token, blob, { contentType: type });
  return error ? { error: "Couldn't upload it. Check your connection." } : { path: r.path };
}

export type SchoolCheck = { status: "none" | "pending" | "verified" | "review" | "rejected"; school: string | null; note: string | null; current: boolean };
export const mySchoolVerification = async () => (await call<SchoolCheck>("my_school_verification")).data ?? { status: "none", school: null, note: null, current: false };
export const verifyStudent = (card: string, selfie: string, matric: string) =>
  post<{ status?: SchoolCheck["status"]; note?: string | null; reading?: { name: string | null; institution: string | null; id_number: string | null } }>("/api/verify/student", { card, selfie, matric });

// ---------- This phone, and the protected actions
export function thisDevice(): { id: string; name: string } {
  let id = "";
  try { id = localStorage.getItem("birdie-device-id") ?? ""; if (!id) { id = crypto.randomUUID(); localStorage.setItem("birdie-device-id", id); } } catch { /* private mode */ }
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : "Phone";
  const model = /Android[^;]*;\s*([^;)]+?)(?:\sBuild|\))/i.exec(ua)?.[1]?.trim();
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "browser";
  return { id, name: model && model !== "K" ? `${model} (${os})` : `${os} · ${browser}` };
}
export type Secure = "verify" | "check" | "main" | "export" | "delete";
export const secureAction = <T = Record<string, unknown>>(action: Secure, password: string) => post<T & { ok?: boolean }>("/api/account/secure", { action, password, device: thisDevice() });
export const myMainDevice = async () => (await call<{ id: string; name: string; at: string } | null>("my_main_device")).data;
export const myHandleInfo = async () => (await call<{ handle: string | null; changed_at: string | null; next_change: string | null }>("my_handle_info")).data;
export const pushTest = async () => (await call<boolean>("push_test")).data === true;

// ---------- A rep's class groups
export interface RepCourse { group_id: string; course: string; members: number; groups: { id: string; name: string; kind: "info" | "general"; announce_only: boolean; members: number }[] }
export const repGroups = async () => (await call<RepCourse[]>("rep_groups")).data ?? [];
export const repCreateGroup = (course: string, name: string, kind: "info" | "general") => call<string>("rep_create_group", { p_course: course, p_name: name, p_kind: kind });
export const repSetAnnounce = (group: string, on: boolean) => call("rep_set_announce", { p_group: group, p_on: on });
