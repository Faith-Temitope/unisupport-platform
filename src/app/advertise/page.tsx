import type { Metadata } from "next";
import { BusinessLanding } from "@/components/BusinessLanding";

export const metadata: Metadata = { title: "Sell to students on Birdie", description: "Self-serve on Birdie: create a business account in the app and start in minutes." };

export default function Page() {
  return <BusinessLanding kind="shop" />;
}
