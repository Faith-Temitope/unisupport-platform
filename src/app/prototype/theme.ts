"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import type { Settings } from "./store";

type Accent = Settings["accent"];

/** Accent choices shown in Settings: id, label, swatch colour. */
export const ACCENTS: [Accent, string, string][] = [
  ["purple", "Purple", "#A63FBD"],
  ["blue", "Blue", "#2F6FEB"],
  ["green", "Green", "#1E9E6A"],
  ["orange", "Orange", "#E8742A"],
  ["pink", "Pink", "#D9467E"],
];

const PALETTE: Record<Accent, { main: string; soft: string; text: string; study: string; studySoft: string }> = {
  purple: { main: "#A63FBD", soft: "#F5E8FA", text: "#6E2A80", study: "#7C4DDB", studySoft: "#EDE6FB" },
  blue: { main: "#2F6FEB", soft: "#E6EEFD", text: "#1D4AA8", study: "#3B5BDB", studySoft: "#E7ECFC" },
  green: { main: "#1E9E6A", soft: "#E2F5EC", text: "#136B47", study: "#138A72", studySoft: "#DFF3EE" },
  orange: { main: "#E8742A", soft: "#FDEEE2", text: "#9A4A12", study: "#D9622B", studySoft: "#FCE9DF" },
  pink: { main: "#D9467E", soft: "#FBE5EE", text: "#9A2A55", study: "#C13D86", studySoft: "#F8E3EF" },
};

function subscribe(cb: () => void) {
  const m = window.matchMedia("(prefers-color-scheme: dark)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Whether the app should be dark right now, following the phone's setting when theme is "system". */
export function useDark(theme: Settings["theme"]) {
  const sys = useSyncExternalStore(subscribe, systemDark, () => false);
  return theme === "dark" || (theme === "system" && sys);
}

/** Accent colours as CSS variables. In dark mode the soft tints are mixed in globals.css instead. */
export function accentVars(accent: Settings["accent"]): CSSProperties {
  const p = PALETTE[accent] ?? PALETTE.purple;
  return {
    "--birdie": p.main, "--uni": p.main, "--birdie-soft": p.soft, "--uni-soft": p.soft,
    "--birdie-text": p.text, "--uni-deep": p.text, "--study": p.study, "--study-soft": p.studySoft,
  } as CSSProperties;
}
