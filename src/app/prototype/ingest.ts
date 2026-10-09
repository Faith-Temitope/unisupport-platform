// Getting a file into a course so Birdie can use it, from Study or from the Birdie chat.
// The file shows up straight away; reading its text, counting pages, uploading and (for scans and
// photos with no text layer) reading it with AI all happen in the background, each with a time limit.
import { createClient } from "@/lib/supabase";
import { readScan } from "./aiClient";
import { countPdfPages, extractText } from "./extract";
import { safeName, uploadTo } from "./live/helpData";
import { uid, type FileItem } from "./store";

type Add = (courseId: string, f: Omit<FileItem, "id" | "added">) => string;
type Update = (courseId: string, fileId: string, patch: Partial<FileItem>) => void;

export const kindOf = (f: File): FileItem["kind"] => (f.type.startsWith("image/") ? "img" : /\.(txt|md)$/i.test(f.name) ? "text" : /\.(ppt|pptx|key)$/i.test(f.name) ? "slides" : /\.(docx?|odt|rtf)$/i.test(f.name) ? "doc" : "pdf");
// A slow phone or network must never leave a file stuck on "Adding...": everything has a time limit.
export const within = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> => Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
/** Scans and photos Birdie can read with AI when there's no text in the file itself. */
export const scannable = (name: string) => /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(name);

/** Reads a scanned/photographed file that's already uploaded. Returns true if Birdie can now read it. */
export async function readWithAI(courseId: string, f: Pick<FileItem, "id" | "storagePath">, updateFile: Update): Promise<boolean> {
  if (!f.storagePath) return false;
  updateFile(courseId, f.id, { status: "reading" });
  const r = await within(readScan(f.storagePath), 280000);
  const text = r && r.ok && r.text.trim() ? r.text : undefined;
  updateFile(courseId, f.id, { status: text ? undefined : "unread", ...(text ? { text } : {}) });
  return !!text;
}

export async function ingestFiles(files: File[], courseId: string, o: { addFile: Add; updateFile: Update; flash: (m: string) => void; category?: string }): Promise<{ name: string; readable: boolean }[]> {
  // The sign-in saved on this phone (no network round trip), so files appear instantly even on slow data.
  const { data: { session } } = await createClient().auth.getSession();
  const user = session?.user ?? null;
  o.flash(`Adding ${files.length} file${files.length === 1 ? "" : "s"}...`);
  const out = await Promise.all(files.map(async (f) => {
    const id = o.addFile(courseId, { name: f.name, kind: kindOf(f), size: f.size, url: URL.createObjectURL(f), category: o.category, status: user ? "uploading" : undefined });
    const [text, pages] = await Promise.all([
      within(extractText(f), 25000),
      /\.pdf$/i.test(f.name) ? within(countPdfPages(f), 15000) : Promise.resolve(undefined),
    ]);
    let storagePath: string | undefined;
    if (user && f.size > 40 * 1024 * 1024) o.flash(`${f.name} is over 40 MB, so it stays on this phone only`);
    else if (user) {
      // Durable copy so the file still opens after this page session ends.
      const path = `${user.id}/${courseId}/${uid()}-${safeName(f.name)}`;
      const err = await within(uploadTo("study-files", path, f), 180000);
      if (err === null) storagePath = path; else console.error("study file upload failed", err ?? "timed out");
    }
    o.updateFile(courseId, id, { text, pages, storagePath, status: user && !storagePath ? "failed" : undefined });
    // A CamScanner PDF or a photo of notes has no text layer: let the AI read the page images.
    const read = !text && storagePath && scannable(f.name) ? await readWithAI(courseId, { id, storagePath }, o.updateFile) : false;
    return { name: f.name, readable: !!text || read };
  }));
  o.flash(`${files.length} file${files.length === 1 ? "" : "s"} added`);
  return out;
}
