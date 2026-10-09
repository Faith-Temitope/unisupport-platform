"use client";

import { CourseBoard } from "./CourseBoard";
import { whileVisible } from "./perf";
import { HoldButton } from "./Pocket";
import { PushNudge } from "./PushToggle";
import { removeOffline, saveOffline, useOfflineIndex } from "./offline";
import { useViewState } from "./persist";
import { SlotAd } from "./Sponsored";
import { CourseShares } from "./CourseShare";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bell, BookOpen, CheckCircle2, ChevronRight, Download, FileText, FolderInput, FolderPlus, Folder as FolderIcon, Image as ImageIcon, MoreHorizontal, Plus, Presentation, Printer, Search, Share2, Sparkles, StickyNote, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { countPdfPages, extractText } from "./extract";
import { extOf } from "./FileViewer";
import { safeName, signedUrl, uploadTo } from "./live/helpData";
import { folderPath, uid, useApp, type Course, type FileItem, type Folder, type Rec } from "./store";
import { Btn, Empty, IconBtn, Label, Sheet, TextField, TopBar } from "./ui";
import { DeadlinesCard, ExtraSheets, TodayCard, type ExtraSheet } from "./StudyExtras";
import { CategoryPicker, CategoryPill, CategoryTabs } from "./Categories";
import { ShareCourseForm } from "./ShareCourseForm";

type CTab = "board" | "materials" | "notes" | "recordings" | "progress";
const KIND_ICON = { pdf: FileText, img: ImageIcon, slides: Presentation, notes: StickyNote, link: FileText, text: FileText, doc: FileText } as const;
const kindOf = (f: File): FileItem["kind"] => (f.type.startsWith("image/") ? "img" : /\.(txt|md)$/i.test(f.name) ? "text" : /\.(ppt|pptx|key)$/i.test(f.name) ? "slides" : /\.(docx?|odt|rtf)$/i.test(f.name) ? "doc" : "pdf");
// A slow phone or network must never leave a file stuck on "Adding...": everything has a time limit.
const within = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> => Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
const EXT_TONE: Record<string, string> = { pdf: "bg-[#FDE8E4] text-[#C2412D]", docx: "bg-[#E6EEFD] text-[#1F5FD1]", doc: "bg-[#E6EEFD] text-[#1F5FD1]", pptx: "bg-[#FDEEE2] text-[#C25A12]", ppt: "bg-[#FDEEE2] text-[#C25A12]", xlsx: "bg-[#E2F5EC] text-[#0E7F55]" };
const fmtSize = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : n > 1000 ? `${Math.round(n / 1000)} KB` : n ? `${n} B` : "");
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Study() {
  const { courses, folders, addCourse, addFolder, renameFolder, deleteFolder, deleteCourse, moveCourse, recommendation, dismissRec, goBirdie, studyIntent, clearStudyIntent, settings, flash, notices } = useApp();
  const [extra, setExtra] = useState<ExtraSheet>(null);
  const [folderId, setFolderId] = useViewState<string | null>("study.folder", null);
  const [courseId, setCourseId] = useViewState<string | null>("study.course", null);
  const [initialTab, setInitialTab] = useViewState<CTab>("study.courseTab", "materials");
  const [sheet, setSheet] = useState<null | "menu" | "course" | "folder" | { t: "folder-actions"; id: string } | { t: "course-actions"; id: string } | { t: "move"; id: string } | { t: "rename"; id: string }>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!studyIntent) return;
    setCourseId(studyIntent.courseId); setInitialTab((studyIntent.tab as CTab) ?? "materials"); clearStudyIntent();
  }, [studyIntent]); // eslint-disable-line react-hooks/exhaustive-deps

  const course = courses.find((c) => c.id === courseId);
  const path = folderPath(folders, folderId);
  const subs = folders.filter((f) => f.parentId === folderId);
  const here = courses.filter((c) => c.folderId === folderId);
  const empty = courses.length === 0 && folders.length === 0;
  const tag = typeof sheet === "object" && sheet ? sheet : null;

  function reset() { setName(""); setCode(""); setSheet(null); }
  function create(kind: "course" | "folder") {
    if (!name.trim()) return;
    if (kind === "course") { const id = addCourse(code.trim() || name.trim().slice(0, 7).toUpperCase(), name.trim(), folderId); setCourseId(id); setInitialTab("materials"); }
    else addFolder(name.trim(), folderId);
    reset();
  }

  if (course) return <CourseView key={course.id + initialTab} course={course} startTab={initialTab} onBack={() => setCourseId(null)} />;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={<h2 className="disp text-[24px] font-bold text-[var(--text)]">Study</h2>}
        right={<><IconBtn label="Search" onClick={() => setExtra("search")}><Search size={16} /></IconBtn><span className="relative"><IconBtn label="Notifications" onClick={() => setExtra("notices")}><Bell size={16} /></IconBtn>{notices.some((n) => !n.read) && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--paper)] bg-[var(--help)]" />}</span><button onClick={() => setSheet("menu")} className="flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-[var(--paper)] active:scale-95"><Plus size={15} /> New</button></>}
      />
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-32">
        <AnimatePresence>
          {recommendation && settings.recs12h && folderId === null && (
            <motion.div key={recommendation.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="relative rounded-2xl bg-gradient-to-br from-[var(--ink)] to-[#2b1546] p-4 text-[var(--paper)]">
              <button onClick={dismissRec} aria-label="Dismiss" className="absolute right-3 top-3 text-white/40 active:scale-90"><X size={16} /></button>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#E6B3F2]"><Sparkles size={13} /> Birdie recommends</div>
              <div className="disp mt-1.5 pr-5 text-[16px] font-bold">{recommendation.title}</div>
              <p className="mt-1 text-[13px] leading-snug text-white/70">{recommendation.body}</p>
              <button onClick={() => { const a = recommendation.action; dismissRec(); if (a.go === "test") goBirdie({ courseId: a.courseId, mode: "test" }); else { setCourseId(a.courseId); setInitialTab("notes"); } }} className="mt-3 rounded-xl bg-[var(--birdie)] px-4 py-2 text-[13px] font-semibold text-white active:scale-95">{recommendation.action.label}</button>
            </motion.div>
          )}
        </AnimatePresence>

        {folderId === null && <PushNudge />}
        {folderId === null && <TodayCard open={setExtra} />}
        {folderId === null && <DeadlinesCard open={setExtra} />}

        {empty ? (
          <Empty icon={<BookOpen size={22} />} title="Start your first course" text="Create a course, then add slides, notes and recordings. Birdie learns from what you add, and only from that."
            action={<div className="space-y-2"><Btn variant="study" onClick={() => setSheet("course")}>Create a course</Btn><Btn variant="ghost" onClick={() => setSheet("folder")}>Or make a folder first</Btn></div>} />
        ) : (
          <>
            {path.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[12.5px] font-semibold text-[var(--dim)]">
                <button onClick={() => setFolderId(null)} className="rounded-md px-1.5 py-0.5 active:bg-[var(--paper-dim)]">All</button>
                {path.map((f) => (<span key={f.id} className="flex items-center gap-1"><ChevronRight size={12} /><button onClick={() => setFolderId(f.id)} className="rounded-md px-1.5 py-0.5 text-[var(--text)] active:bg-[var(--paper-dim)]">{f.name}</button></span>))}
              </div>
            )}
            {subs.length > 0 && (
              <div><Label>{folderId ? "Subfolders" : "Folders"}</Label>
                <div className="space-y-2">
                  {subs.map((f) => {
                    const n = courses.filter((c) => c.folderId === f.id).length + folders.filter((x) => x.parentId === f.id).length;
                    return (
                      <div key={f.id} className="flex items-center rounded-2xl border border-[var(--line)] bg-white">
                        <button onClick={() => setFolderId(f.id)} className="flex flex-1 items-center gap-3 p-3.5 text-left active:opacity-70"><FolderIcon size={20} className="text-[var(--birdie)]" /><div className="flex-1"><div className="text-[14px] font-semibold text-[var(--text)]">{f.name}</div><div className="text-[12px] text-[var(--dim)]">{n} item{n === 1 ? "" : "s"}</div></div></button>
                        <button onClick={() => setSheet({ t: "folder-actions", id: f.id })} aria-label="Folder options" className="px-3 py-4 text-[var(--dim)] active:opacity-60"><MoreHorizontal size={18} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div><Label>{folderId ? "Courses in this folder" : "Courses"}</Label>
              {here.length === 0 ? (
                <Empty title={folderId ? "This folder is empty" : "No loose courses"} text={folderId ? "Add a course or a subfolder here. Folders can nest as deep as you need." : "Every course lives in a folder right now."}
                  action={folderId ? <div className="grid grid-cols-2 gap-2"><Btn variant="study" onClick={() => setSheet("course")}>+ Course</Btn><Btn variant="ghost" onClick={() => setSheet("folder")}>+ Subfolder</Btn></div> : undefined} />
              ) : (
                <div className="space-y-2.5">
                  {here.map((c) => (
                    <div key={c.id} className="flex items-center rounded-2xl border border-[var(--line)] bg-white">
                      <button onClick={() => { setCourseId(c.id); setInitialTab("materials"); }} className="flex min-w-0 flex-1 items-center gap-3.5 p-3.5 text-left active:opacity-70">
                        <div className="disp flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white" style={{ background: c.color }}>{c.code.replace(/\s/g, "").slice(0, 4)}</div>
                        <div className="min-w-0 flex-1"><div className="truncate text-[14.5px] font-semibold text-[var(--text)]">{c.name}</div><div className="text-[12px] text-[var(--dim)]">{c.files.length} files · {c.notes.length} notes · {c.recs.length} recordings</div></div>
                      </button>
                      <button onClick={() => setSheet({ t: "course-actions", id: c.id })} aria-label="Course options" className="px-3 py-4 text-[var(--dim)] active:opacity-60"><MoreHorizontal size={18} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {folderId === null && <SlotAd surface="study" />}
      </div>

      <ExtraSheets sheet={extra} setSheet={setExtra} />
      <Sheet open={sheet === "menu"} onClose={() => setSheet(null)} title={folderId ? `Add inside ${path[path.length - 1]?.name}` : "Add to Study"}>
        <div className="space-y-2.5">
          <button onClick={() => setSheet("course")} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-left active:scale-[0.98]"><Sparkles className="text-[var(--study)]" size={20} /><div><div className="text-[14px] font-semibold">New course</div><div className="text-[12px] text-[var(--dim)]">A library Birdie learns from</div></div></button>
          <button onClick={() => setSheet("folder")} className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-left active:scale-[0.98]"><FolderPlus className="text-[var(--birdie)]" size={20} /><div><div className="text-[14px] font-semibold">{folderId ? "New subfolder" : "New folder"}</div><div className="text-[12px] text-[var(--dim)]">Group by school, level, semester, batch. Nest as deep as you like</div></div></button>
        </div>
      </Sheet>

      <Sheet open={sheet === "course" || sheet === "folder"} onClose={reset} title={sheet === "course" ? "New course" : folderId ? "New subfolder" : "New folder"}>
        <div className="space-y-3">
          {sheet === "course" && <TextField value={code} onChange={setCode} placeholder="Course code (optional), e.g. PHY 101" />}
          <TextField value={name} onChange={setName} placeholder={sheet === "course" ? "Course name, e.g. Mechanics" : "Name, e.g. 300 Level or First Semester"} />
          <Btn variant="study" disabled={!name.trim()} onClick={() => create(sheet as "course" | "folder")}>Create{folderId ? " here" : ""}</Btn>
        </div>
      </Sheet>

      <Sheet open={tag?.t === "folder-actions"} onClose={() => setSheet(null)} title={folders.find((f) => f.id === (tag as { id: string } | null)?.id)?.name}>
        {tag?.t === "folder-actions" && (<div className="space-y-2">
          <Btn variant="ghost" onClick={() => { setName(folders.find((f) => f.id === tag.id)?.name ?? ""); setSheet({ t: "rename", id: tag.id }); }}>Rename</Btn>
          <Btn variant="ghost" onClick={() => { const id = tag.id; setSheet(null); setFolderId(id); setTimeout(() => setSheet("folder"), 250); }}>Add a subfolder inside</Btn>
          <button onClick={() => { deleteFolder(tag.id); setSheet(null); flash("Folder deleted. Its contents moved up"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-[var(--help)] active:scale-[0.97]"><Trash2 size={16} /> Delete folder</button>
        </div>)}
      </Sheet>
      <Sheet open={tag?.t === "rename"} onClose={() => setSheet(null)} title="Rename folder">
        {tag?.t === "rename" && (<div className="space-y-3"><TextField value={name} onChange={setName} /><Btn variant="study" disabled={!name.trim()} onClick={() => { renameFolder(tag.id, name.trim()); reset(); }}>Save</Btn></div>)}
      </Sheet>

      <Sheet open={tag?.t === "course-actions"} onClose={() => setSheet(null)} title={courses.find((c) => c.id === (tag as { id: string } | null)?.id)?.name}>
        {tag?.t === "course-actions" && (<div className="space-y-2">
          <Btn variant="ghost" onClick={() => setSheet({ t: "move", id: tag.id })}><span className="inline-flex items-center gap-2"><FolderInput size={16} /> Move to a folder</span></Btn>
          <button onClick={() => { deleteCourse(tag.id); setSheet(null); flash("Course deleted"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-[var(--help)] active:scale-[0.97]"><Trash2 size={16} /> Delete course</button>
        </div>)}
      </Sheet>
      <Sheet open={tag?.t === "move"} onClose={() => setSheet(null)} title="Move to...">
        {tag?.t === "move" && <MoveList folders={folders} current={courses.find((c) => c.id === tag.id)?.folderId ?? null} onPick={(fid) => { moveCourse(tag.id, fid); setSheet(null); flash("Moved"); }} />}
      </Sheet>
    </div>
  );
}

function MoveList({ folders, current, onPick }: { folders: Folder[]; current: string | null; onPick: (id: string | null) => void }) {
  const rows: { f: Folder; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => folders.filter((f) => f.parentId === parent).forEach((f) => { rows.push({ f, depth }); walk(f.id, depth + 1); });
  walk(null, 0);
  return (
    <div className="space-y-1.5">
      <button onClick={() => onPick(null)} className={`flex w-full items-center gap-2 rounded-xl border-2 p-3 text-left text-[14px] font-semibold ${current === null ? "border-[var(--study)] bg-[var(--study-soft)]" : "border-[var(--line)] bg-white"}`}>No folder (top level)</button>
      {rows.map(({ f, depth }) => (<button key={f.id} onClick={() => onPick(f.id)} style={{ marginLeft: depth * 16, width: `calc(100% - ${depth * 16}px)` }} className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-[14px] font-semibold ${current === f.id ? "border-[var(--study)] bg-[var(--study-soft)]" : "border-[var(--line)] bg-white"}`}><FolderIcon size={16} className="text-[var(--birdie)]" /> {f.name}</button>))}
      {rows.length === 0 && <p className="text-[13px] text-[var(--dim)]">You haven't made any folders yet.</p>}
    </div>
  );
}

function RecordingRow({ r, onDelete, readOnly }: { r: Rec; onDelete: () => void; readOnly?: boolean }) {
  const [src, setSrc] = useState<string | undefined>(r.url);
  useEffect(() => {
    if (r.url) { setSrc(r.url); return; } // still in this session, blob plays fine
    if (!r.storagePath) { setSrc(undefined); return; }
    let cancelled = false;
    void signedUrl("study-recordings", r.storagePath).then((u) => { if (!cancelled) setSrc(u ?? undefined); });
    return () => { cancelled = true; };
  }, [r.url, r.storagePath]);
  const status = r.transcribing ? "transcribing..." : r.text ? "Birdie can read this" : "no transcript yet";
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div><div className="text-[13.5px] font-semibold text-[var(--text)]">{r.name}</div><div className="text-[11.5px] text-[var(--dim)]">{r.date} · {mmss(r.dur)} · {status}</div></div>
        {!readOnly && <button onClick={onDelete} aria-label="Delete recording" className="text-[var(--dim)] active:scale-90"><Trash2 size={15} /></button>}
      </div>
      {src ? <audio src={src} controls className="mt-2 h-9 w-full" /> : !r.url && !r.storagePath && <div className="mt-2 text-[11.5px] text-[var(--dim)]">Audio isn&apos;t available anymore.</div>}
    </div>
  );
}

function CourseView({ course, startTab, onBack }: { course: Course; startTab: CTab; onBack: () => void }) {
  const { addNote, deleteNote, addFile, updateFile, openFile: openViewer, deleteFile, deleteRec, goBirdie, setRecorderOpen, flash, loadRemoteCourseContent, sharedRemoteContent, openPrint, shared } = useApp();
  const [tab, setTab_] = useViewState<CTab>(`study.tab.${course.id}`, startTab);
  const [sheet, setSheet] = useState<null | "note" | "share">(null);
  const [nTitle, setNTitle] = useState(""); const [nBody, setNBody] = useState(""); const [nCat, setNCat] = useState("Notes");
  const [noteFilter, setNoteFilter] = useState("All"); const [fileFilter, setFileFilter] = useState("All");
  // The selected tab is also where new items go ("All" files under the default).
  const fileCat = fileFilter === "All" || fileFilter === "Materials" ? undefined : fileFilter;
  const openNewNote = () => { setNCat(noteFilter === "All" ? "Notes" : noteFilter); setSheet("note"); };
  const input = useRef<HTMLInputElement>(null);
  const overall = course.topics.length ? Math.round(course.topics.reduce((a, t) => a + t.mastery, 0) / course.topics.length) : null;
  const isShared = !!course.sharedId;
  // Shared courses (yours, or one you joined) have a notice board for the whole class.
  const boardId = course.sharedId ?? (course.sourceCourseId ? shared.find((s) => s.sourceCourseId === course.sourceCourseId)?.id : undefined);
  const tabs: [CTab, string][] = [...(boardId ? [["board", "Board"] as [CTab, string]] : []), ["materials", "Materials"], ["notes", "Notes"], ["recordings", "Recordings"], ["progress", "Progress"]];

  // A joined (not owned) shared course: show the owner's real, live content read-only instead of
  // this course's own (empty) local arrays -- a snapshot taken at join time would go stale the
  // moment the owner adds something new, so this fetches fresh each time and polls while open.
  const readOnly = !!course.sourceCourseId;
  useEffect(() => {
    if (!readOnly || !course.sourceCourseId) return;
    loadRemoteCourseContent(course.sourceCourseId);
    const i = setInterval(whileVisible(() => loadRemoteCourseContent(course.sourceCourseId!)), 8000);
    return () => clearInterval(i);
  }, [readOnly, course.sourceCourseId, loadRemoteCourseContent]);
  const allFiles = readOnly ? sharedRemoteContent?.files ?? [] : course.files;
  const allNotes = readOnly ? sharedRemoteContent?.notes ?? [] : course.notes;
  const shownFiles = fileFilter === "All" ? allFiles : allFiles.filter((f) => (f.category || "Materials") === fileFilter);
  const shownNotes = noteFilter === "All" ? allNotes : allNotes.filter((n) => (n.category || "Notes") === noteFilter);
  const shownRecs = readOnly ? sharedRemoteContent?.recs ?? [] : course.recs;

  // Files show up straight away. Reading their text, counting pages and uploading happen in the
  // background, each with a time limit, so a slow phone or network can't leave them stuck.
  async function pick(files: FileList | null) {
    if (!files || !files.length) return;
    const list = Array.from(files);
    if (input.current) input.current.value = "";
    // The sign-in saved on this phone (no network round trip), so files appear instantly even on slow data.
    const { data: { session } } = await createClient().auth.getSession();
    const user = session?.user ?? null;
    flash(`Adding ${list.length} file${list.length === 1 ? "" : "s"}...`);
    await Promise.all(list.map(async (f) => {
      const id = addFile(course.id, { name: f.name, kind: kindOf(f), size: f.size, url: URL.createObjectURL(f), category: fileCat, status: user ? "uploading" : undefined });
      const [text, pages] = await Promise.all([
        within(extractText(f), 25000),
        /\.pdf$/i.test(f.name) ? within(countPdfPages(f), 15000) : Promise.resolve(undefined),
      ]);
      let storagePath: string | undefined;
      if (user && f.size > 40 * 1024 * 1024) flash(`${f.name} is over 40 MB, so it stays on this phone only`);
      else if (user) {
        // Durable copy so the file still opens after this page session ends.
        const path = `${user.id}/${course.id}/${uid()}-${safeName(f.name)}`;
        const err = await within(uploadTo("study-files", path, f), 180000);
        if (err === null) storagePath = path; else console.error("study file upload failed", err ?? "timed out");
      }
      updateFile(course.id, id, { text, pages, storagePath, status: user && !storagePath ? "failed" : undefined });
    }));
    flash(`${list.length} file${list.length === 1 ? "" : "s"} added`);
  }
  async function retryUpload(f: FileItem) {
    if (!f.url) return flash("Add the file again from your phone");
    const { data: { session } } = await createClient().auth.getSession();
    const user = session?.user;
    if (!user) return;
    updateFile(course.id, f.id, { status: "uploading" });
    const blob = await fetch(f.url).then((r) => r.blob()).catch(() => null);
    if (!blob) { updateFile(course.id, f.id, { status: "failed" }); return flash("Add the file again from your phone"); }
    const path = `${user.id}/${course.id}/${uid()}-${safeName(f.name)}`;
    const err = await within(uploadTo("study-files", path, new File([blob], f.name, { type: blob.type })), 180000);
    updateFile(course.id, f.id, err === null ? { storagePath: path, status: undefined } : { status: "failed" });
    if (err !== null) flash("Still couldn't upload. Check your connection.");
  }

  const saved = useOfflineIndex();
  async function toggleOffline(f: FileItem) {
    const key = `file:${f.storagePath}`;
    if (saved[key]) { await removeOffline(key); flash("Removed from this phone"); return; }
    const url = await signedUrl("study-files", f.storagePath!);
    if (!url) return flash("Couldn't reach the file. Check your connection.");
    flash("Saving to this phone...");
    const err = await saveOffline(key, url, f.name, "file");
    flash(err ?? "Saved. It opens without internet now.");
  }
  // Opens inside Birdie (PDF, Word, pictures) and keeps a copy on the phone: no re-download each time.
  function openFile(f: FileItem) {
    if (f.storagePath) return openViewer({ name: f.name, path: f.storagePath });
    if (f.url) return openViewer({ name: f.name, url: f.url });
    flash("This file isn't available anymore. Try re-adding it.");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-3 pt-2">
        <div className="flex items-center gap-3">
          <IconBtn label="Back" onClick={onBack}><ArrowLeft size={17} /></IconBtn>
          <div className="disp flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-bold text-white" style={{ background: course.color }}>{course.code.replace(/\s/g, "").slice(0, 4)}</div>
          <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-bold leading-tight text-[var(--text)]">{course.name}</div><div className="truncate text-[12px] text-[var(--dim)]">{course.code}</div></div>
          <button onClick={() => goBirdie({ courseId: course.id })} className="flex items-center gap-1.5 rounded-xl bg-[var(--birdie)] px-3 py-2 text-[12.5px] font-bold text-white active:scale-95"><span className="disp">B</span> Ask</button>
        </div>
        <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto">
          {tabs.map(([id, label]) => (<button key={id} onClick={() => setTab_(id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition active:scale-95 ${tab === id ? "bg-[var(--study)] text-white" : "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{label}</button>))}
          {!readOnly && <button onClick={() => setSheet("share")} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--dim)] active:scale-95"><Share2 size={13} /> {isShared ? "Sharing" : "Share"}</button>}
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-32">
        <div className="space-y-2.5">
          {tab === "materials" && (<>
            {!readOnly && <input ref={input} type="file" multiple hidden onChange={(e) => pick(e.target.files)} />}
            <CategoryTabs items={allFiles} base="Materials" value={fileFilter} onChange={setFileFilter} allowCustom={!readOnly} />
            {shownFiles.length === 0 ? <Empty icon={<Upload size={20} />} title={fileFilter === "All" ? "No materials yet" : `No ${fileFilter.toLowerCase()} yet`} text={readOnly ? "This classmate hasn't added anything here yet." : fileFilter === "All" ? "Add slides, PDFs, photos of the whiteboard, or .txt / .md notes. Pick a tab above first to file them as past questions, assignments or tests." : `Anything you add here is filed under ${fileFilter}.`} action={readOnly ? undefined : <Btn variant="study" onClick={() => input.current?.click()}>{fileFilter === "All" ? "Choose files" : `Add ${fileFilter.toLowerCase()}`}</Btn>} /> : (<>
              {shownFiles.map((f) => { const Icon = KIND_ICON[f.kind] ?? KIND_ICON.pdf; const ext = extOf(f.name); return (
                <div key={f.id} className="rounded-2xl border border-[var(--line)] bg-white p-3">
                  <button onClick={() => openFile(f)} disabled={!f.url && !f.storagePath} className="flex w-full items-start gap-3 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--study-soft)] text-[var(--study)]"><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-[13.5px] font-semibold leading-snug text-[var(--text)]">{f.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--dim)]">
                      {ext && <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase ${EXT_TONE[ext] ?? "bg-[var(--paper-dim)] text-[var(--dim)]"}`}>{ext}</span>}
                      {f.pages ? <span>{f.pages} page{f.pages === 1 ? "" : "s"}</span> : null}
                      {f.size ? <span>{fmtSize(f.size)}</span> : null}
                      <span>{f.added}</span><CategoryPill category={f.category} />
                    </div>
                    {f.status === "uploading" && <div className="mt-1 text-[11.5px] font-semibold text-[var(--study)]">Uploading...</div>}
                    {f.status === "failed" && <div className="mt-1 text-[11.5px] font-semibold text-[var(--help)]">Not uploaded yet. It only opens on this phone.</div>}
                  </div>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-4 border-t border-[var(--line)] pt-2">
                  {f.status === "failed" && !readOnly && <button onClick={() => void retryUpload(f)} className="mr-auto text-[12px] font-bold text-[var(--help)]">Retry upload</button>}
                  {(f.url || f.storagePath) && <button onClick={() => openFile(f)} className="mr-auto rounded-lg bg-[var(--paper-dim)] px-3 py-1.5 text-[12px] font-bold text-[var(--text)]">Open</button>}
                  <HoldButton item={{ kind: "file", title: f.name, courseId: course.id, fileId: f.id }} className="text-[var(--dim)] active:scale-90" />
                  {f.storagePath && <button onClick={() => void toggleOffline(f)} aria-label={saved[`file:${f.storagePath}`] ? "Remove offline copy" : "Save offline"} className={`active:scale-90 ${saved[`file:${f.storagePath}`] ? "text-[var(--study)]" : "text-[var(--dim)]"}`}>{saved[`file:${f.storagePath}`] ? <CheckCircle2 size={15} /> : <Download size={15} />}</button>}
                  {!readOnly && f.storagePath && <button onClick={() => openPrint({ kind: "print", file: { name: f.name, path: f.storagePath! } })} aria-label="Print this" className="text-[var(--dim)] active:scale-90"><Printer size={15} /></button>}
                  {!readOnly && <button onClick={() => deleteFile(course.id, f.id)} aria-label="Delete file" className="text-[var(--dim)] active:scale-90"><Trash2 size={15} /></button>}
                  </div>
                </div>); })}
              {!readOnly && <Btn variant="ghost" onClick={() => input.current?.click()}>{fileFilter === "All" ? "+ Add more files" : `+ Add to ${fileFilter}`}</Btn>}
            </>)}
          </>)}

          {tab === "notes" && <CategoryTabs items={allNotes} base="Notes" value={noteFilter} onChange={setNoteFilter} allowCustom={!readOnly} />}
          {tab === "notes" && (shownNotes.length === 0 ? <Empty icon={<StickyNote size={20} />} title={noteFilter === "All" ? "No notes yet" : `No ${noteFilter.toLowerCase()} yet`} text={readOnly ? "This classmate hasn't added anything here yet." : "Write what you want to remember. Birdie builds quizzes and answers from your notes."} action={readOnly ? undefined : <Btn variant="study" onClick={openNewNote}>{noteFilter === "All" ? "Write a note" : `Add to ${noteFilter}`}</Btn>} /> : (<>
            {shownNotes.map((n) => (<div key={n.id} className="rounded-2xl border border-[var(--line)] bg-white p-3.5"><div className="flex items-start justify-between gap-2"><div className="text-[14px] font-semibold text-[var(--text)]">{n.title} <CategoryPill category={n.category} /></div>{!readOnly && <button onClick={() => deleteNote(course.id, n.id)} aria-label="Delete note" className="text-[var(--dim)] active:scale-90"><Trash2 size={14} /></button>}</div><div className="mt-1 whitespace-pre-line text-[13px] leading-snug text-[var(--dim)]">{n.body}</div><div className="mt-1.5 text-[11px] text-[#a99fb8]">{n.date}</div></div>))}
            {!readOnly && <Btn variant="ghost" onClick={openNewNote}>{noteFilter === "All" ? "+ New note" : `+ Add to ${noteFilter}`}</Btn>}</>))}

          {tab === "recordings" && (shownRecs.length === 0 ? <Empty icon={<BookOpen size={20} />} title="No recordings yet" text={readOnly ? "This classmate hasn't recorded anything yet." : "Tap the mascot, choose Record, and capture a lecture. You choose the course after you stop."} action={readOnly ? undefined : <Btn variant="study" onClick={() => setRecorderOpen(true)}>Record a lecture</Btn>} /> : (<>
            {shownRecs.map((r) => (<RecordingRow key={r.id} r={r} onDelete={() => deleteRec(course.id, r.id)} readOnly={readOnly} />))}
            {!readOnly && <Btn variant="ghost" onClick={() => setRecorderOpen(true)}>+ Record another</Btn>}</>))}

          {tab === "board" && boardId && <CourseBoard sharedId={boardId} isOwner={!readOnly} courseId={course.id} />}
          {tab === "progress" && (overall === null ? <Empty icon={<Sparkles size={20} />} title="No progress yet" text="Take a quiz in Birdie and your topics and mastery show up here." action={<Btn variant="study" onClick={() => goBirdie({ courseId: course.id, mode: "test" })}>Take a quiz</Btn>} /> : (<>
            <div className="rounded-2xl bg-[var(--study-soft)] p-4"><div className="disp text-[30px] font-bold text-[var(--study)]">{overall}%</div><div className="text-[12.5px] text-[#4a3596]">Overall mastery in {course.code}</div></div>
            {course.topics.map((t) => (<div key={t.name} className="pt-1"><div className="mb-1.5 flex justify-between gap-3 text-[13px] font-semibold"><span className="truncate">{t.name}</span><span className="text-[var(--dim)]">{t.mastery}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--paper-dim)]"><motion.div className="h-full rounded-full" style={{ background: t.mastery < 55 ? "var(--help)" : "var(--study)" }} initial={{ width: 0 }} animate={{ width: `${t.mastery}%` }} /></div></div>))}
            <div className="pt-2"><Btn variant="ink" onClick={() => goBirdie({ courseId: course.id, mode: "test" })}>Take another quiz</Btn></div></>))}
        </div>
      </div>

      <Sheet open={sheet === "note"} onClose={() => setSheet(null)} title="New note">
        <div className="space-y-3"><CategoryPicker value={nCat} onChange={setNCat} base="Notes" /><TextField value={nTitle} onChange={setNTitle} placeholder={nCat === "Past Questions" ? "e.g. 2023 exam, Q1-Q5" : "Title, e.g. Eigenvalues"} /><TextField multiline value={nBody} onChange={setNBody} placeholder="Write it in full sentences. Birdie quizzes you on these." />
          <Btn variant="study" disabled={!nTitle.trim() || !nBody.trim()} onClick={() => { addNote(course.id, nTitle.trim(), nBody.trim(), nCat === "Notes" ? undefined : nCat); setNTitle(""); setNBody(""); setSheet(null); flash("Note saved"); }}>Save</Btn></div>
      </Sheet>
      <Sheet open={sheet === "share"} onClose={() => setSheet(null)} title={isShared ? "Manage sharing" : "Share this course"}>
        {!isShared && <p className="mb-3 text-[13px] leading-snug text-[var(--dim)]">Classmates find it in Explore, add it to their Study, and chat inside it. You pick exactly what they get, and you can charge for it.</p>}
        {sheet === "share" && <ShareCourseForm course={course} mode={isShared ? "manage" : "new"} onDone={() => setSheet(null)} />}
        {sheet === "share" && <CourseShares courseId={course.id} />}
      </Sheet>
    </div>
  );
}
