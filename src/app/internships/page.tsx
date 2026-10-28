import type { Metadata } from "next";
import { BusinessLanding } from "@/components/BusinessLanding";

export const metadata: Metadata = { title: "Find interns and SIWES students on Birdie", description: "Self-serve on Birdie: create a business account in the app and post roles in minutes." };

export default function Page() {
  return <BusinessLanding kind="jobs" />;
}
