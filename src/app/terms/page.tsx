import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service" };

const UPDATED = "30 September 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF7FD]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/" className="text-sm font-semibold text-[#7B2A91]">← Back to Birdie</Link>
        <h1 className="mt-4 text-3xl font-bold text-[#1E1428]">Terms of Service</h1>
        <p className="mt-1 text-sm text-[#6E6480]">Last updated {UPDATED}</p>

        <div className="prose prose-sm prose-purple mt-8 max-w-none text-[#2a2036] prose-headings:text-[#1E1428] prose-a:text-[#7B2A91]">
          <p>These terms cover Birdie, the study app, and Unisupport, the writer help desk built into it. By creating an account or using Birdie as a guest, you agree to them.</p>

          <h2>What Birdie is</h2>
          <p>Birdie helps you study from your own course material: it can answer questions, make flashcards, summarise and quiz you, always grounded in the notes and files you've added — it says so plainly when something isn't covered rather than making it up. Help connects you with a real writer for mentoring ("Mentor me") or a full write-up ("Do it for me").</p>

          <h2>Your account</h2>
          <p>You need to be old enough to use online services in your country, with a parent or guardian's consent if your country requires it for your age. Keep your password safe — you're responsible for what happens under your account. Guest mode keeps your work on that device only; create an account to keep it safe and use it elsewhere.</p>

          <h2>Your content</h2>
          <p>You own what you upload — notes, files, recordings, posts. By adding it, you're telling us you have the right to, and you let us store and process it to run the app for you (for example, sending relevant notes to an AI brain when you ask it a question). Don't upload anything you don't have the rights to, or anything illegal, harassing or that violates someone else's privacy.</p>

          <h2>Academic honesty</h2>
          <p>Birdie's AI only answers from your own material and tells you when it doesn't know. "Do it for me" work from a Unisupport writer is meant as a reference and a learning aid — you're responsible for how you use it and for following your institution's academic integrity rules. We're not liable for a mark, grade or academic outcome.</p>

          <h2>Paid features and your balance</h2>
          <p>Spark, Birdie's free AI brain, always stays free, with a fair daily limit. Nova and Sage are paid — you top up your Birdie balance with Paystack and each answer is charged from it at a clearly shown price before you send it. Session and work fees with writers work the same way: nothing downloads until it's paid for. Top-ups are non-refundable once spent; an unused balance can be refunded on request within a reasonable time, minus any payment processing fees.</p>

          <h2>Writers and Help</h2>
          <p>A session fee connects you to a Unisupport writer inside the app; after that you message them directly with no further desk fee, unless you need a different writer. Unisupport reviews completed work before it counts as closed. Be respectful to writers and staff — we can suspend accounts that are abusive, that attempt to pay outside the app, or that misuse the service.</p>

          <h2>Acceptable use</h2>
          <p>Don't use Birdie to harass others, cheat a payment, scrape or resell our content, attempt to break the app or its security, or impersonate someone else. We can suspend or close an account that breaks these terms.</p>

          <h2>Availability</h2>
          <p>We aim to keep Birdie available, but it's provided "as is" — we don't guarantee it will always be error-free or uninterrupted, and AI answers can occasionally be wrong even when grounded in your notes; always check anything important.</p>

          <h2>Changes</h2>
          <p>We may update these terms as Birdie grows. If we make a material change, we'll update the date above and let you know in the app.</p>

          <h2>Contact</h2>
          <p>Questions about these terms: <a href="mailto:hello@unisupport.app">hello@unisupport.app</a>. See also our <Link href="/privacy">Privacy Policy</Link>.</p>
        </div>
      </div>
    </div>
  );
}
