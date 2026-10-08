// Turns an uploaded file into plain text so Birdie can actually read it. Runs entirely client-side
// (no upload, no cost) -- .txt/.md are read directly, .pdf and .docx are parsed in the browser.
// Anything else (images, .ppt/.pptx, unrecognized types) returns undefined: there was no text
// extraction for these before, and this keeps that honest instead of silently returning nothing
// useful. Called from Study.tsx's upload handler before the file is saved.

export async function extractText(f: File): Promise<string | undefined> {
  const name = f.name.toLowerCase();
  try {
    if (/\.(txt|md)$/i.test(name)) return await f.text();
    if (/\.pdf$/i.test(name)) return await extractPdf(f);
    if (/\.docx$/i.test(name)) return await extractDocx(f);
    return undefined;
  } catch (e) {
    console.error("extractText failed for", f.name, e);
    return undefined;
  }
}

async function extractPdf(f: File): Promise<string | undefined> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const buf = await f.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const cap = Math.min(doc.numPages, 200); // generous cap so one huge PDF can't hang the upload
  for (let i = 1; i <= cap; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    if (text.trim()) pages.push(text);
  }
  const out = pages.join("\n\n").trim();
  return out.length ? out : undefined; // a scanned/image-only PDF has no extractable text
}

/** Page count for a PDF (used to price print orders); undefined for anything else or on failure. */
export async function countPdfPages(f: File): Promise<number | undefined> {
  if (!/\.pdf$/i.test(f.name)) return undefined;
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
    return doc.numPages;
  } catch { return undefined; }
}

async function extractDocx(f: File): Promise<string | undefined> {
  const mammoth = await import("mammoth");
  const buf = await f.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  const out = (result.value ?? "").trim();
  return out.length ? out : undefined;
}
