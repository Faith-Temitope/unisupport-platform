"use client";

import { LifeBuoy } from "lucide-react";
import HelpLive from "./HelpLive";
import { useApp } from "./store";
import { Btn, Empty, TopBar } from "./ui";

/** Help is real people (Unisupport) and real orders, so it needs an account. */
export default function Help({ active }: { active: boolean }) {
  const { auth, setAuthOpen } = useApp();
  if (auth.status === "in") return <HelpLive active={active} />;
  return (
    <div className="flex h-full flex-col">
      <TopBar title={<h2 className="disp text-[24px] font-bold text-[var(--text)]">Help</h2>} />
      <div className="flex-1 px-5 pb-28 pt-6">
        <Empty icon={<LifeBuoy size={22} />} title="Chat with Unisupport" text="Sign in to chat with the Unisupport help desk, book tutorials, print and deliver your work, and find internships and SIWES."
          action={<Btn onClick={() => setAuthOpen(true)}>Sign in or create an account</Btn>} />
      </div>
    </div>
  );
}
