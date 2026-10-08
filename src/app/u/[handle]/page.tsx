import { redirect } from "next/navigation";

// birdie link for a username (e.g. /u/ada1234): opens the app on that person's channel, ready to chat.
export default async function UserLink({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  redirect(`/prototype?u=${encodeURIComponent(handle.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30))}`);
}
