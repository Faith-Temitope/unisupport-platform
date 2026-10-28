"use client";

// Small building blocks shared by the business screens and the student-side shop and jobs, in the
// WeChat style the rest of Birdie uses.
import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { uploadOfficialMedia } from "./live/chatData";
import { useApp } from "./store";

export const Head = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-end justify-between px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]"><span>{children}</span>{right}</div>
);
export const Box = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`bg-[var(--we-cell)] ${className}`}>{children}</div>;

export const Field = ({ label, value, onChange, placeholder, type = "text", inputMode, suffix }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: "numeric" | "decimal" | "tel" | "text"; suffix?: ReactNode }) => (
  <label className="flex items-center border-b border-[var(--we-sep)] px-4 last:border-0">
    <span className="w-28 shrink-0 text-[16px] text-[var(--we-text)]">{label}</span>
    <input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
    {suffix}
  </label>
);
export const Area = ({ label, value, onChange, placeholder, rows = 4, max = 2000 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; max?: number }) => (
  <label className="block border-b border-[var(--we-sep)] px-4 py-3 last:border-0">
    <span className="mb-1.5 block text-[16px] text-[var(--we-text)]">{label}</span>
    <textarea value={value} onChange={(e) => onChange(e.target.value.slice(0, max))} rows={rows} placeholder={placeholder} className="w-full resize-none bg-transparent text-[15px] leading-snug text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" />
  </label>
);
export const Pick = <T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) => (
  <label className="flex items-center border-b border-[var(--we-sep)] px-4 last:border-0">
    <span className="w-28 shrink-0 text-[16px] text-[var(--we-text)]">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
  </label>
);

export const Primary = ({ children, onClick, disabled, danger }: { children: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) => (
  <button disabled={disabled} onClick={onClick} className={`w-full rounded-[6px] py-3 text-[16px] font-medium text-white disabled:opacity-40 ${danger ? "bg-[var(--we-red)]" : "bg-[var(--we-accent)]"}`}>{children}</button>
);
export const Secondary = ({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) => (
  <button disabled={disabled} onClick={onClick} className="w-full rounded-[6px] bg-[var(--we-cell)] py-3 text-[16px] font-medium text-[var(--we-text)] disabled:opacity-40">{children}</button>
);
export const SaveBtn = ({ onClick, disabled, label = "Save" }: { onClick: () => void; disabled?: boolean; label?: string }) => (
  <button disabled={disabled} onClick={onClick} className="mr-2 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">{label}</button>
);

export const Row = ({ icon, label, sub, value, onClick, danger }: { icon?: ReactNode; label: ReactNode; sub?: ReactNode; value?: ReactNode; onClick?: () => void; danger?: boolean }) => (
  <button onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0 active:bg-[var(--we-bg)] disabled:active:bg-transparent">
    {icon && <span className="flex w-6 shrink-0 justify-center">{icon}</span>}
    <span className="min-w-0 flex-1"><span className={`block text-[16px] ${danger ? "text-[var(--we-red)]" : "text-[var(--we-text)]"}`}>{label}</span>{sub && <span className="block text-[13px] leading-snug text-[var(--we-sub)]">{sub}</span>}</span>
    {value !== undefined && <span className="shrink-0 text-[14px] text-[var(--we-sub)]">{value}</span>}
    {onClick && <span className="shrink-0 text-[var(--we-hint)]">›</span>}
  </button>
);

export const Empty = ({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center px-10 py-14 text-center">
    {icon && <span className="text-[var(--we-hint)]">{icon}</span>}
    <p className="mt-3 text-[16px] text-[var(--we-text)]">{title}</p>
    {sub && <p className="mt-1 text-[13.5px] leading-snug text-[var(--we-sub)]">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Pill = ({ children, tone = "grey" }: { children: ReactNode; tone?: "grey" | "green" | "amber" | "red" | "accent" | "blue" }) => {
  const c = { grey: "bg-[var(--we-bg)] text-[var(--we-sub)]", green: "bg-[#E7F7EE] text-[#1E9E6A]", amber: "bg-[#FFF4E0] text-[#C77700]", red: "bg-[#FDECEA] text-[var(--we-red)]", accent: "bg-[color-mix(in_srgb,var(--we-accent)_14%,transparent)] text-[var(--we-accent)]", blue: "bg-[#E6EEFD] text-[#2F6FEB]" }[tone];
  return <span className={`inline-flex shrink-0 items-center rounded-[4px] px-1.5 py-0.5 text-[11.5px] font-medium ${c}`}>{children}</span>;
};

/** A business photo (logo, cover, menu item, ad): public, uploaded to the business's media folder. */
export function PhotoPick({ oa, value, onChange, label = "Photo", video, square }: { oa: string; value: string | null; onChange: (url: string | null) => void; label?: string; video?: boolean; square?: boolean }) {
  const { flash } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(f?: File) {
    if (!f) return;
    setBusy(true);
    const r = await uploadOfficialMedia(oa, f);
    setBusy(false);
    if (!r.url) return flash(r.error ?? "Couldn't upload it");
    onChange(r.url);
  }
  return (
    <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-3 border-b border-[var(--we-sep)] px-4 py-3 text-left last:border-0">
      <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-[var(--we-bg)] text-[var(--we-hint)] ${square ? "h-14 w-14 rounded-[6px]" : "h-14 w-24 rounded-[6px]"}`}>
        {busy ? <Loader2 size={20} className="animate-spin" /> : value ? (/\.(mp4|mov|webm)(\?|$)/i.test(value) ? <video src={value} muted className="h-full w-full object-cover" /> : <img src={value} alt="" className="h-full w-full object-cover" />) : <ImagePlus size={22} />}
      </span>
      <span className="min-w-0 flex-1"><span className="block text-[16px] text-[var(--we-text)]">{label}</span><span className="block text-[13px] text-[var(--we-sub)]">{value ? "Tap to change" : video ? "A photo or a short video" : "Add a photo"}</span></span>
      {value && <span role="button" onClick={(e) => { e.stopPropagation(); onChange(null); }} className="text-[14px] text-[var(--we-red)]">Remove</span>}
      <input ref={input} type="file" hidden accept={video ? "image/*,video/*" : "image/*"} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
    </button>
  );
}

export const BizAvatar = ({ b, size = 44 }: { b: { name: string; logo_url: string | null; color?: string | null }; size?: number }) => b.logo_url
  ? <img src={b.logo_url} alt="" className="shrink-0 rounded-[6px] object-cover" style={{ width: size, height: size }} />
  : <span className="flex shrink-0 items-center justify-center rounded-[6px] font-semibold text-white" style={{ width: size, height: size, background: b.color || "#576B95", fontSize: size * 0.4 }}>{b.name.slice(0, 1).toUpperCase()}</span>;

export const Stars = ({ value, size = 14 }: { value: number; size?: number }) => (
  <span className="inline-flex items-center" aria-label={`${value} out of 5`} style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= Math.round(value) ? "text-[#F5A623]" : "text-[var(--we-hint)]"}>★</span>)}
  </span>
);

export const when = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
