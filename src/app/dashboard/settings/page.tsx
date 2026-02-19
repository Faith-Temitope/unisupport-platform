import ProfileEdit from "@/components/dashboard/ProfileEdit";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  // Await the cookies because they are now a Promise in Next.js
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      // Pass the store directly as an object, not as a function () => cookieStore
      cookies: cookieStore 
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <ProfileEdit user={user} />
    </div>
  );
}