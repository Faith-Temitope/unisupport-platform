import { Check } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Basic",
    price: "8,000",
    description: "Perfect for standard essays and class assignments.",
    features: ["Graduate Writer", "Standard Formatting", "1 Revision Round", "Plagiarism Link"],
  },
  {
    name: "Standard",
    price: "10,000",
    description: "Best for final year projects and technical papers.",
    features: ["Experienced Writer (5yr+)", "Full Referencing (APA/MLA)", "Unlimited Revisions", "Detailed PDF AI Report"],
    highlight: true,
  },
  {
    name: "Premium",
    price: "12,000",
    description: "Expert-level support for Postgrad & Corporate tasks.",
    features: ["Subject Matter Expert", "Priority 12h Revisions", "Dedicated Manager", "Full AI Remediation"],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Transparent Pricing</h2>
          <p className="text-gray-600">Pay 50% upfront to start, balance only after you see the preview.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <div key={i} className={`p-8 rounded-3xl bg-white border ${tier.highlight ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-gray-200'} relative`}>
              {tier.highlight && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-bold">Most Popular</span>}
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-bold">₦{tier.price}</span>
                <span className="text-gray-500 ml-1">/page</span>
              </div>
              <p className="text-gray-600 mb-8 text-sm">{tier.description}</p>
              <ul className="space-y-4 mb-8">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm text-gray-700">
                    <Check className="w-5 h-5 text-emerald-500" /> {feat}
                  </li>
                ))}
              </ul>
              <Link 
                href={`/order?tier=${tier.name}`}
                className={`w-full py-4 rounded-2xl font-bold text-center block transition-all ${
                  tier.highlight ? 'btn-primary' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95'
                }`}
              >
                Order {tier.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}