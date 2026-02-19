"use client";

import { useState, useEffect } from "react";
// Use the standard createClient
import { createClient } from "@supabase/supabase-js"; 
import { User, Phone, Camera, Loader2, CheckCircle } from "lucide-react";

// Initialize ONCE outside the component
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfileEdit({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    whatsapp_number: "",
    avatar_url: ""
  });

  // Fetch initial profile data
  useEffect(() => {
    const getProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };
    getProfile();
  }, [user, supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      });

    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm max-w-2xl">
      <header className="mb-8">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Vault Identity</h2>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Update your operative details</p>
      </header>

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-10">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <User size={40} />
                </div>
              )}
            </div>
            <button type="button" className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-xl hover:scale-110 transition-transform">
              <Camera size={16} />
            </button>
          </div>
          <div>
            <h4 className="font-bold text-sm">Profile Image</h4>
            <p className="text-xs text-gray-400">JPG or PNG. Max 1MB.</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">WhatsApp Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text"
                value={profile.whatsapp_number}
                onChange={(e) => setProfile({...profile, whatsapp_number: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                placeholder="234..."
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-black/10"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : success ? <><CheckCircle size={18} /> Profile Updated</> : "Commit Changes"}
        </button>
      </form>
    </div>
  );
}