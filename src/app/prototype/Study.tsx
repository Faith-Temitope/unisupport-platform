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
import { ArrowLeft, BookOpen, CheckCircle2, ChevronLeft, Download, FileText, FolderInput, FolderPlus, Folder as FolderIcon, Image as ImageIcon, MoreHorizontal, Plus, Presentation, Printer, Search, Share2, Sparkles, StickyNote, Timer, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ingestFiles, readWithAI, scannable, within } from "./ingest";
import { extOf } from "./FileViewer";
import { safeName, signedUrl, uploadTo } from "./live/helpData";
import { folderPath, uid, useApp, type Course, type FileItem, type Folder, type Rec } from "./store";
import { Btn, Empty, IconBtn, Page, Sheet, TextField } from "./ui";
import { ExtraSheets, type ExtraSheet } from "./StudyExtras";
import { BellButton } from "./Notifications";
import { TimetablePage, TodaySchedule } from "./Schedule";
import { CategoryPicker, CategoryPill, CategoryTabs } from "./Categories";
import { ShareCourseForm } from "./ShareCourseForm";

type CTab = "board" | "materials" | "notes" | "recordings" | "progress";
const KIND_ICON = { pdf: FileText, img: ImageIcon, slides: Presentation, notes: StickyNote, link: FileText, text: FileText, doc: FileText } as const;
const EXT_TONE: Record<string, string> = { pdf: "bg-[#FDE8E4] text-[#C2412D]", docx: "bg-[#E6EEFD] text-[#1F5FD1]", doc: "bg-[#E6EEFD] text-[#1F5FD1]", pptx: "bg-[#FDEEE2] text-[#C25A12]", ppt: "bg-[#FDEEE2] text-[#C25A12]", xlsx: "bg-[#E2F5EC] text-[#0E7F55]" };
const fmtSize = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : n > 1000 ? `${Math.round(n / 1000)} KB` : n ? `${n} B` : "");
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Study() {
  const { courses, folders, addCourse, addFolder, renameFolder, deleteFolder, deleteCourse, moveCourse, studyIntent, clearStudyIntent, flash, focusEndsAt, startFocus, stopFocus } = useApp();
  const [menu, setMenu] = useState(false);
  const [extra, setExtra] = useState<ExtraSheet>(null);
  // Courses > Timetable (also opened by a reminder notification: ?tab=study&schedule=1).
  const [timetable, setTimetable] = useState(false);
  useEffect(() => { const on = () => setTimetable(true); window.addEventListener("birdie-open-schedule", on); return () => window.removeEventListener("birdie-open-schedule", on); }, []);
  const [folderId, setFolderId] = useViewState<string | null>("study.folder", null);
  const [courseId, setCourseId] = useViewState<string | null>("study.course", null);
  const [initialTab, setInitialTab] = useViewState<CTab>("study.courseTab", "materials");
  const [sheet, setSheet] = useState<null | "focus" | "course" | "folder" | { t: "folder-actions"; id: string } | { t: "course-actions"; id: string } | { t: "move"; id: string } | { t: "rename"; id: string }>(null);
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

  const menuItems = [
    { label: "New Course", Icon: BookOpen, run: () => setSheet("course") },
    { label: folderId ? "New Subfolder" : "New Folder", Icon: FolderPlus, run: () => setSheet("folder") },
    focusEndsAt ? { label: "Stop Focus", Icon: Timer, run: () => stopFocus() } : { label: "Focus Timer", Icon: Timer, run: () => setSheet("focus") },
  ];
  return (
    <div className="flex h-full flex-col bg-[var(--we-bg)]">
      <div className="relative z-30 flex h-12 shrink-0 items-center justify-center bg-[var(--we-bg)]">
        {folderId && <button onClick={() => setFolderId(path[path.length - 2]?.id ?? null)} aria-label="Back" className="absolute left-2 flex h-10 w-10 items-center justify-center text-[var(--we-text)]"><ChevronLeft size={26} /></button>}
        <span className="max-w-[55%] truncate text-[16.5px] font-semibold text-[var(--we-text)]">{folderId ? path[path.length - 1]?.name : "Courses"}</span>
        <div className="absolute right-2 flex items-center text-[var(--we-text)]">
          <button onClick={() => setExtra("search")} aria-label="Search" className="flex h-10 w-10 items-center justify-center"><Search size={21} /></button>
          {!folderId && <BellButton />}
          <button onClick={() => setMenu((x) => !x)} aria-label="Add" className="flex h-10 w-10 items-center justify-center">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.6px] border-current"><Plus size={15} strokeWidth={2.2} /></span>
          </button>
        </div>
        <AnimatePresence>
          {menu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ transformOrigin: "top right" }}
                className="absolute right-3 top-12 z-30 w-[170px] rounded-[6px] bg-[var(--we-pop)] py-1 text-[15.5px] text-white shadow-2xl">
                <span className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-[var(--we-pop)]" />
                {menuItems.map(({ label, Icon, run }) => <button key={label} onClick={() => { setMenu(false); run(); }} className="relative flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-white/10"><Icon size={20} strokeWidth={1.7} />{label}</button>)}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto pb-32">
        {focusEndsAt && <FocusBar endsAt={focusEndsAt} onStop={stopFocus} />}
        {folderId === null && <div className="px-3 pt-2 empty:hidden"><PushNudge /></div>}
        {folderId === null && <div className="px-3 pt-2"><TodaySchedule onOpen={() => setTimetable(true)} /></div>}

        {empty ? (
          <div className="flex flex-col items-center px-10 pb-6 pt-14 text-center">
            <BookOpen size={40} className="text-[var(--we-hint)]" />
            <p className="mt-4 text-[16px] text-[var(--we-text)]">No courses yet</p>
            <p className="mt-1 text-[13.5px] text-[var(--we-sub)]">Add slides, notes and recordings. Birdie learns from them.</p>
            <button onClick={() => setSheet("course")} className="mt-5 rounded-[6px] bg-[var(--we-accent)] px-8 py-2.5 text-[15.5px] font-medium text-white active:opacity-80">New Course</button>
          </div>
        ) : (
          <>
            {subs.length > 0 && (<>
              <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{folderId ? "Subfolders" : "Folders"}</div>
              <div className="bg-[var(--we-cell)]">
                {subs.map((f) => {
                  const n = courses.filter((c) => c.folderId === f.id).length + folders.filter((x) => x.parentId === f.id).length;
                  return (
                    <div key={f.id} className="flex items-center pl-4 active:bg-[var(--we-bg)]">
                      <button onClick={() => setFolderId(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[#F5A623]/15 text-[#E39A17]"><FolderIcon size={22} fill="currentColor" fillOpacity={0.25} /></span>
                        <span className="min-w-0 flex-1 border-b border-[var(--we-sep)] py-3.5"><span className="block truncate text-[16px] text-[var(--we-text)]">{f.name}</span><span className="block text-[13px] text-[var(--we-sub)]">{n} item{n === 1 ? "" : "s"}</span></span>
                      </button>
                      <button onClick={() => setSheet({ t: "folder-actions", id: f.id })} aria-label="Folder options" className="self-stretch border-b border-[var(--we-sep)] px-4 text-[var(--we-hint)]"><MoreHorizontal size={20} /></button>
                    </div>
                  );
                })}
              </div>
            </>)}
            <div className="px-4 pb-1.5 pt-4 text-[13px] text-[var(--we-sub)]">{folderId ? "Courses in this folder" : "My Courses"}</div>
            {here.length === 0 ? (
              <div className="bg-[var(--we-cell)] px-4 py-6 text-center text-[14px] text-[var(--we-sub)]">
                {folderId ? "Empty folder" : "Every course is in a folder"}
                {folderId && <div className="mt-3 flex justify-center gap-6 text-[15px] text-[var(--we-link)]"><button onClick={() => setSheet("course")}>New Course</button><button onClick={() => setSheet("folder")}>New Subfolder</button></div>}
              </div>
            ) : (
              <div className="bg-[var(--we-cell)]">
                {here.map((c) => (
                  <div key={c.id} className="flex items-center pl-4 active:bg-[var(--we-bg)]">
                    <button onClick={() => { setCourseId(c.id); setInitialTab("materials"); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-[11.5px] font-bold text-white" style={{ background: c.color }}>{c.code.replace(/\s/g, "").slice(0, 4)}</span>
                      <span className="min-w-0 flex-1 border-b border-[var(--we-sep)] py-3.5"><span className="block truncate text-[16px] text-[var(--we-text)]">{c.name}</span><span className="block truncate text-[13px] text-[var(--we-sub)]">{[c.code, `${c.files.length} files`, `${c.notes.length} notes`, c.recs.length ? `${c.recs.length} recordings` : ""].filter(Boolean).join(" · ")}</span></span>
                    </button>
                    <button onClick={() => setSheet({ t: "course-actions", id: c.id })} aria-label="Course options" className="self-stretch border-b border-[var(--we-sep)] px-4 text-[var(--we-hint)]"><MoreHorizontal size={20} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {folderId === null && <div className="px-3 pt-3"><SlotAd surface="study" /></div>}
      </div>

      <ExtraSheets sheet={extra} setSheet={setExtra} />
      <TimetablePage open={timetable} onClose={() => setTimetable(false)} />
      <Page open={sheet === "course" || sheet === "folder"} onClose={reset} title={sheet === "course" ? "New Course" : folderId ? "New Subfolder" : "New Folder"}
        right={<button disabled={!name.trim()} onClick={() => create(sheet as "course" | "folder")} className="mr-2 rounded-[4px] bg-[var(--we-accent)] px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40">Create</button>}>
        <div className="mt-2 bg-[var(--we-cell)]">
          {sheet === "course" && <label className="flex items-center border-b border-[var(--we-sep)] px-4"><span className="w-24 shrink-0 text-[16px] text-[var(--we-text)]">Code</span><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PHY 101 (optional)" className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" /></label>}
          <label className="flex items-center px-4"><span className="w-24 shrink-0 text-[16px] text-[var(--we-text)]">Name</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(sheet as "course" | "folder"); }} placeholder={sheet === "course" ? "e.g. Mechanics" : "e.g. 300 Level"} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-[var(--we-text)] outline-none placeholder:text-[var(--we-hint)]" /></label>
        </div>
        {folderId && <p className="px-4 pt-2 text-[13px] text-[var(--we-sub)]">Inside {path[path.length - 1]?.name}</p>}
      </Page>
      <Page open={sheet === "focus"} onClose={() => setSheet(null)} title="Focus Timer">
        <div className="flex flex-col items-center px-6 pb-4 pt-10 text-center"><Timer size={44} className="text-[var(--we-accent)]" /><p className="mt-3 text-[15px] text-[var(--we-sub)]">Put your phone down. Birdie cheers when you&apos;re done.</p></div>
        <div className="bg-[var(--we-cell)]">{[15, 25, 50].map((m) => (
          <button key={m} onClick={() => { startFocus(m); setSheet(null); }} className="flex w-full items-center justify-between border-b border-[var(--we-sep)] px-4 py-4 text-left last:border-0 active:bg-[var(--we-bg)]"><span className="text-[16px] text-[var(--we-text)]">{m} minutes</span><span className="text-[14px] text-[var(--we-link)]">Start</span></button>
        ))}</div>
      </Page>

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

function FocusBar({ endsAt, onStop }: { endsAt: number; onStop: () => void }) {
  const [left, setLeft] = useState(0);
  useEffect(() => { const tick = () => setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000))); void Promise.resolve().then(tick); const i = setInterval(tick, 1000); return () => clearInterval(i); }, [endsAt]);
  return (
    <div className="flex items-center gap-3 bg-[var(--we-cell)] px-4 py-2.5">
      <Timer size={18} className="text-[var(--we-accent)]" />
      <span className="flex-1 text-[15px] text-[var(--we-text)]">Focus · <span className="tabular-nums">{mmss(left)}</span></span>
      <button onClick={onStop} className="text-[14px] text-[var(--we-red)]">Stop</button>
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
      {rows.length === 0 && <p className="text-[13px] text-[var(--dim)]">You haven&apos;t made any folders yet.</p>}
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
    await ingestFiles(list, course.id, { addFile, updateFile, flash, category: fileCat });
  }
  async function readIt(f: FileItem) {
    flash("Birdie is reading it. Scans take a minute.");
    const ok = await readWithAI(course.id, f, updateFile);
    flash(ok ? `Birdie can read ${f.name} now` : "Birdie couldn't make out any text in that file");
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
    else if (!f.text && scannable(f.name)) await readWithAI(course.id, { id: f.id, storagePath: path }, updateFile);
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
                    {f.status === "reading" && <div className="mt-1 text-[11.5px] font-semibold text-[var(--birdie-text)]">Birdie is reading this scan...</div>}
                    {!f.text && f.storagePath && scannable(f.name) && f.status !== "reading" && f.status !== "uploading" && <div className="mt-1 text-[11.5px] font-semibold text-[var(--dim)]">{f.status === "unread" ? "Birdie couldn't find text in this one." : "Birdie can't read this yet."}</div>}
                  </div>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-4 border-t border-[var(--line)] pt-2">
                  {f.status === "failed" && !readOnly && <button onClick={() => void retryUpload(f)} className="mr-auto text-[12px] font-bold text-[var(--help)]">Retry upload</button>}
                  {!readOnly && !f.text && f.storagePath && scannable(f.name) && f.status !== "reading" && <button onClick={() => void readIt(f)} className="flex items-center gap-1 rounded-lg bg-[var(--birdie-soft)] px-2.5 py-1.5 text-[12px] font-bold text-[var(--birdie-text)]"><Sparkles size={13} />{f.status === "unread" ? "Try reading again" : "Let Birdie read it"}</button>}
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
