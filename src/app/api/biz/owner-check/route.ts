import { NextResponse } from "next/server";
import { configValue, errText, gate, logUsage } from "@/lib/ai/gemini";
import { jsonError } from "@/lib/server";

// POST { oa, id_card, selfie } -> { ok, note }
// The person who owns a business shows a government ID (NIN slip, voter's card, driver's licence,
// passport, or a staff/student ID for school bodies) and takes a selfie. Birdie reads the ID and checks
// the face matches. This is what gets a business listed; the CAC/NIN check through Dojah is for the tick.
export const maxDuration = 120;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { oa?: string; id_card?: string; selfie?: string };
  const g = await gate("verify");
  if (g.fail) return g.fail;
  const { admin, user } = g;
  const mine = (p?: string) => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
  if (!/^[0-9a-f-]{36}$/i.test(String(b.oa)) || !mine(b.id_card) || !mine(b.selfie)) return jsonError(400, "bad_request");
  const { data: role } = await admin.rpc("_oa_role", { p_oa: b.oa, p_user: user.id });
  if (role !== "owner") return jsonError(403, "owner_only");
  const { data: oa } = await admin.from("official_accounts").select("name, owner_check").eq("id", b.oa).single();
  const prev = (oa?.owner_check ?? {}) as { tries?: number; day?: string };
  const today = new Date().toISOString().slice(0, 10);
  const tries = prev.day === today ? prev.tries ?? 0 : 0;
  if (tries >= 3) return jsonError(429, "three_a_day");
  const { data: ch } = await admin.from("channels").select("display_name").eq("id", user.id).single();

  const load = async (p: string) => {
    const { data } = await admin.storage.from("verifications").download(p);
    return data ? { inlineData: { mimeType: data.type || "image/jpeg", data: Buffer.from(await data.arrayBuffer()).toString("base64") } } : null;
  };
  const [card, selfie] = await Promise.all([load(b.id_card!), load(b.selfie!)]);
  if (!card || !selfie) return jsonError(404, "file_not_found");
  const prompt = `The first image should be a government ID (NIN slip or card, voter's card, driver's licence, international passport) or a school staff/student ID card. The second is a selfie taken just now.
The person says their name is "${ch?.display_name ?? ""}" and they run "${oa?.name ?? ""}".
Reply with JSON only: {"is_id": true|false, "id_type": "nin|voters|drivers|passport|staff_id|student_id|other", "name_on_id": "name or null", "name_matches": "yes|no|unsure",
"same_person": "yes|no|unsure", "looks_edited": true|false, "expired": true|false, "problem": "one short sentence if something is wrong, else null"}
Names can be in a different order or have a middle name missing: count those as matching.`;
  let r: { is_id: boolean; id_type: string; name_on_id: string | null; name_matches: string; same_person: string; looks_edited: boolean; expired: boolean; problem: string | null };
  try {
    const model = await configValue(admin, "read_model", "gemini-3.6-flash");
    const res = await g.ai.models.generateContent({ model, contents: [{ role: "user", parts: [card as never, selfie as never, { text: prompt }] }], config: { responseMimeType: "application/json", maxOutputTokens: 1500 } });
    await logUsage(admin, user.id, model, "verify", res.usageMetadata?.promptTokenCount ?? 0, res.usageMetadata?.candidatesTokenCount ?? 0);
    r = JSON.parse((res.text ?? "").replace(/^[^{]*/, "").replace(/[^}]*$/, ""));
  } catch (e) {
    console.error("owner check failed", errText(e).slice(0, 200));
    return jsonError(502, "vendor_error");
  }
  const ok = r.is_id && r.name_matches === "yes" && r.same_person === "yes" && !r.looks_edited && !r.expired;
  const note = ok ? null : r.problem || (!r.is_id ? "That doesn't look like an ID." : r.name_matches !== "yes" ? "The name on the ID isn't the name on your Birdie account." : r.same_person !== "yes" ? "The selfie doesn't look like the photo on the ID." : "Try again with clearer photos.");
  await admin.rpc("_biz_owner_checked", { p_oa: b.oa, p_result: { ok, note, id_type: r.id_type, name_on_id: r.name_on_id, id_card: b.id_card, selfie: b.selfie, at: new Date().toISOString(), tries: tries + 1, day: today } });
  return NextResponse.json({ ok, note });
}
