"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      setNotifications(data || []);

      // Real-time listener
      const channel = supabase
        .channel('realtime_notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    fetchNotifications();
  }, [supabase]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-500 hover:text-emerald-600 transition-colors">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 bg-white border border-gray-100 rounded-[2rem] shadow-2xl p-6 z-[100]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notifications</h4>
            <button onClick={() => setIsOpen(false)}><X size={14} /></button>
          </div>
          
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-[10px] text-center py-4 font-bold text-gray-300 italic uppercase">No new alerts</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">{n.title}</p>
                  <p className="text-xs font-bold text-gray-700 leading-tight">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}