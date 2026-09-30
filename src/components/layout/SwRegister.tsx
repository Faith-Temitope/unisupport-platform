"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable (Add to Home Screen / a TWA for Play Store)
// and shows a clear offline message instead of a browser error when there's no connection.
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => { /* not fatal */ });
  }, []);
  return null;
}
