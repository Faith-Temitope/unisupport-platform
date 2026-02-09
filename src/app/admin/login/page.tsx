"use client";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic for Supabase Auth will go here
    console.log("Logging in...", email);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h1 className="text-3xl font-black mb-2">Staff Portal</h1>
        <p className="text-gray-500 mb-8 font-medium">Authorized personnel only</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-gray-400" size={20} />
            <input 
              type="email" 
              placeholder="Admin Email" 
              className="w-full p-4 pl-12 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500" 
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-gray-400" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full p-4 pl-12 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500" 
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="w-full btn-primary py-4 text-lg mt-4">
            Access Dashboard
          </button>
        </form>
        
        <p className="mt-8 text-xs text-gray-400">
          Forgotten your credentials? Contact the Lead Administrator.
        </p>
      </div>
    </div>
  );
}