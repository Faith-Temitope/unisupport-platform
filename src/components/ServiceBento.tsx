import { CheckCircle2, Laptop, GraduationCap, Briefcase } from "lucide-react";

const detailedServices = [
  {
    title: "Undergraduate Project Support",
    points: ["Chapter-by-chapter structuring", "Literature review research", "Correct Bibliography (APA/MLA/Chicago)", "Plagiarism remediation"],
    icon: <GraduationCap className="text-emerald-600" />,
    color: "bg-emerald-50"
  },
  {
    title: "LMS & Portal Management",
    points: ["Weekly discussion posts", "Quiz/Assignment monitoring", "Deadline tracking", "Grade improvement strategy"],
    icon: <Laptop className="text-blue-600" />,
    color: "bg-blue-50"
  },
  {
    title: "Business & Corporate Writing",
    points: ["Investor-ready Pitch Decks", "Professional CVs & Cover Letters", "Company Profiles", "Report formatting"],
    icon: <Briefcase className="text-orange-600" />,
    color: "bg-orange-50"
  }
];

export default function ServiceBento() {
  return (
    <section id="services" className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-black mb-4">Comprehensive Academic Solutions</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">We don't just write; we provide a complete support ecosystem to ensure your success.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {detailedServices.map((s, i) => (
          <div key={i} className={`${s.color} p-10 rounded-[2.5rem] border border-transparent hover:border-gray-200 transition-all shadow-sm`}>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              {s.icon}
            </div>
            <h3 className="text-2xl font-bold mb-6">{s.title}</h3>
            <ul className="space-y-4">
              {s.points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700 text-sm">
                  <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}