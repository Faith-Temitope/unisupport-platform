import ProfileEdit from "@/components/dashboard/ProfileEdit";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import FadeIn from "@/components/ui/FadeIn";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Security Settings | uniSupport Intelligence",
  description: "Manage your academic identity and security credentials.",
};

export default async function SettingsPage() {
  const cookieStore = await cookies();
  
  // Explicitly defining the handlers for the low-level createServerClient
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <main className="p-4 md:p-10 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
                System <br /> <span className="text-emerald-600">Access.</span>
              </h1>
              <p className="mt-4 text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                Identity & Credential Management
              </p>
            </div>

            <div className="hidden md:flex items-center gap-4 px-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Security Status</p>
                <p className="text-xs font-bold text-gray-900">Vault Encrypted</p>
              </div>
            </div>
          </div>

          <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 md:p-12 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <ProfileEdit user={user} />
          </section>

          <div className="mt-8 px-8 py-6 bg-gray-900 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-gray-400 text-xs font-medium italic text-center md:text-left">
              Identity changes are logged and monitored for security compliance. 
              Changes to your core credentials may require 2FA verification.
            </p>
            <button className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 hover:text-white transition-colors">
              Request Data Export
            </button>
          </div>
        </FadeIn>
      </div>
    </main>
  );
}