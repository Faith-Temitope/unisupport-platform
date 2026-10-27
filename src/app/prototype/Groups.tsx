"use client";

// Group chats live in the Chats tab (ChatRoom). This is just the sheet shown when someone opens a
// group invite link (/g/<code>).
import { useEffect, useState } from "react";
import { initials } from "./PostCard";
import { groupPreview, joinGroup } from "./live/groupData";
import { useApp } from "./store";
import { Avatar, Btn, Sheet } from "./ui";

const GROUP_COLORS = ["#7C4DDB", "#1B8A85", "#D9467E", "#E2553F", "#4C6EF5", "#A63FBD"];
const colorOf = (s: string) => GROUP_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % GROUP_COLORS.length];

/** Opening a group invite link: show what it is and let them join. */
export function JoinGroupSheet({ code, onDone }: { code: string; onDone: () => void }) {
  const { setChatView, flash } = useApp();
  const [g, setG] = useState<{ id: string; name: string; about: string | null; members: number; joined: boolean } | null | undefined>(undefined);
  useEffect(() => { void groupPreview(code).then(setG); }, [code]);
  return (
    <Sheet open onClose={onDone} title="Group invite">
      {g === undefined ? <p className="py-4 text-center text-[13px] text-[var(--dim)]">Loading...</p> : g === null ? <p className="text-[13.5px] text-[var(--dim)]">This invite link doesn&apos;t work anymore. Ask for a new one.</p> : (
        <div className="space-y-3 text-center">
          <div className="mx-auto w-fit"><Avatar initials={initials(g.name)} color={colorOf(g.name)} size={64} /></div>
          <div><div className="disp text-[19px] font-bold">{g.name}</div><div className="text-[12.5px] text-[var(--dim)]">{g.members} member{g.members === 1 ? "" : "s"}</div></div>
          {g.about && <p className="text-[13.5px] text-[var(--dim)]">{g.about}</p>}
          <Btn onClick={async () => { if (g.joined) { onDone(); setChatView({ k: "group", id: g.id }); return; } const r = await joinGroup(code); if (r.error || !r.id) { flash("Couldn't join"); return; } onDone(); setChatView({ k: "group", id: r.id }); }}>{g.joined ? "Open the group" : "Join group"}</Btn>
        </div>
      )}
    </Sheet>
  );
}
