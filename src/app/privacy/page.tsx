import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

const UPDATED = "28 October 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF7FD]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link href="/" className="text-sm font-semibold text-[#7B2A91]">Back to Birdie</Link>
        <h1 className="mt-4 text-3xl font-bold text-[#1E1428]">Privacy Policy</h1>
        <p className="mt-1 text-sm text-[#6E6480]">Last updated {UPDATED}</p>

        <div className="prose prose-sm prose-purple mt-8 max-w-none text-[#2a2036] prose-headings:text-[#1E1428] prose-a:text-[#7B2A91]">
          <p>Birdie is made by Klvr. Unisupport, the help desk inside Birdie, is part of the same product, so this one policy covers both. It says what we collect, why, who sees it, and what you can do about it. If something here isn&apos;t clear, ask us. That&apos;s on us, not you.</p>

          <h2>The short version</h2>
          <ul>
            <li>We don&apos;t sell your data. Not to advertisers, not to anyone.</li>
            <li>Your notes, files and recordings are private unless you share them.</li>
            <li>Your ID card and selfie are only seen by Birdie and the Birdie team.</li>
            <li>You can download everything or delete everything from Settings.</li>
          </ul>

          <h2>What we collect</h2>
          <ul>
            <li><b>Your account.</b> Your email and password. Our sign-in provider, Supabase, keeps the password scrambled, and we never see it.</li>
            <li><b>Your profile.</b> Your name, Birdie ID, level, course, school, country, status line, channel description and links. These show on your channel. You can also add private details that never show anywhere: your matric number, your address and what you&apos;re into.</li>
            <li><b>Verification.</b> If you verify your school, we keep your student ID card photo, a selfie, and what Birdie read off the card (name, school, matric number). Verified accounts also send things like a CAC number, a website, an office address, an ID card and a selfie of the person applying.</li>
            <li><b>What you create.</b> Notes, files, recordings, Birdie chats, messages, voice notes, Moments, videos, comments, campus posts, board listings, your CV, and anything else you add.</li>
            <li><b>Money.</b> Your balance and transactions. Card and bank details go straight to Paystack. We only get the amount and a reference.</li>
            <li><b>Your phone.</b> The model and browser of the phones you use, a code for each so we know your main phone, and a token so we can send notifications if you turn them on. Basic activity too, like when you open the app and which features you use, so we can fix what&apos;s broken.</li>
            <li><b>Location,</b> only when you share it in a chat yourself.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To run Birdie for you: your courses, timetable, chats, feed, reminders and notifications.</li>
            <li>To answer your questions. When you ask Birdie AI something, your question and the parts of your notes it needs go to the AI provider behind the companion you picked.</li>
            <li>To turn speech into text. Voice notes you convert, lecture recordings and video subtitles go to Google Gemini (or OpenAI if Gemini is down). Scans and photos of notes go to Gemini so Birdie can read them.</li>
            <li>To check your school. Your ID card and selfie go to Google Gemini to read the card and compare the faces. If it isn&apos;t sure, a person on the Birdie team looks.</li>
            <li>To keep Birdie safe: checking reports, stopping scams and spam, and spotting when your account is used from a phone that isn&apos;t your main one.</li>
            <li>To pick what you see. Your school, course and interests decide which Discover posts, campus updates, deals and sponsored posts you get.</li>
          </ul>

          <h2>Who sees what</h2>
          <ul>
            <li><b>Your channel</b> (name, Birdie ID, school, description, links, posts) is public to signed-in students, unless you change who can see your profile in Settings.</li>
            <li><b>People at your school</b> see your name, status line and whether your school is verified. Never your matric number, address or ID card.</li>
            <li><b>Moments</b> go to your friends or to only you, whichever you pick. Hearts on Channels videos are shown to your friends.</li>
            <li><b>Chats</b> are seen by the people in them. A course rep&apos;s Birdie announcements go to everyone in that class.</li>
            <li><b>Unisupport writers</b> see the messages and files in your session with them, and nothing else.</li>
            <li><b>The Birdie team</b> can see reported content, verification documents and what&apos;s needed to fix a problem you&apos;ve asked about.</li>
          </ul>

          <h2>Helping Birdie get better (only if you say yes)</h2>
          <p>We&apos;re building Birdie&apos;s own AI, trained on how Nigerian students actually study. If you turn on <b>Help improve Birdie</b> in Settings, or tick Share when you correct an answer, we keep the question, Birdie&apos;s answer and your correction. Your name and email are never attached, and we strip phone numbers and emails out of the text. Your notes, files and recordings are never shared this way. You can wipe everything you&apos;ve shared with <b>Delete what I&apos;ve shared</b> in Settings.</p>

          <h2>Sponsored posts</h2>
          <p>Sponsored posts are matched to your country, state and school inside Birdie. Advertisers never get your data. They only see totals, like how many students saw or tapped their post. Birdie Plus members don&apos;t see them.</p>

          <h2>Who we work with</h2>
          <ul>
            <li><b>Supabase:</b> our database, sign-in and file storage.</li>
            <li><b>Google Gemini:</b> Birdie AI, reading scans, speech to text, voice chat, read-aloud, pictures and ID card checks. While we use Gemini&apos;s free tier, Google may use what&apos;s sent to it to improve its products. We&apos;ll update this page when that changes.</li>
            <li><b>OpenAI and Anthropic:</b> some Birdie AI companions, and speech to text when Gemini is down.</li>
            <li><b>Paystack:</b> payments and top-ups.</li>
            <li><b>Vercel:</b> runs the app.</li>
          </ul>
          <p>Each one only gets what it needs for its job, under its own privacy terms.</p>

          <h2>Your choices</h2>
          <ul>
            <li><b>Download your data</b> in Settings. You get one file with your profile, courses, messages, posts, wallet history and notifications.</li>
            <li><b>Delete your account</b> in Settings. Everything goes, on every device, including your verification photos.</li>
            <li>Both need your password, so nobody holding your unlocked phone can do it. If they happen on a phone that isn&apos;t your main one, your main phone is told.</li>
            <li>Change who can see your profile and who can message you, and turn notifications, recommendations and the mascot on or off, any time.</li>
          </ul>

          <h2>Students under 18</h2>
          <p>A lot of students start school before 18, so some of you are under it. We only collect what Birdie needs to work. A parent or guardian can ask us to show or delete a minor&apos;s data by contacting us below.</p>

          <h2>How long we keep it, and how we protect it</h2>
          <p>We keep your data while your account exists and delete it when you delete your account. Backups can hold a copy for a short while after. Data is encrypted on its way to and from your phone, and every table in our database is locked so one student can only reach what they&apos;re allowed to. Verification photos sit in a private store only the Birdie team can open, one file at a time, for five minutes.</p>

          <h2>Changes</h2>
          <p>When we change this policy in a way that matters, we&apos;ll update the date at the top and tell you in the app.</p>

          <h2>Talk to us</h2>
          <p>Questions about your data: message Unisupport Help in Chats, or email <a href="mailto:hello@theklvr.com">hello@theklvr.com</a> (or <a href="mailto:klvrcorp@gmail.com">klvrcorp@gmail.com</a>). The rules for using Birdie are in the <Link href="/terms">Terms of Service</Link>.</p>
          <p>Birdie, by Klvr.</p>
        </div>
      </div>
    </div>
  );
}
