import type { Metadata } from "next";
import PartnerApp from "./PartnerApp";

export const metadata: Metadata = {
  title: "Birdie print partners",
  description: "Print shops near campus: get print, binding and handwriting orders from students on Birdie, already paid for.",
};

export default function PartnerPage() {
  return <PartnerApp />;
}
