"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Save, ArrowLeft, Loader2, Award, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AddWriter() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    specialization: "Academic Research", // Matches your ExpertsPage column
    is_available: true,
    completed_projects: 0,
    earnings: 0,
    rating: 5.0,
    avatar_url: ""
  });

  // Handle Image Upload to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `expert-photos/${fileName}`;

      // 1. Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: publicUrl });
      setPreviewUrl(publicUrl);
    } catch (err: any) {
      alert("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // We use the column names that match our 'writers' table exactly
      const { error } = await supabase
        .from("writers")
        .insert([formData]);

      if (error) throw error;
      
      router.push("/admin/writers"); 
      router.refresh();
    } catch (err: any) {
      alert("Error adding writer: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8">
            <Link href="/admin/writers" className="text-emerald-600 flex items-center gap-2 text-sm font-bold mb-2 hover:underline">
              <ArrowLeft size={16} /> Back to Registry
            </Link>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Onboard <span className="text-emerald-600">Expert</span></h1>
          </header>

          <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl space-y-8">
            
            {/* AVATAR UPLOAD SECTION */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Profile Identity</label>
                <div className="relative group">
                    <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-inner flex items-center justify-center overflow-hidden border-4 border-white">
                        {previewUrl ? (
                            <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                        ) : (
                            <UploadCloud size={40} className="text-gray-200" />
                        )}
                    </div>
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                    />
                    {uploading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem]">
                            <Loader2 className="animate-spin text-emerald-600" />
                        </div>
                    )}
                </div>
                <p className="text-[9px] font-bold text-gray-400 mt-4 uppercase">Click to upload headshot</p>
            </div>

            <div className="space-y-6">
              {/* Writer Name */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Full Name / Display Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900"
                  placeholder="e.g., Dr. Chidi"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Primary Specialization</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-900"
                  placeholder="e.g., Data Science & AI"
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Available for Hire?</span>
                <button
                    type="button"
                    onClick={() => setFormData({...formData, is_available: !formData.is_available})}
                    className={`px-6 py-2 rounded-full text-[10px] font-black transition-all ${
                        formData.is_available ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                    }`}
                >
                    {formData.is_available ? "ACTIVE" : "OFFLINE"}
                </button>
              </div>

              <div className="p-6 bg-emerald-50 rounded-[2rem] flex items-start gap-4">
                <Award className="text-emerald-600 mt-1" size={24} />
                <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                  <strong>System Note:</strong> The new expert will start with a 5.0 rating. Ensure the 
                  specialization matches the categories you want shown on the <strong>Experts Registry</strong>.
                </p>
              </div>
            </div>

            <button 
              disabled={loading || uploading}
              className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {loading ? "Registering Expert..." : "Finalize Onboarding"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}