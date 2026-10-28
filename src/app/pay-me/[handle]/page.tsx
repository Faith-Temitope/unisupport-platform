import { redirect } from "next/navigation";

// A "Receive Money" code (e.g. /pay-me/ada.okafor?amount=500): opens Birdie with a transfer to them.
export default async function PayMe({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ amount?: string }> }) {
  const { handle } = await params;
  const { amount } = await searchParams;
  const h = handle.replace(/[^\w.]/g, "").slice(0, 40);
  const n = Math.round(Number(amount ?? 0));
  redirect(`/prototype?payto=${encodeURIComponent(h)}${n > 0 ? `&amount=${Math.min(n, 500000)}` : ""}`);
}
