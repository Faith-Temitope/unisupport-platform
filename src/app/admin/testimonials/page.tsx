import AdminSidebar from "@/components/layout/AdminSidebar";
import { Plus, Image as ImageIcon, Trash2 } from "lucide-react";

export default function AdminTestimonials() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Social Proof Manager</h1>
            <p className="text-gray-500">Add WhatsApp screenshots or text reviews to the website.</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Add New
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form to Add New */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold mb-6">Create New Testimonial</h2>
            <div className="space-y-4">
              <input className="w-full p-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Client Name (e.g., Tunde O.)" />
              <input className="w-full p-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="University/Org" />
              <textarea className="w-full p-3 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500" rows={4} placeholder="What did they say?"></textarea>
              
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                <ImageIcon className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload WhatsApp Screenshot (Optional)</p>
              </div>

              <button className="w-full btn-primary py-4">Publish to Website</button>
            </div>
          </div>

          {/* Current List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold px-2">Active Testimonials</h2>
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-700">T</div>
                  <div>
                    <p className="font-bold text-sm">Tobi A. (Unilag)</p>
                    <p className="text-xs text-gray-500">"The formatting was top-notch..."</p>
                  </div>
                </div>
                <button className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}