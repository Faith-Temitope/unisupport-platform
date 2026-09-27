"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bell, BookOpen, ChevronRight, FileText, FolderInput, FolderPlus, Folder as FolderIcon, Image as ImageIcon, MoreHorizontal, Plus, Presentation, Search, Share2, Sparkles, StickyNote, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { folderPath, useApp, type Course, type FileItem, type Folder } from "./store";
import { Btn, Empty, IconBtn, Label, Sheet, TextField, TopBar } from "./ui";
import { DeadlinesCard, ExtraSheets, TodayCard, type ExtraSheet } from "./StudyExtras";

type CTab = "materials" | "notes" | "recordings" | "progress";
const KIND_ICON = { pdf: FileText, img: ImageIcon, slides: Presentation, notes: StickyNote, link: FileText, text: FileText } as const;
const kindOf = (f: File): FileItem["kind"] => (f.type.startsWith("image/") ? "img" : /\.(txt|md)$/i.test(f.name) ? "text" : /\.(ppt|pptx|key)$/i.test(f.name) ? "slides" : "pdf");
const fmtSize = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : n > 1000 ? `${Math.round(n / 1000)} KB` : n ? `${n} B` : "");
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Study() {
  const { courses, folders, addCourse, addFolder, renameFolder, deleteFolder, deleteCourse, moveCourse, recommendation, dismissRec, goBirdie, studyIntent, clearStudyIntent, settings, flash, notices } = useApp();
  const [extra, setExtra] = useState<ExtraSheet>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<CTab>("materials");
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

function CourseView({ course, startTab, onBack }: { course: Course; startTab: CTab; onBack: () => void }) {
  const { addNote, deleteNote, addFile, deleteFile, deleteRec, goBirdie, setRecorderOpen, flash, shared, shareCourse, setTab, profile } = useApp();
  const [sName, setSName] = useState(profile.name); const [sSchool, setSSchool] = useState(profile.institution);
  const [tab, setTab_] = useState<CTab>(startTab);
  const [sheet, setSheet] = useState<null | "note" | "share">(null);
  const [nTitle, setNTitle] = useState(""); const [nBody, setNBody] = useState("");
  const [desc, setDesc] = useState(""); const [field, setField] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const overall = course.topics.length ? Math.round(course.topics.reduce((a, t) => a + t.mastery, 0) / course.topics.length) : null;
  const sharedCourse = shared.find((s) => s.id === course.sharedId);
  const tabs: [CTab, string][] = [["materials", "Materials"], ["notes", "Notes"], ["recordings", "Recordings"], ["progress", "Progress"]];

  async function pick(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const text = kindOf(f) === "text" ? await f.text() : undefined;
      addFile(course.id, { name: f.name, kind: kindOf(f), size: f.size, text, url: URL.createObjectURL(f) });
    }
    flash(`${files.length} file${files.length === 1 ? "" : "s"} added`);
    if (input.current) input.current.value = "";
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
          <button onClick={() => (sharedCourse ? (setTab("explore"), flash("Open Shared courses in Explore")) : setSheet("share"))} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--dim)] active:scale-95"><Share2 size={13} /> {sharedCourse ? "Shared" : "Share"}</button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-32">
        <div className="space-y-2.5">
          {tab === "materials" && (<>
            <input ref={input} type="file" multiple hidden onChange={(e) => pick(e.target.files)} />
            {course.files.length === 0 ? <Empty icon={<Upload size={20} />} title="No materials yet" text="Add slides, PDFs, photos of the whiteboard, or .txt / .md notes. Text files can be read by Birdie right away." action={<Btn variant="study" onClick={() => input.current?.click()}>Choose files</Btn>} /> : (<>
              {course.files.map((f) => { const Icon = KIND_ICON[f.kind]; return (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--study-soft)] text-[var(--study)]"><Icon size={18} /></div>
                  <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold text-[var(--text)]">{f.name}</div><div className="text-[11.5px] text-[var(--dim)]">{f.added}{f.size ? ` · ${fmtSize(f.size)}` : ""} · {f.text ? "Birdie can read this" : "Birdie reads this once AI is connected"}</div></div>
                  {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="rounded-lg bg-[var(--paper-dim)] px-2.5 py-1.5 text-[11.5px] font-bold text-[var(--dim)]">Open</a>}
                  <button onClick={() => deleteFile(course.id, f.id)} aria-label="Delete file" className="text-[var(--dim)] active:scale-90"><Trash2 size={15} /></button>
                </div>); })}
              <Btn variant="ghost" onClick={() => input.current?.click()}>+ Add more files</Btn>
            </>)}
          </>)}

          {tab === "notes" && (course.notes.length === 0 ? <Empty icon={<StickyNote size={20} />} title="No notes yet" text="Write what you want to remember. Birdie builds quizzes and answers from your notes." action={<Btn variant="study" onClick={() => setSheet("note")}>Write a note</Btn>} /> : (<>
            {course.notes.map((n) => (<div key={n.id} className="rounded-2xl border border-[var(--line)] bg-white p-3.5"><div className="flex items-start justify-between gap-2"><div className="text-[14px] font-semibold text-[var(--text)]">{n.title}</div><button onClick={() => deleteNote(course.id, n.id)} aria-label="Delete note" className="text-[var(--dim)] active:scale-90"><Trash2 size={14} /></button></div><div className="mt-1 whitespace-pre-line text-[13px] leading-snug text-[var(--dim)]">{n.body}</div><div className="mt-1.5 text-[11px] text-[#a99fb8]">{n.date}</div></div>))}
            <Btn variant="ghost" onClick={() => setSheet("note")}>+ New note</Btn></>))}

          {tab === "recordings" && (course.recs.length === 0 ? <Empty icon={<BookOpen size={20} />} title="No recordings yet" text="Tap the mascot, choose Record, and capture a lecture. You choose the course after you stop." action={<Btn variant="study" onClick={() => setRecorderOpen(true)}>Record a lecture</Btn>} /> : (<>
            {course.recs.map((r) => (<div key={r.id} className="rounded-2xl border border-[var(--line)] bg-white p-3"><div className="flex items-center justify-between gap-2"><div><div className="text-[13.5px] font-semibold text-[var(--text)]">{r.name}</div><div className="text-[11.5px] text-[var(--dim)]">{r.date} · {mmss(r.dur)} · transcript arrives once AI is connected</div></div><button onClick={() => deleteRec(course.id, r.id)} aria-label="Delete recording" className="text-[var(--dim)] active:scale-90"><Trash2 size={15} /></button></div>{r.url && <audio src={r.url} controls className="mt-2 h-9 w-full" />}</div>))}
            <Btn variant="ghost" onClick={() => setRecorderOpen(true)}>+ Record another</Btn></>))}

          {tab === "progress" && (overall === null ? <Empty icon={<Sparkles size={20} />} title="No progress yet" text="Take a quiz in Birdie and your topics and mastery show up here." action={<Btn variant="study" onClick={() => goBirdie({ courseId: course.id, mode: "test" })}>Take a quiz</Btn>} /> : (<>
            <div className="rounded-2xl bg-[var(--study-soft)] p-4"><div className="disp text-[30px] font-bold text-[var(--study)]">{overall}%</div><div className="text-[12.5px] text-[#4a3596]">Overall mastery in {course.code}</div></div>
            {course.topics.map((t) => (<div key={t.name} className="pt-1"><div className="mb-1.5 flex justify-between gap-3 text-[13px] font-semibold"><span className="truncate">{t.name}</span><span className="text-[var(--dim)]">{t.mastery}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--paper-dim)]"><motion.div className="h-full rounded-full" style={{ background: t.mastery < 55 ? "var(--help)" : "var(--study)" }} initial={{ width: 0 }} animate={{ width: `${t.mastery}%` }} /></div></div>))}
            <div className="pt-2"><Btn variant="ink" onClick={() => goBirdie({ courseId: course.id, mode: "test" })}>Take another quiz</Btn></div></>))}
        </div>
      </div>

      <Sheet open={sheet === "note"} onClose={() => setSheet(null)} title="New note">
        <div className="space-y-3"><TextField value={nTitle} onChange={setNTitle} placeholder="Title, e.g. Eigenvalues" /><TextField multiline value={nBody} onChange={setNBody} placeholder="Write it in full sentences. Birdie quizzes you on these." />
          <Btn variant="study" disabled={!nTitle.trim() || !nBody.trim()} onClick={() => { addNote(course.id, nTitle.trim(), nBody.trim()); setNTitle(""); setNBody(""); setSheet(null); flash("Note saved"); }}>Save note</Btn></div>
      </Sheet>
      <Sheet open={sheet === "share"} onClose={() => setSheet(null)} title="Share this course">
        <p className="mb-3 text-[13px] leading-snug text-[var(--dim)]">Classmates can find it in Explore, add it to their Study, and chat with each other inside it.</p>
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Shown on the course</div>
          <TextField value={sName} onChange={setSName} placeholder="Your name" /><TextField value={sSchool} onChange={setSSchool} placeholder="Your school (optional)" />
          <TextField value={field} onChange={setField} placeholder="Field, e.g. Computer Science" /><TextField multiline value={desc} onChange={setDesc} placeholder="What's in it? Who is it for?" />
          <Btn variant="study" disabled={!sName.trim() || !field.trim() || !desc.trim()} onClick={() => { shareCourse(course.id, desc.trim(), field.trim(), sName.trim(), sSchool.trim()); setSheet(null); flash("Shared to Explore"); }}>Publish to Explore</Btn></div>
      </Sheet>
    </div>
  );
}
