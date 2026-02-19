"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Mail, Calendar, Download, Search, Trash2, Loader2, ExternalLink } from "lucide-react";

export default function AdminLeads() {
  const supabase = createClient();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setLeads(data);
    setLoading(false);
  }

  const deleteLead = async (id: string) => {
    if (!confirm("Are you sure? This lead will be permanently removed.")) return;
    await supabase.from("leads").delete().eq("id", id);
    fetchLeads();
  };

  const filteredLeads = leads.filter(l => 
    l.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.source_template?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to export leads to CSV
  const exportToCSV = () => {
    const headers = ["Email", "Template", "Date"];
    const rows = leads.map(l => [l.email, l.source_template, new Date(l.created_at).toLocaleDateString()]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "unisupport_leads.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <main className="p-8 bg-[#FBFBFC] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Lead <span className="text-emerald-600">Intelligence</span></h1>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Captured via Template Vault</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search leads..." 
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-xs focus:ring-2 ring-emerald-500 outline-none"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={exportToCSV}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Total Prospects</p>
            <p className="text-4xl font-black italic tracking-tighter text-gray-900">{leads.length}</p>
          </div>
          {/* Add more stats here as needed */}
        </div>

        {/* Table */}
        <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Prospect Email</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Resource Requested</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Captured Date</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Mail size={14} />
                          </div>
                          <span className="font-bold text-gray-900 text-sm">{lead.email}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full text-gray-500">
                          {lead.source_template || "General"}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 text-gray-400 text-xs italic">
                          <Calendar size={14} />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={() => deleteLead(lead.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}