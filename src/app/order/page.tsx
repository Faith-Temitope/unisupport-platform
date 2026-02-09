"use client";

import { useForm } from "react-hook-form";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type OrderFormData = {
  name: string;
  university: string;
  serviceType: string;
  tier: string;
  pages: number;
  deadline: string;
  description: string;
  phone: string;
};

function OrderFormContent() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detect if we came from LMS or Special services
  const urlService = searchParams.get("service"); 
  const isCustomQuote = urlService === "LMS" || urlService === "Special";

  const { register, handleSubmit, watch } = useForm<OrderFormData>({
    defaultValues: {
      serviceType: urlService === "LMS" ? "LMS Management" : "Undergraduate Project",
      tier: "Standard",
      pages: 1
    }
  });

  const selectedTier = watch("tier");
  const pageCount = watch("pages") || 0;

  const calculateEstimate = () => {
    let pricePerPage = 0;
    if (selectedTier === "Basic") pricePerPage = 8000;
    if (selectedTier === "Standard") pricePerPage = 10000;
    if (selectedTier === "Premium") pricePerPage = 12000;
    const total = pricePerPage * pageCount;
    return total;
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    
    const total = calculateEstimate();
    const message = `*${isCustomQuote ? "CUSTOM QUOTE REQUEST" : "NEW ORDER"}*%0A
*Name:* ${data.name}%0A
*Service:* ${data.serviceType}%0A
*Uni/Org:* ${data.university}%0A
${!isCustomQuote ? `*Tier:* ${data.tier}%0A*Pages:* ${data.pages}%0A*Estimate:* ₦${total.toLocaleString()}` : '*Pricing:* To be discussed (Custom Service)'}%0A
*Deadline:* ${data.deadline}%0A
*Details:* ${data.description}`;

    const whatsappNumber = "234XXXXXXXXXX"; // REPLACE WITH YOUR NUMBER
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message.replace(/%0A/g, '\n'))}`;

    // Redirect to WhatsApp
    window.open(waUrl, "_blank");
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
        <h1 className="text-3xl font-black mb-2 text-gray-900">
          {isCustomQuote ? "Request a Custom Quote" : "Start Your Project"}
        </h1>
        <p className="text-gray-600 mb-8 font-medium">
          {isCustomQuote 
            ? "Tell us about your specific needs and we'll provide a bespoke quote." 
            : "Fill the details below to get an instant estimate and start chatting."}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Full Name</label>
              <input {...register("name")} required className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">WhatsApp Number</label>
              <input {...register("phone")} required className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="08012345678" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">University / Organization</label>
              <input {...register("university")} required className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. Unilag" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Service Type</label>
              <select {...register("serviceType")} className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none appearance-none">
                <option value="Undergraduate Project">Undergraduate Project</option>
                <option value="Postgraduate Thesis">Postgraduate Thesis</option>
                <option value="LMS Management">LMS Management</option>
                <option value="Professional/Business Writing">Professional/Business Writing</option>
              </select>
            </div>
          </div>

          {/* Conditional Pricing Section */}
          {!isCustomQuote ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">Tier</label>
                <select {...register("tier")} className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none">
                  <option value="Basic">Basic (₦8k/pg)</option>
                  <option value="Standard">Standard (₦10k/pg)</option>
                  <option value="Premium">Premium (₦12k/pg)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">Pages (Est.)</label>
                <input type="number" {...register("pages")} className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none" placeholder="1" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">Deadline</label>
                <input type="date" {...register("deadline")} required className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none" />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800 text-sm font-medium animate-in fade-in">
              🚀 You are requesting a <strong>Specialized Service</strong>. We will discuss the full scope and provide a custom pricing plan on WhatsApp.
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Project Description</label>
            <textarea {...register("description")} rows={4} className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none transition-all focus:ring-2 focus:ring-emerald-500" placeholder="Please provide specific details about your project..."></textarea>
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-6">
            {!isCustomQuote ? (
              <div>
                <p className="text-emerald-800 font-black text-2xl">Estimate: ₦{calculateEstimate().toLocaleString()}</p>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">50% Deposit to start: ₦{(calculateEstimate() / 2).toLocaleString()}</p>
              </div>
            ) : (
              <div>
                <p className="text-emerald-800 font-black text-xl">Custom Quote Mode</p>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Pricing based on requirements</p>
              </div>
            )}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary w-full md:w-auto px-12 py-4 text-lg active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Confirm & Chat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center font-bold text-emerald-600">Loading uniSupport Form...</div>}>
      <OrderFormContent />
    </Suspense>
  );
}