import { NextResponse } from "next/server";
import { configValue, errText, gate, logUsage } from "@/lib/ai/gemini";
import { jsonError } from "@/lib/server";

// POST { card, selfie } -> { status, reading }
// A student proves their school: Birdie reads their student ID card, checks it against the name, school
// and matric number on their profile, and compares the card photo with a selfie taken just now.
// Everything matching: verified straight away. Anything unclear: the Birdie team looks at it.
export const maxDuration = 120;

type Reading = {
  is_student_id: boolean; name: string | null; institution: string | null; id_number: string | null; department: string | null; expiry: string | null;
  name_matches: "yes" | "no" | "unsure"; school_matches: "yes" | "no" | "unsure"; id_matches: "yes" | "no" | "unsure" | "not_given";
  same_person: "yes" | "no" | "unsure"; looks_edited: boolean; expired: boolean; problem: string | null;
};

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { card?: string; selfie?: string; matric?: string };
  const g = await gate("verify");
  if (g.fail) return g.fail;
  const { admin, user } = g;
  const mine = (p?: string) => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
  if (!mine(b.card) || !mine(b.selfie)) return jsonError(400, "bad_file");

  const [{ data: ch }, { data: prof }, { data: prev }] = await Promise.all([
    admin.from("channels").select("display_name, school").eq("id", user.id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    admin.from("student_verifications").select("attempts, updated_at, status").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!ch?.school) return jsonError(400, "no_school");
  const today = new Date().toDateString();
  const tries = prev && new Date(prev.updated_at).toDateString() === today ? prev.attempts : 0;
  if (tries >= 3) return jsonError(429, "three_a_day");

  const load = async (p: string) => {
    const { data } = await admin.storage.from("verifications").download(p);
    return data ? { inlineData: { mimeType: data.type || "image/jpeg", data: Buffer.from(await data.arrayBuffer()).toString("base64") } } : null;
  };
  const [card, selfie] = await Promise.all([load(b.card!), load(b.selfie!)]);
  if (!card || !selfie) return jsonError(404, "file_not_found");

  const name = ch.display_name || prof?.full_name || "";
  const matric = String(b.matric ?? "").trim().slice(0, 40);
  const prompt = `The first image should be a student ID card from a Nigerian (or other) university, polytechnic or college. The second is a selfie the student took just now.
The student's profile says: name "${name}", school "${ch.school}", ${matric ? `matric/ID number "${matric}"` : "no matric number given"}.
Read the card and compare. Schools are often written differently (for example "FUL" and "Federal University Lokoja", or "UNILAG" and "University of Lagos"): count those as matching. Names can be in a different order or have a middle name missing: count those as matching.
Reply with JSON only:
{"is_student_id": true|false, "name": "name on the card or null", "institution": "school on the card or null", "id_number": "matric/ID number or null", "department": "or null", "expiry": "or null",
 "name_matches": "yes|no|unsure", "school_matches": "yes|no|unsure", "id_matches": "yes|no|unsure|not_given",
 "same_person": "yes|no|unsure (is the selfie the same person as the photo on the card)", "looks_edited": true|false, "expired": true|false, "problem": "one short sentence if something is wrong, else null"}`;

  let r: Reading;
  try {
    const model = await configValue(admin, "read_model", "gemini-3.6-flash");
    const res = await g.ai.models.generateContent({ model, contents: [{ role: "user", parts: [card as never, selfie as never, { text: prompt }] }], config: { responseMimeType: "application/json", maxOutputTokens: 2000 } });
    await logUsage(admin, user.id, model, "verify", res.usageMetadata?.promptTokenCount ?? 0, res.usageMetadata?.candidatesTokenCount ?? 0);
    r = JSON.parse((res.text ?? "").replace(/^[^{]*/, "").replace(/[^}]*$/, ""));
  } catch (e) {
    console.error("verify failed", errText(e).slice(0, 200));
    return jsonError(502, "vendor_error");
  }

  const clean = r.is_student_id && r.name_matches === "yes" && r.school_matches === "yes" && r.same_person === "yes" && !r.looks_edited && !r.expired && r.id_matches !== "no";
  const clearlyWrong = !r.is_student_id || r.name_matches === "no" || r.school_matches === "no" || r.same_person === "no" || r.id_matches === "no";
  const status = clean ? "verified" : clearlyWrong ? "rejected" : "review";
  const note = clean ? null : r.problem || (!r.is_student_id ? "That doesn't look like a student ID card." : r.school_matches === "no" ? "The school on the card isn't the one on your profile." : r.name_matches === "no" ? "The name on the card isn't the name on your profile." : r.same_person === "no" ? "The selfie doesn't look like the photo on the card." : "The Birdie team will check it.");
  const { error } = await admin.from("student_verifications").upsert({
    user_id: user.id, status, school: ch.school, card_path: b.card, selfie_path: b.selfie, note, attempts: tries + 1, updated_at: new Date().toISOString(),
    reading: { name: r.name, institution: r.institution, id_number: r.id_number, department: r.department, expiry: r.expiry, name_matches: r.name_matches, school_matches: r.school_matches, id_matches: r.id_matches, same_person: r.same_person, looks_edited: r.looks_edited, expired: r.expired, matric_given: matric || null },
  });
  if (error) return jsonError(500, "save_failed");
  if (status === "review") await admin.rpc("_notify_admins", { p_title: "Student ID to check", p_body: `${name} · ${ch.school}`, p_kind: "official", p_link: "/prototype/console?tab=verified" }).then(() => null, () => null);
  return NextResponse.json({ status, note, reading: { name: r.name, institution: r.institution, id_number: r.id_number } });
}
