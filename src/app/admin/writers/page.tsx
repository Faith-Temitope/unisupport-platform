import AdminSidebar from "@/components/layout/AdminSidebar";
import { UserCheck, Star, BookOpen } from "lucide-react";

export default function WritersPage() {
  const writers = [
    { id: 1, name: "Dr. Amara", role: "Premium (PhD)", activeTasks: 2, rating: 4.9, earnings: "₦120,000", status: "Active" },
    { id: 2, name: "Tunde JS", role: "Standard (MSc)", activeTasks: 4, rating: 4.7, earnings: "₦85,000", status: "Active" },
    { id: 3, name: "Blessing W.", role: "Basic (BSc)", activeTasks: 1, rating: 4.8, earnings: "₦40,000", status: "Active" },
    { id: 4, name: "Samuel O.", role: "Backup", activeTasks: 0, rating: 0, earnings: "₦0", status: "Inactive" },
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Writer Registry</h1>
            <p className="text-gray-500">Manage your 3 active and 3 backup experts.</p>
          </div>
          <button className="btn-primary">Add New Writer</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
           {/* Quick Stats */}
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-2xl"><UserCheck className="text-emerald-600" /></div>
              <div><p className="text-xs text-gray-500">Total Writers</p><p className="text-xl font-bold">6</p></div>
           </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Writer Name</th>
                <th className="px-6 py-4">Expertise</th>
                <th className="px-6 py-4">Active Tasks</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Total Payout</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {writers.map((writer) => (
                <tr key={writer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{writer.name}</td>
                  <td className="px-6 py-4 text-gray-600">{writer.role}</td>
                  <td className="px-6 py-4">{writer.activeTasks}</td>
                  <td className="px-6 py-4 flex items-center gap-1"><Star size={14} className="fill-yellow-400 text-yellow-400"/> {writer.rating || "N/A"}</td>
                  <td className="px-6 py-4 font-semibold">{writer.earnings}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${writer.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {writer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}