import { redirect } from "next/navigation";

// A group invite link (e.g. /g/3f9a1c2b7d): opens Birdie and offers to join the group.
export default async function GroupInvite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/prototype?join=${encodeURIComponent(code.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20))}`);
}
