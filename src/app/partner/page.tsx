import type { Metadata } from "next";
import { BusinessLanding } from "@/components/BusinessLanding";

export const metadata: Metadata = { title: "Birdie print partners", description: "Print shops near campus: get paid print, binding and handwriting jobs from students on Birdie." };

export default function Page() {
  return <BusinessLanding kind="print" />;
}
