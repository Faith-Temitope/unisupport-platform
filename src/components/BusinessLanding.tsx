// The public page for businesses (/advertise, /internships, /partner): everything is self-serve inside
// Birdie, so these just explain it and send people into the app's business setup.
type Kind = "shop" | "jobs" | "print";

const COPY: Record<Kind, { title: string; lead: string; steps: [string, string][]; get: string }> = {
  shop: {
    title: "Sell to the students at your school",
    lead: "Food spots, lodges, laundry, repairs, gadgets. Students find you in Birdie, order and pay inside the app, and your money goes straight to your bank.",
    steps: [
      ["Open Birdie and create a business account", "Me > Switch Account > Create a business account. Two minutes."],
      ["Check your ID and add your bank", "A photo of your ID, a selfie, your location and your payout account. Then you're live."],
      ["Take orders", "Accept orders, mark them ready, done. Paystack pays your share straight to your bank."],
    ],
    get: "Your shop page, orders paid in the app, bookings for inspections, offers and discount codes, and ads from ₦500 per 1,000 students at your school. Birdie keeps 5% of each order.",
  },
  jobs: {
    title: "Find interns, SIWES students and graduates",
    lead: "Post a role once. Students who match your school, course, level and state see it, and apply with their Birdie CV. Many have a verified student ID.",
    steps: [
      ["Open Birdie and create a business account", "Me > Switch Account > Create a business account, as a company or organisation."],
      ["Get verified", "₦5,000 once. We check your CAC number and your NIN, automatically."],
      ["Post the role and pick who moves on", "Shortlist, invite to interview, make an offer. Students are told at every step."],
    ],
    get: "Unlimited job posts, an applicant list with CVs and answers to your questions, interview invites on the student's schedule, and ads to reach more students.",
  },
  print: {
    title: "Get print jobs from students, already paid",
    lead: "Students upload their files in Birdie, Birdie counts the pages and prices it with your rates, they pay, and you print. Binding and handwriting too.",
    steps: [
      ["Open Birdie and create a business account", "Me > Switch Account > Create a business account, as a campus business in Print."],
      ["Check your ID, add your bank and your prices", "Set your price per page, colour, binding and handwriting."],
      ["Print and hand over", "Mark it ready or delivered. Paystack pays your share straight to your bank."],
    ],
    get: "Paid print jobs with the files attached, pickup or delivery, and ads to students at your school. Birdie keeps 5% of each order.",
  },
};

export function BusinessLanding({ kind }: { kind: Kind }) {
  const c = COPY[kind];
  return (
    <main className="min-h-[100dvh] bg-[#F4EFF8] px-4 py-10 text-[#1a1024]" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C05BD6] to-[#8A2FA3] text-[16px] font-bold text-white">B</span>
          <span className="text-[20px] font-bold">Birdie for Business</span>
        </div>
        <h1 className="text-[30px] font-bold leading-tight md:text-[36px]">{c.title}</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-[#4a3a5e]">{c.lead}</p>
        <div className="mt-7 space-y-3">{c.steps.map(([t, d], i) => (
          <div key={t} className="flex gap-3 rounded-2xl bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a1024] text-[13px] font-bold text-white">{i + 1}</span>
            <div><div className="text-[15px] font-bold">{t}</div><div className="text-[13.5px] text-[#6E6480]">{d}</div></div>
          </div>
        ))}</div>
        <div className="mt-7 rounded-2xl bg-white p-4 text-[13.5px] leading-relaxed text-[#4a3a5e]"><b className="text-[#1a1024]">What you get:</b> {c.get}</div>
        <a href="/prototype?business=1" className="mt-7 block rounded-2xl bg-[#A63FBD] py-4 text-center text-[16px] font-bold text-white">Open Birdie and Start</a>
        <p className="mt-6 text-center text-[12px] text-[#6E6480]">Birdie, by Klvr. Questions: <a className="underline" href="mailto:hello@theklvr.com">hello@theklvr.com</a></p>
      </div>
    </main>
  );
}
