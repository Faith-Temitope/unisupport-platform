import { createClient as createAdmin } from "@supabase/supabase-js";
import type { Metadata } from "next";
import PayForm from "./PayForm";

// Public page a student sends to a parent: pay into the student's Birdie wallet, no account needed.
export const metadata: Metadata = { title: "Pay for study tools · Birdie", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function student(token: string): Promise<{ firstName: string; school: string | null } | null> {
  if (!/^[a-f0-9]{16}$/.test(token) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const db = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: link } = await db.from("topup_links").select("user_id").eq("token", token).maybeSingle();
  if (!link) return null;
  const [{ data: ch }, { data: p }] = await Promise.all([
    db.from("channels").select("display_name,school").eq("id", link.user_id).maybeSingle(),
    db.from("profiles").select("full_name").eq("id", link.user_id).maybeSingle(),
  ]);
  // First name only: enough for a parent to recognise their child, nothing more.
  const name = ((ch?.display_name as string) || (p?.full_name as string) || "").trim().split(/\s+/)[0];
  return { firstName: name || "your student", school: (ch?.school as string) || null };
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await student(token);
  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-[#F4EFF8] px-4 py-10 text-[#1a1024]" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[16px] font-bold text-white">B</span>
          <span className="text-[20px] font-bold">Birdie</span>
        </div>
        {s ? <PayForm token={token} firstName={s.firstName} school={s.school} /> : (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-[20px] font-bold">This link isn&apos;t active</h1>
            <p className="mt-2 text-[14px] leading-snug text-[#6E6480]">Ask the student to send you a fresh link from their Birdie wallet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
