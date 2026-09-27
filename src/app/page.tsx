import { redirect } from "next/navigation";

// Birdie is the product. The old Unisupport marketing site is retired from the front door.
export default function Home() {
  redirect("/prototype");
}
