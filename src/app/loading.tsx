import { ClimbSplash, SPLASH_BG } from "@/components/brand/Splash";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: SPLASH_BG }}>
      <ClimbSplash loop scale={1.15} />
    </div>
  );
}
