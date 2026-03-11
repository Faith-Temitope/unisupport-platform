"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { User, Mail, Shield, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfileEdit({ user }: { user: any }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.user_metadata?.full_name || "",
    email: user?.email || "",
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: formData.full_name }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Intelligence profile updated successfully.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900">
          Profile <span className="text-emerald-600">Settings</span>
        </h2>
        <p className="text-gray-400 text-sm font-medium italic">Update your identity credentials within the uniSupport network.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Full Identity Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 ring-emerald-500 transition-all outline-none"
              placeholder="e.g. Faith Temitope"
            />
          </div>
        </div>

        <div className="space-y-2 opacity-60">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Registered Email (Fixed)</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="email"
              value={formData.email}
              disabled
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm cursor-not-allowed"
            />
          </div>
        </div>

        <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex gap-4 items-start">
          <Shield className="text-emerald-600 mt-1" size={20} />
          <div>
            <p className="text-xs font-bold text-emerald-900 uppercase tracking-tight">Security Protocol</p>
            <p className="text-[11px] text-emerald-700 leading-relaxed italic">Your email is used as your unique identifier and cannot be changed without manual verification from our support team.</p>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <>Save Credentials <Save size={18} /></>}
        </button>
      </form>
    </div>
  );
}