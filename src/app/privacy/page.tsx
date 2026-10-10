import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

const UPDATED = "9 October 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF7FD]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/" className="text-sm font-semibold text-[#7B2A91]">← Back to Birdie</Link>
        <h1 className="mt-4 text-3xl font-bold text-[#1E1428]">Privacy Policy</h1>
        <p className="mt-1 text-sm text-[#6E6480]">Last updated {UPDATED}</p>

        <div className="prose prose-sm prose-purple mt-8 max-w-none text-[#2a2036] prose-headings:text-[#1E1428] prose-a:text-[#7B2A91]">
          <p>Birdie is a study app. Help on writing and coursework inside Birdie is provided by Unisupport. This policy covers both, since they're one product. We've tried to write it in plain language rather than boilerplate.</p>

          <h2>What we collect</h2>
          <ul>
            <li><b>Account details:</b> your email and password (handled by our authentication provider, Supabase — we never see or store your raw password), plus the name, level, program, school and country you add to your profile.</li>
            <li><b>Your content:</b> notes, uploaded files, recordings, chat messages, quiz answers and anything else you create or upload in Study, Birdie or Help.</li>
            <li><b>AI conversations:</b> if you ask Birdie's AI a question, your message, any photo you attach and the relevant course material you've added are sent to the AI provider behind whichever "brain" you picked (Google Gemini, OpenAI, or Anthropic) to generate an answer. We don't send your content to a provider you haven't chosen for chat.</li>
            <li><b>Scans, voice and pictures:</b> a few Birdie features always run on Google Gemini, whichever brain you picked. When a file has no readable text (a CamScanner PDF or a photo of your notes), it's sent to Gemini to read the words off the page. During a voice chat, your voice is streamed to Gemini as you speak so Birdie can answer out loud; we don't keep the audio, only the written transcript that appears in your chat. Read-aloud sends the answer's text to Gemini to turn it into speech. If you ask Birdie to draw a picture, your request goes to Gemini and the picture is saved in your own files.</li>
            <li><b>Payments:</b> if you top up your Birdie balance or pay a writer fee, our payment processor, Paystack, handles your card or bank details directly. We only ever receive the amount and a payment reference, never your card number.</li>
            <li><b>Usage data:</b> basic activity like when you study, which features you use, and device/browser information, so we can keep the app working and improve it. If you turn on notifications, we also keep a token for your device so we can send them.</li>
            <li><b>Answer ratings:</b> when you tap 👍 or 👎 on a Birdie answer, we keep the rating and the reason you picked, with no text. More only if you opt in (see below).</li>
          </ul>

          <h2>Helping improve Birdie (only if you opt in)</h2>
          <p>We're building Birdie's own AI model, trained on how Nigerian students actually study. If you turn on <b>Settings → Help improve Birdie</b>, or tick &quot;Share&quot; when you correct an answer, we keep the question you asked, Birdie&apos;s answer and your correction.</p>
          <ul>
            <li>It's off unless you turn it on.</li>
            <li>Your name, email and profile are never attached. Phone numbers and email addresses in what you write are removed before it's saved.</li>
            <li>Your notes, files and recordings are never shared this way, only the question and the correction you chose to send.</li>
            <li>The Birdie team reviews what's shared, and only corrections we've checked are used for training.</li>
            <li>You can turn it off and wipe everything you've shared at any time with <b>Settings → Delete what I&apos;ve shared</b>. Once removed, it isn't used in any future training.</li>
          </ul>

          <h2>Sponsored posts</h2>
          <p>Birdie shows a small number of clearly labelled sponsored posts from businesses, mostly local ones near campus. They're matched to your country, state and school inside our own system, so advertisers never receive your data. They only see totals, like how many students viewed or tapped their post. Birdie Plus members don't see them.</p>

          <h2>What we don't do</h2>
          <ul>
            <li>We don't sell your data.</li>
            <li>We don't share your personal data with advertisers.</li>
            <li>We don't use your notes, recordings or chats for anything other than running the app for you, unless you explicitly opt in as described above.</li>
          </ul>

          <h2>Who can see what</h2>
          <p>Your notes, files and recordings are private to you. If you use Help, the writer assigned to your session can see the messages and files in that session so they can do the work — nothing else. If you share a course or post in Explore, only what you chose to share is visible, under the audience setting you picked in Settings → Privacy.</p>

          <h2>Third parties we use</h2>
          <ul>
            <li><b>Supabase</b> — our database, authentication and file storage.</li>
            <li><b>Google Gemini, OpenAI and Anthropic</b> — power Birdie's AI brains (Spark, Nova and Sage). Google Gemini also reads scanned files, runs voice chat and read-aloud, and draws pictures. Each has its own privacy terms for API use. While Birdie uses Gemini's free tier, Google may use what's sent to it (including scans and voice chats) to improve its products. We tell you about this when you pick Spark, and we'll update this page when that changes.</li>
            <li><b>Paystack</b> — processes payments and top-ups.</li>
            <li><b>Vercel</b> — hosts the app.</li>
          </ul>

          <h2>Your choices</h2>
          <p>In Settings you can download a copy of your data at any time, delete your account, change who can see your profile or message you, and turn off recommendations, notifications or the mascot. Deleting your account removes your courses, notes, chats and profile from our systems.</p>

          <h2>Students under 18</h2>
          <p>Birdie is built for students, some of whom are under 18. We don't knowingly collect more than we need to run the app, and a parent or guardian can ask us to review or delete a minor's data by contacting us below.</p>

          <h2>Data retention and security</h2>
          <p>We keep your data for as long as your account is active, and delete it when you delete your account (a short backup retention period may apply). Data is encrypted in transit and access to it is restricted by row-level security in our database, so one student's data is never visible to another without an explicit share.</p>

          <h2>Changes to this policy</h2>
          <p>If we make a material change, we'll update the date at the top of this page and let you know in the app.</p>

          <h2>Contact</h2>
          <p>Questions about this policy or your data: <a href="mailto:privacy@unisupport.app">privacy@unisupport.app</a>.</p>
        </div>
      </div>
    </div>
  );
}
