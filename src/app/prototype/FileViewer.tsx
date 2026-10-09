"use client";

/* eslint-disable @next/next/no-img-element -- the student's own file, shown from a local blob URL */
import { ArrowLeft, Download, FileWarning } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signedUrl } from "./live/helpData";
import { offlineUrl, saveOffline } from "./offline";
import { useApp } from "./store";
import { Screen } from "./ui";

export const extOf = (name: string) => (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? "").toLowerCase();

/** Get the file as a blob: the copy on this phone if there is one, otherwise download it once and keep it. */
async function loadBlob(f: { name: string; path?: string; url?: string }): Promise<Blob | null> {
  if (f.path) {
    const local = await offlineUrl(`file:${f.path}`);
    if (local) return (await fetch(local)).blob();
    const url = await signedUrl("study-files", f.path);
    if (!url) return null;
    void saveOffline(`file:${f.path}`, url, f.name, "file"); // next time it opens instantly, even offline
    const r = await fetch(url);
    return r.ok ? r.blob() : null;
  }
  if (f.url) { const r = await fetch(f.url); return r.ok ? r.blob() : null; }
  return null;
}

/** Word files can come from other students: keep only safe markup (no scripts, handlers or odd links). */
function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,link,meta").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const v = a.value.trim().toLowerCase();
      if (a.name.startsWith("on") || ((a.name === "href" || a.name === "src") && !/^(https?:|#|mailto:|data:image\/)/.test(v))) el.removeAttribute(a.name);
    }
    if (el.tagName === "A") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
  });
  return doc.body.innerHTML;
}

/** PDF pages drawn to canvases with pdf.js, so it works on phones that can't show PDFs inline. */
function PdfPages({ blob }: { blob: Blob }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ pages: number; shown: number } | null>(null);
  const doc = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(null);
  useEffect(() => {
    let dead = false;
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const d = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
      if (dead) return;
      doc.current = d as never;
      setState({ pages: d.numPages, shown: Math.min(d.numPages, 6) });
    })().catch(() => setState({ pages: 0, shown: 0 }));
    return () => { dead = true; };
  }, [blob]);
  useEffect(() => {
    const d = doc.current, el = box.current;
    if (!d || !el || !state) return;
    void (async () => {
      const width = el.clientWidth || 360;
      for (let n = 1; n <= state.shown; n++) {
        if (el.querySelector(`canvas[data-p="${n}"]`)) continue;
        const page = (await d.getPage(n)) as { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: unknown) => { promise: Promise<void> } };
        const base = page.getViewport({ scale: 1 }), scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const vp = page.getViewport({ scale });
        const c = document.createElement("canvas"); c.dataset.p = String(n); c.width = vp.width; c.height = vp.height;
        c.style.width = "100%"; c.className = "mb-2 rounded-lg bg-white shadow";
        el.appendChild(c);
        await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      }
    })();
  }, [state]);
  if (state?.pages === 0) return <p className="p-6 text-center text-[13px] text-[var(--dim)]">This PDF couldn&apos;t be opened.</p>;
  return (
    <div>
      {state && <div className="mb-2 text-center text-[12px] text-[var(--dim)]">{state.pages} page{state.pages === 1 ? "" : "s"}</div>}
      <div ref={box} />
      {state && state.shown < state.pages && <button onClick={() => setState({ ...state, shown: Math.min(state.pages, state.shown + 10) })} className="mt-2 w-full rounded-xl bg-[var(--paper-dim)] py-3 text-[13.5px] font-semibold">Show more pages ({state.pages - state.shown} left)</button>}
    </div>
  );
}

/** Opens a course file inside Birdie instead of downloading it every time. */
export function FileViewer() {
  const { viewFile, closeFile } = useApp();
  const [blob, setBlob] = useState<Blob | null | undefined>(undefined);
  const [html, setHtml] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const ext = viewFile ? extOf(viewFile.name) : "";

  useEffect(() => {
    if (!viewFile) return;
    let dead = false; let made: string | null = null;
    void Promise.resolve().then(() => { setBlob(undefined); setHtml(null); setText(null); setBlobUrl(null); });
    void loadBlob(viewFile).then(async (b) => {
      if (dead) return;
      setBlob(b);
      if (!b) return;
      made = URL.createObjectURL(b); setBlobUrl(made);
      if (ext === "docx") {
        const mammoth = await import("mammoth");
        const r = await mammoth.convertToHtml({ arrayBuffer: await b.arrayBuffer() });
        if (!dead) setHtml(cleanHtml(r.value));
      } else if (["txt", "md", "csv"].includes(ext)) setText(await b.text());
    }).catch(() => { if (!dead) setBlob(null); });
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [viewFile, ext]);

  const download = () => { if (!blobUrl || !viewFile) return; const a = document.createElement("a"); a.href = blobUrl; a.download = viewFile.name; document.body.appendChild(a); a.click(); a.remove(); };
  const isImg = ["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext);

  return (
    <Screen open={!!viewFile} z={68}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 pb-2.5 pt-1">
          <button onClick={closeFile} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)]"><ArrowLeft size={17} /></button>
          <div className="min-w-0 flex-1"><div className="break-words text-[14px] font-bold leading-tight">{viewFile?.name}</div><div className="text-[11px] uppercase text-[var(--dim)]">{ext || "file"}</div></div>
          {blobUrl && <button onClick={download} aria-label="Save to phone" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--paper-dim)] text-[var(--dim)]"><Download size={16} /></button>}
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--paper-dim)] p-3">
          {blob === undefined ? <p className="py-10 text-center text-[13px] text-[var(--dim)]">Opening...</p>
            : blob === null ? <p className="py-10 text-center text-[13px] text-[var(--dim)]">Couldn&apos;t open this file. Check your connection and try again.</p>
            : ext === "pdf" ? <PdfPages blob={blob} />
            : isImg && blobUrl ? <img src={blobUrl} alt={viewFile?.name ?? ""} className="mx-auto max-w-full rounded-lg" />
            : ext === "docx" ? (html === null ? <p className="py-10 text-center text-[13px] text-[var(--dim)]">Opening...</p> : <div className="docx-view rounded-xl bg-white p-4 text-[14px] leading-relaxed text-[#1E1428] [&_h1]:mb-2 [&_h1]:text-[19px] [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-[17px] [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2 [&_table]:w-full [&_td]:border [&_td]:p-1" dangerouslySetInnerHTML={{ __html: html }} />)
            : text !== null ? <pre className="whitespace-pre-wrap rounded-xl bg-white p-4 text-[13px]">{text}</pre>
            : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <FileWarning size={30} className="text-[var(--dim)]" />
                <p className="max-w-[260px] text-[13.5px] text-[var(--dim)]">Birdie can&apos;t show .{ext} files inside the app yet. It&apos;s saved on this phone, so it opens without downloading again.</p>
                <button onClick={download} className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--paper)]">Open with another app</button>
              </div>
            )}
        </div>
      </div>
    </Screen>
  );
}
