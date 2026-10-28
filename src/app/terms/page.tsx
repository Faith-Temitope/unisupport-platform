import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service" };

const UPDATED = "28 October 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7FD]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/" className="text-sm font-semibold text-[#7B2A91]">Back to Birdie</Link>
        <h1 className="mt-4 text-3xl font-bold text-[#1E1428]">Terms of Service</h1>
        <p className="mt-1 text-sm text-[#6E6480]">Last updated {UPDATED}</p>

        <div className="prose prose-sm prose-purple mt-8 max-w-none text-[#2a2036] prose-headings:text-[#1E1428] prose-a:text-[#7B2A91]">
          <p>Birdie is a student app made by Klvr. Unisupport, the help desk and writers inside Birdie, is part of it. These terms are the deal between you and us when you use any of it. Create an account or use Birdie as a guest and you&apos;re agreeing to them, so please read them. We kept them short and plain on purpose.</p>

          <h2>What Birdie is</h2>
          <p>Birdie is where you study and where your school life happens. Courses holds your notes, files, recordings and class timetable. Birdie AI answers from your own course material. Chats has your classmates, groups, course chats and Unisupport Help. Discover has Moments, Channels, Campus updates, shared courses, deals and mini programs like Hostel &amp; Roommates and Lost &amp; Found. Me has your wallet, CV, achievements and settings.</p>

          <h2>Your account</h2>
          <ul>
            <li>You need to be old enough to use online services where you live. If the law there says you need a parent or guardian&apos;s permission at your age, get it.</li>
            <li>One person, one account. Use your real name and your real school.</li>
            <li>Keep your password to yourself. What happens on your account is on you, so set a main phone in Settings and change your password if you think someone has it.</li>
            <li>Your Birdie ID can be changed once a week. Don&apos;t pick one that pretends to be someone else, a school office or a brand.</li>
          </ul>

          <h2>Verification</h2>
          <p>Anyone can type a school, so Birdie lets you prove yours with your student ID card and a selfie. Verified accounts (an SUG, a department, a company) send documents like a CAC certificate and an ID card, and a selfie of the person applying. When you send any of this, you&apos;re telling us it&apos;s true, it&apos;s yours, and you&apos;re allowed to speak for whoever you&apos;re applying for. A fake card, someone else&apos;s face or a made-up company gets the account removed, and we may report it. A tick can be taken away if things change or we find out it was wrong.</p>

          <h2>Course reps</h2>
          <p>Course reps get extra tools: the class timetable, the Rep Desk, and up to three class groups. When a rep asks Birdie to post an announcement or add a class, Birdie does it in the rep&apos;s name and the rep is responsible for it. Check what Birdie wrote and use Undo if it got something wrong. We can remove rep tools from anyone who misuses them.</p>

          <h2>What you post</h2>
          <p>Your notes, files, recordings, messages, Moments, videos and posts are yours. By putting them on Birdie, you&apos;re telling us you have the right to, and you&apos;re letting us store them, show them to the people you chose, and process them to run the app (for example, sending your notes to the AI when you ask Birdie a question about them). We don&apos;t claim ownership of any of it.</p>

          <h2>Community rules</h2>
          <p>Birdie works because students can trust each other on it. So don&apos;t:</p>
          <ul>
            <li>harass, threaten, bully or shame anyone, or post someone&apos;s private details or photos without their permission</li>
            <li>post fake hostel or roommate listings, fake lost or found items, or deals that aren&apos;t real</li>
            <li>scam anyone, or ask people to pay outside Birdie for something offered on Birdie</li>
            <li>post nudity, violence, hate, or anything illegal</li>
            <li>pretend to be another student, a lecturer, a school office or Birdie</li>
            <li>spam, scrape Birdie, or try to break into it or around its limits</li>
          </ul>
          <p>Use Report on anything that breaks these rules. We can hide posts, remove groups and suspend or close accounts that break them, and we&apos;ll cooperate with the police where the law requires it.</p>

          <h2>Birdie AI</h2>
          <p>Birdie answers from the material you add, and it says so when your notes don&apos;t cover something. It still gets things wrong sometimes, the same way a classmate can. Check anything that matters before you rely on it, especially before an exam. Turning speech into text (voice notes, lecture recordings, video subtitles) can also make mistakes.</p>

          <h2>Studying honestly</h2>
          <p>Birdie is here to help you learn. Work from a Unisupport writer is a guide and a reference. How you use it is your responsibility, and so is following your school&apos;s rules on academic honesty. We&apos;re not responsible for a mark, a grade or what your school decides.</p>

          <h2>Money</h2>
          <ul>
            <li>You add money to your Birdie balance through Paystack. You can send it to friends, give giveaways in chats, and pay for Birdie Plus, an Exam Pass, printing, tutorials and Unisupport writers.</li>
            <li>Prices are shown before you pay. Money you&apos;ve spent isn&apos;t refunded. Unspent balance can be withdrawn on request, less any payment processor fees.</li>
            <li>Transfers to other students are final once sent, so check who you&apos;re sending to. If you think you&apos;ve been scammed, message Unisupport Help straight away.</li>
            <li>Delete your account with money in it and that money is gone. Withdraw it first.</li>
          </ul>

          <h2>Unisupport Help and writers</h2>
          <p>Unisupport Help is a chat where our team helps you and can connect you to a writer. Agreed prices are paid inside Birdie, and work is released once it&apos;s paid for. Be respectful to writers and staff. Accounts that abuse them, or try to pay or be paid outside the app, get suspended.</p>

          <h2>Sponsored posts</h2>
          <p>You&apos;ll see a few posts marked Sponsored, usually from businesses near your campus. A sponsored post is the business&apos;s word, not ours. Deal with them carefully, the way you would anywhere else.</p>

          <h2>When things go wrong</h2>
          <p>We work hard to keep Birdie running and your data safe, but we can&apos;t promise it will never go down or never have a bug. Birdie is provided as it is. As far as the law allows, we aren&apos;t liable for indirect losses, or for what other students, writers, verified accounts or advertisers do. Nothing here takes away rights you have under Nigerian consumer law.</p>

          <h2>Leaving</h2>
          <p>You can delete your account any time in Settings. We ask for your password and warn you three times, because it can&apos;t be undone. We can suspend or close accounts that break these terms. Where it&apos;s fair to, we&apos;ll tell you why.</p>

          <h2>Changes</h2>
          <p>Birdie keeps growing, so these terms will change too. When the change is a big one, we&apos;ll update the date at the top and tell you in the app before it applies.</p>

          <h2>Talk to us</h2>
          <p>Message Unisupport Help in Chats, or email <a href="mailto:hello@theklvr.com">hello@theklvr.com</a> (or <a href="mailto:klvrcorp@gmail.com">klvrcorp@gmail.com</a>). How we handle your data is in the <Link href="/privacy">Privacy Policy</Link>.</p>
          <p>Birdie, by Klvr.</p>
        </div>
      </div>
    </div>
  );
}
