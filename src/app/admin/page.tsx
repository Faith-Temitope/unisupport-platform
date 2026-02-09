import AdminSidebar from "@/components/layout/AdminSidebar";
import { TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  // Mock stats for your ₦5,000,000 goal tracking
  const stats = [
    { label: "Monthly Revenue", value: "₦400,000", sub: "Goal: ₦5M", icon: <TrendingUp className="text-emerald-500" /> },
    { label: "Active Orders", value: "12", sub: "3 Pending Review", icon: <Clock className="text-blue-500" /> },
    { label: "Completed", value: "48", sub: "This Month", icon: <CheckCircle className="text-purple-500" /> },
    { label: "Writers Active", value: "3/6", sub: "On Duty", icon: <AlertCircle className="text-orange-500" /> },
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Executive Overview</h1>
          <p className="text-gray-500">Welcome back, Founder. Here is what's happening today.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-2xl">{stat.icon}</div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-lg">Recent Orders</h2>
            <button className="text-emerald-600 font-bold text-sm">View All</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">Bisi Adekunle</td>
                <td className="px-6 py-4 text-sm text-gray-600">Postgrad Thesis</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">In Progress</span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-orange-600">50% Paid</td>
                <td className="px-6 py-4">
                  <button className="text-emerald-600 font-bold text-sm">Manage</button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">Chidi Okafor</td>
                <td className="px-6 py-4 text-sm text-gray-600">LMS Handle</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Completed</span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600">100% Paid</td>
                <td className="px-6 py-4">
                  <button className="text-emerald-600 font-bold text-sm">View Work</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}