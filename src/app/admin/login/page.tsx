"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase"; // Note the change here
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient(); // Initialize the browser client

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      // With @supabase/ssr, this push will now work because 
      // the session is automatically synced via cookies
      router.push("/admin");
      router.refresh(); 
    }
  };

  return (

    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border">

        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">

          <input 

            type="email" placeholder="Email" required

            className="w-full p-4 rounded-xl border"

            onChange={(e) => setEmail(e.target.value)}

          />

          <input 

            type="password" placeholder="Password" required

            className="w-full p-4 rounded-xl border"

            onChange={(e) => setPassword(e.target.value)}

          />

          <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold">

            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Login"}

          </button>

        </form>

        {errorMsg && <p className="text-red-500 text-center mt-4">{errorMsg}</p>}

      </div>

    </div>

  );
}