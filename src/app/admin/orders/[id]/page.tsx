import AdminSidebar from "@/components/layout/AdminSidebar";
import { FileText, ShieldCheck, Download, CreditCard } from "lucide-react";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  // Mock order details based on your business logic
  const order = {
    id: params.id,
    client: "Bisi Adekunle",
    email: "bisi@example.com",
    service: "Postgraduate Thesis",
    pages: 15,
    totalPrice: 150000,
    paid: 75000,
    status: "Ready for Preview",
    deadline: "Feb 20, 2026",
    instructions: "Standard APA formatting. Focus on the Methodology section for Sustainable Development.",
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 p-8">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order #{order.id}</h1>
            <p className="text-gray-500">Client: {order.client}</p>
          </div>
          <div className="flex gap-3">
             <button className="px-6 py-3 bg-white border border-gray-200 rounded-2xl font-bold hover:bg-gray-50">Request Revision</button>
             <button className="btn-primary">Mark as Final & Send</button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-6">
            {/* Order Details */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={20}/> Task Instructions</h2>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-xl italic">"{order.instructions}"</p>
            </div>

            {/* The Blurred Preview Logic UI */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
               <h2 className="text-lg font-bold mb-4">Work Preview (System Generated)</h2>
               <div className="aspect-4/] bg-gray-200 rounded-xl flex items-center justify-center relative">
                  <div className="absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                     <ShieldCheck size={48} className="text-emerald-600 mb-4" />
                     <p className="font-bold text-gray-900">Blurred Preview Active</p>
                     <p className="text-sm text-gray-600 max-w-xs">Client sees this version until the remaining ₦{order.totalPrice - order.paid} is confirmed.</p>
                  </div>
                  {/* This would be the actual file rendered behind the blur */}
                  <div className="text-[8px] text-gray-400 p-10 select-none">Lorem ipsum dolor sit amet...</div>
               </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
             {/* Payment Card */}
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2"><CreditCard size={18}/> Financials</h2>
                <div className="space-y-3">
                   <div className="flex justify-between text-sm"><span>Total Price:</span><span className="font-bold">₦{order.totalPrice.toLocaleString()}</span></div>
                   <div className="flex justify-between text-sm"><span>Deposit Paid:</span><span className="text-emerald-600 font-bold">₦{order.paid.toLocaleString()}</span></div>
                   <div className="pt-3 border-t flex justify-between"><span>Balance:</span><span className="text-orange-600 font-black">₦{(order.totalPrice - order.paid).toLocaleString()}</span></div>
                </div>
                <button className="w-full mt-6 py-3 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold border border-orange-100">
                   Confirm Balance Payment
                </button>
             </div>

             {/* Files Section */}
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="font-bold mb-4">Internal Files</h2>
                <div className="space-y-2">
                   <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center group">
                      <span className="text-xs truncate max-w-37.5">Main_Thesis_V1.docx</span>
                      <Download size={16} className="text-gray-400 group-hover:text-emerald-600 cursor-pointer" />
                   </div>
                   <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center group">
                      <span className="text-xs">Plagiarism_Report.pdf</span>
                      <Download size={16} className="text-gray-400 group-hover:text-emerald-600 cursor-pointer" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}