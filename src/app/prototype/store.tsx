"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { recommend, type Recommendation } from "./engine";
import {
  createRemoteCourse, createRemoteFile, createRemoteNote, createRemoteRecording,
  deleteRemoteFile, deleteRemoteNote, deleteRemoteRecording,
  joinSharedCourse, leaveSharedCourse, listMessages, postMessage, publishSharedCourse,
  fetchRemoteCourseContent, listPublishedSharedWithCounts,
} from "./live/sharedData";
import { logEvent } from "./live/analyticsData";
import { DEMO_PEOPLE, DEMO_POSTS, DEMO_SHARED, DEMO_REPLIES } from "./demo";
import { BADGES, dayKey, streakOf, type Stats } from "./badges";

export type TabId = "study" | "explore" | "birdie" | "help";
export type AuthStatus = "loading" | "out" | "guest" | "in";
export type Boot = "splash" | "word" | "done";
export type Emote = "happy" | "sad" | "love" | "say" | "angry";

export interface FileItem { id: string; name: string; kind: "pdf" | "img" | "slides" | "notes" | "link" | "text"; size: number; added: string; text?: string; url?: string; storagePath?: string }
export interface Note { id: string; title: string; body: string; date: string }
export interface Rec { id: string; name: string; dur: number; date: string; url?: string; text?: string; transcribing?: boolean; storagePath?: string }
export interface Topic { name: string; mastery: number }
export interface Course { id: string; code: string; name: string; color: string; folderId: string | null; files: FileItem[]; notes: Note[]; recs: Rec[]; topics: Topic[]; sharedId?: string; sourceCourseId?: string }
export interface Folder { id: string; name: string; parentId: string | null }
export interface Tx { id: string; label: string; amount: number; t: string }
export interface Deadline { id: string; title: string; date: string; courseId: string | null; done: boolean }
export interface Notice { id: string; title: string; body?: string; t: string; read: boolean }

export interface BAction { label: string; run: "note" | "file" | "test" | "writer" | "study" | "topup" | "spark" | "brain"; payload?: string }
export interface BMsg { id: string; from: "me" | "bird"; text: string; cite?: string; cards?: { q: string; a: string }[]; actions?: BAction[]; done?: boolean; t: string; at: number; meta?: string }

export interface Person { id: string; name: string; handle: string; field: string; bio: string; color: string; demo?: boolean }
export interface CMsg { id: string; from: "me" | "them"; text: string; t: string; author?: string }
export interface Post { id: string; authorId: string; kind: "video" | "text"; title: string; body?: string; videoUrl?: string; field: string; tags: string[]; dur?: string; grad: string; createdAt: number; likes: number; liked: boolean; demo?: boolean }
export interface SharedCourse { id: string; ownerId: string; ownerName?: string; code: string; name: string; school?: string; field: string; description: string; files: string[]; members: string[]; messages: { id: string; authorId: string; text: string; t: string }[]; demo?: boolean; sourceCourseId?: string }

export interface Profile { name: string; handle: string; level: string; program: string; institution: string; country: string; bio: string; onboarded: boolean }
export interface Settings {
  autoplay: boolean; personalTags: boolean; recs12h: boolean; readAloud: boolean; answerLength: "short" | "normal" | "detailed";
  notifChat: boolean; notifRec: boolean; notifSession: boolean; notifExplore: boolean;
  dyslexia: boolean; textSize: "s" | "m" | "l"; reduceMotion: boolean;
  calendar: boolean; schoolApps: boolean; offline: boolean; dataSaver: boolean;
  profileVisibility: "everyone" | "followers" | "private"; whoCanChat: "everyone" | "contacts"; recordReminder: boolean; twoFactor: boolean;
  aiBrain: "spark" | "nova" | "sage"; aiTier: "quick" | "balanced" | "deep";
  mascotOn: boolean; mascotChatty: boolean; dailyGoal: number;
}
export type Overlay = null | { t: "chats" } | { t: "thread"; id: string } | { t: "settings" } | { t: "profile"; id: string } | { t: "post" };
export interface MascotEvent { id: string; kind: Emote; text?: string }

export const COLORS = ["#7C4DDB", "#A63FBD", "#4C6EF5", "#1B8A85", "#D9467E", "#E2553F"];
export const uid = () => Math.random().toString(36).slice(2, 9);
export const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const naira = (n: number) => "₦" + n.toLocaleString("en-NG");
export const HOUR = 3600_000;

const defaultSettings: Settings = {
  autoplay: true, personalTags: true, recs12h: true, readAloud: true, answerLength: "normal",
  notifChat: true, notifRec: true, notifSession: true, notifExplore: false,
  dyslexia: false, textSize: "m", reduceMotion: false,
  calendar: false, schoolApps: false, offline: false, dataSaver: false,
  profileVisibility: "everyone", whoCanChat: "everyone", recordReminder: true, twoFactor: false,
  aiBrain: "spark", aiTier: "balanced",
  mascotOn: true, mascotChatty: true, dailyGoal: 3,
};
const emptyProfile: Profile = { name: "", handle: "", level: "", program: "", institution: "", country: "", bio: "", onboarded: false };

type BirdieIntent = { courseId: string; mode?: "chat" | "test" | "exam" | "practical"; prompt?: string };
interface AppCtx {
  boot: Boot; setBoot: (b: Boot) => void;
  auth: { status: AuthStatus; email?: string; userId?: string };
  authOpen: boolean; setAuthOpen: (b: boolean) => void;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>; continueAsGuest: () => void; resetPassword: (email: string) => Promise<{ error?: string }>;
  tab: TabId; setTab: (t: TabId) => void;
  profile: Profile; setProfile: (p: Partial<Profile>) => void;
  settings: Settings; setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  courses: Course[]; folders: Folder[];
  addCourse: (code: string, name: string, folderId: string | null, extra?: Partial<Course>) => string;
  deleteCourse: (id: string) => void; moveCourse: (id: string, folderId: string | null) => void;
  addFolder: (name: string, parentId: string | null) => void; renameFolder: (id: string, name: string) => void; deleteFolder: (id: string) => void;
  addNote: (courseId: string, title: string, body: string) => void; deleteNote: (courseId: string, noteId: string) => void;
  addFile: (courseId: string, f: Omit<FileItem, "id" | "added">) => void; deleteFile: (courseId: string, fileId: string) => void;
  addRec: (courseId: string, r: Omit<Rec, "id" | "date">) => string; deleteRec: (courseId: string, recId: string) => void;
  updateRec: (courseId: string, recId: string, patch: Partial<Rec>) => void;
  applyQuiz: (courseId: string, per: Record<string, { right: number; total: number }>) => void;
  chats: Record<string, BMsg[]>; setChats: (fn: (c: Record<string, BMsg[]>) => Record<string, BMsg[]>) => void;
  recommendation: Recommendation | null; dismissRec: () => void; skipHours: (h: number) => void;
  deadlines: Deadline[]; addDeadline: (title: string, date: string, courseId: string | null) => void; toggleDeadline: (id: string) => void; deleteDeadline: (id: string) => void;
  activity: Record<string, number>; streak: number; todayCount: number; stats: Stats; unlocked: string[]; logChat: () => void;
  notices: Notice[]; notify: (title: string, body?: string) => void; markNoticesRead: () => void; clearNotices: () => void;
  focusEndsAt: number | null; startFocus: (minutes: number) => void; stopFocus: (completed?: boolean) => void;
  mascotEvent: MascotEvent | null; emote: (kind: Emote, text?: string) => void;
  balance: number; txs: Tx[]; walletLive: boolean; refreshWallet: () => Promise<void>; spend: (amount: number, label: string) => boolean; topUp: (amount: number) => void; spendWallet: (amount: number, label: string) => Promise<boolean>; topUpLive: (amount: number) => Promise<string | null>;
  examPassUntil: string | null; buyExamPass: () => Promise<{ ok: boolean; error?: string }>;
  people: Person[]; contacts: string[]; following: string[]; convos: Record<string, CMsg[]>; blocked: string[];
  addContact: (id: string) => void; removeContact: (id: string) => void; toggleFollow: (id: string) => void; sendChat: (id: string, text: string) => void; toggleBlock: (id: string) => void;
  posts: Post[]; addPost: (p: Omit<Post, "id" | "createdAt" | "likes" | "liked" | "authorId">) => void; toggleLike: (id: string) => void; deletePost: (id: string) => void;
  shared: SharedCourse[]; shareCourse: (courseId: string, description: string, field: string, ownerName: string, school: string) => void; joinShared: (id: string) => string | null; sendShared: (id: string, text: string) => void; leaveShared: (id: string) => void;
  loadSharedDetail: (id: string) => void; sharedRemoteContent: { notes: Note[]; files: FileItem[]; recs: Rec[] } | null; loadRemoteCourseContent: (sourceCourseId: string) => void;
  personById: (id: string) => Person | null;
  demoOn: boolean; setDemo: (b: boolean) => void;
  walletOpen: boolean; setWalletOpen: (b: boolean) => void;
  brainOpen: boolean; setBrainOpen: (b: boolean) => void;
  overlay: Overlay; setOverlay: (o: Overlay) => void;
  recorderOpen: boolean; setRecorderOpen: (b: boolean) => void;
  toast: string | null; flash: (t: string) => void;
  birdieIntent: BirdieIntent | null; goBirdie: (i: BirdieIntent) => void; clearBirdieIntent: () => void;
  studyIntent: { courseId: string; tab?: string } | null; goStudy: (i: { courseId: string; tab?: string }) => void; clearStudyIntent: () => void;
  helpIntent: { mode: "mentor" | "full"; courseId: string | null } | null; goHelp: (i: { mode: "mentor" | "full"; courseId: string | null }) => void; clearHelpIntent: () => void;
  phone: HTMLElement | null; setPhone: (el: HTMLElement | null) => void; slot: HTMLElement | null; setSlot: (el: HTMLElement | null) => void;
  resetAll: () => void; resetKey: number; ready: boolean;
}

const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => { const c = useContext(Ctx); if (!c) throw new Error("useApp outside provider"); return c; };
const STORE_KEY = "birdie-proto-v4";
const GUEST_KEY = "birdie-guest";

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Boot>("splash");
  const [auth, setAuth] = useState<{ status: AuthStatus; email?: string; userId?: string }>({ status: "loading" });
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("study");
  const [profile, setProfileState] = useState<Profile>(emptyProfile);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [courses, setCourses] = useState<Course[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chats, setChatsState] = useState<Record<string, BMsg[]>>({});
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [lastRecAt, setLastRecAt] = useState(0);
  const [skew, setSkew] = useState(0);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [counters, setCounters] = useState({ quizzes: 0, chats: 0, posts: 0 });
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [focusEndsAt, setFocusEndsAt] = useState<number | null>(null);
  const [mascotEvent, setMascotEvent] = useState<MascotEvent | null>(null);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [convos, setConvos] = useState<Record<string, CMsg[]>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [shared, setShared] = useState<SharedCourse[]>([]);
  const [demoOn, setDemoOn] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [brainOpen, setBrainOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [birdieIntent, setBirdieIntent] = useState<AppCtx["birdieIntent"]>(null);
  const [studyIntent, setStudyIntent] = useState<AppCtx["studyIntent"]>(null);
  const [helpIntent, setHelpIntent] = useState<AppCtx["helpIntent"]>(null);
  const [phone, setPhone] = useState<HTMLElement | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [ready, setReady] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loaded = useRef(false);

  // ---------- load / persist (this device only, until data lives in Supabase) ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const j = JSON.parse(raw);
        if (j.profile) setProfileState({ ...emptyProfile, ...j.profile });
        if (j.settings) setSettings({ ...defaultSettings, ...j.settings });
        if (j.courses) setCourses(j.courses); if (j.folders) setFolders(j.folders); if (j.chats) setChatsState(j.chats);
        if (j.deadlines) setDeadlines(j.deadlines); if (j.activity) setActivity(j.activity); if (j.counters) setCounters(j.counters);
        if (j.unlocked) setUnlocked(j.unlocked); if (j.balance) setBalance(j.balance); if (j.txs) setTxs(j.txs); if (j.notices) setNotices(j.notices);
      }
    } catch { /* ignore */ }
    loaded.current = true; setReady(true);
    return () => timers.current.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      try {
        const strip = courses.map((c) => ({ ...c, files: c.files.map((f) => ({ ...f, url: undefined })), recs: c.recs.map((r) => ({ ...r, url: undefined })) }));
        localStorage.setItem(STORE_KEY, JSON.stringify({ profile, settings, courses: strip, folders, chats, deadlines, activity, counters, unlocked, balance, txs, notices }));
      } catch { /* storage full or blocked */ }
    }, 350);
    return () => clearTimeout(t);
  }, [profile, settings, courses, folders, chats, deadlines, activity, counters, unlocked, balance, txs, notices]);

  // ---------- auth (real Supabase auth; guest mode is local only) ----------
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getSession();
        const u = data.session?.user;
        if (u) setAuth({ status: "in", email: u.email ?? undefined, userId: u.id });
        else setAuth({ status: localStorage.getItem(GUEST_KEY) ? "guest" : "out" });
        const sub = sb.auth.onAuthStateChange((_e, session) => {
          if (session?.user) { setAuth({ status: "in", email: session.user.email ?? undefined, userId: session.user.id }); setAuthOpen(false); localStorage.removeItem(GUEST_KEY); setProfileState((p) => (p.name ? p : { ...p, name: (session.user.user_metadata?.full_name as string) ?? p.name })); }
        });
        unsub = () => sub.data.subscription.unsubscribe();
      } catch { setAuth({ status: localStorage.getItem(GUEST_KEY) ? "guest" : "out" }); }
    })();
    return () => unsub?.();
  }, []);

  // ---------- cloud sync (signed-in users): study data follows the account across devices ----------
  // One snapshot per user in user_state. Wallet is excluded (it lives in the ledger). Blob URLs never leave the device.
  const synced = useRef(false);
  const snapshot = useCallback(() => ({
    profile, settings, folders, chats, deadlines, activity, counters, unlocked, notices,
    courses: courses.map((c) => ({ ...c, files: c.files.map((f) => ({ ...f, url: undefined })), recs: c.recs.map((r) => ({ ...r, url: undefined })) })),
  }), [profile, settings, courses, folders, chats, deadlines, activity, counters, unlocked, notices]);
  const snapRef = useRef(snapshot); snapRef.current = snapshot;
  useEffect(() => {
    if (auth.status !== "in" || !ready) { synced.current = false; return; }
    let dead = false;
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        const { data: row } = await sb.from("user_state").select("data").eq("user_id", user.id).maybeSingle();
        const j = row?.data as Record<string, never> | undefined;
        const remoteHas = !!j && ((j.courses as unknown[] | undefined)?.length || (j.chats && Object.keys(j.chats).length) || (j.folders as unknown[] | undefined)?.length);
        if (!dead && remoteHas && j) {
          if (j.profile) setProfileState((p) => ({ ...emptyProfile, ...(j.profile as object), ...(p.name ? { name: p.name } : {}) }));
          if (j.settings) setSettings({ ...defaultSettings, ...(j.settings as object) });
          if (j.courses) setCourses(j.courses); if (j.folders) setFolders(j.folders); if (j.chats) setChatsState(j.chats);
          if (j.deadlines) setDeadlines(j.deadlines); if (j.activity) setActivity(j.activity); if (j.counters) setCounters(j.counters);
          if (j.unlocked) setUnlocked(j.unlocked); if (j.notices) setNotices(j.notices);
        }
        if (!dead) synced.current = true;
      } catch { /* offline: stay local */ }
    })();
    return () => { dead = true; };
  }, [auth.status, ready]);
  useEffect(() => {
    if (auth.status !== "in" || !synced.current) return;
    const t = setTimeout(async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) await sb.from("user_state").upsert({ user_id: user.id, data: snapRef.current(), updated_at: new Date().toISOString() });
      } catch { /* retry on next change */ }
    }, 1500);
    return () => clearTimeout(t);
  }, [auth.status, profile, settings, courses, folders, chats, deadlines, activity, counters, unlocked, notices]);

  // ---------- real wallet (signed-in users): balance and activity come from Supabase ----------
  const walletLive = auth.status === "in";
  const refreshWallet = useCallback(async () => {
    try {
      const sb = createClient();
      const [b, t] = await Promise.all([
        sb.from("wallet_balances").select("balance").maybeSingle(),
        sb.from("wallet_transactions").select("id,amount,label,kind,created_at").order("created_at", { ascending: false }).limit(40),
      ]);
      setBalance(Number(b.data?.balance ?? 0));
      setTxs((t.data ?? []).map((x) => ({ id: x.id as string, label: (x.label as string) ?? (x.kind as string), amount: Number(x.amount), t: new Date(x.created_at as string).toLocaleDateString([], { month: "short", day: "numeric" }) })));
    } catch { /* keep what we have */ }
  }, []);
  useEffect(() => { if (auth.status === "in") void refreshWallet(); }, [auth.status, refreshWallet]);

  // ---------- Exam Pass (signed-in users): a time-boxed unlimited-AI entitlement bought with wallet balance ----------
  const [examPassUntil, setExamPassUntil] = useState<string | null>(null);
  const refreshExamPass = useCallback(async () => {
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from("profiles").select("exam_pass_until").eq("id", user.id).maybeSingle();
      setExamPassUntil((data?.exam_pass_until as string | null) ?? null);
    } catch { /* keep what we have */ }
  }, []);
  useEffect(() => { if (auth.status === "in") void refreshExamPass(); }, [auth.status, refreshExamPass]);
  const buyExamPass = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const { data, error } = await createClient().rpc("buy_exam_pass");
    if (error) return { ok: false, error: error.message.replace(/^.*?exception:\s*/i, "") };
    setExamPassUntil(data as string);
    void refreshWallet();
    return { ok: true };
  }, [refreshWallet]);

  // ---------- activity tracking (admin "visits/actives/hours" dashboard) ----------
  // One session_start on sign-in, then one heartbeat/60s while the tab is actually in the
  // foreground (visibilitychange-gated so a parked background tab doesn't inflate "hours").
  useEffect(() => {
    if (auth.status !== "in") return;
    void logEvent("session_start");
    const tick = () => { if (document.visibilityState === "visible") void logEvent("heartbeat"); };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [auth.status]);

  // ---------- real Shared Courses (signed-in users): browse what other real accounts published ----------
  const [sharedRemoteContent, setSharedRemoteContent] = useState<{ notes: Note[]; files: FileItem[]; recs: Rec[] } | null>(null);
  const loadSharedList = useCallback(async () => {
    const { list, membersBySharedId, fileNamesByCourseId, messageCountBySharedId } = await listPublishedSharedWithCounts();
    const myId = auth.userId;
    void messageCountBySharedId; // counts fold into `members`/`files` below; message count itself shown once loadSharedDetail runs
    setShared((prev): SharedCourse[] => list.map((sc): SharedCourse => {
      const members = (membersBySharedId[sc.id] ?? []).map((m) => (m === myId ? "me" : m));
      const prior = prev.find((p) => p.id === sc.id);
      return {
        id: sc.id, ownerId: sc.owner_id === myId ? "me" : sc.owner_id, ownerName: prior?.ownerName,
        code: sc.courses?.code ?? "?", name: sc.courses?.name ?? "Untitled course", school: sc.school ?? undefined,
        field: sc.field, description: sc.description, files: fileNamesByCourseId[sc.source_course_id] ?? [],
        members, messages: prior?.messages ?? [], sourceCourseId: sc.source_course_id,
      };
    }).concat(prev.filter((p) => p.demo))); // keep any explicit demo-mode entries alongside the real list
  }, [auth.userId]);
  useEffect(() => { if (auth.status === "in") void loadSharedList(); }, [auth.status, loadSharedList]);

  /** Called when the Explore detail sheet opens for a shared course: fetches its real message
   * thread (not loaded in the list view, to keep that one cheap). */
  const loadSharedDetail = useCallback((id: string) => {
    void (async () => {
      const msgs = await listMessages(id);
      const myId = auth.userId;
      setShared((ss) => ss.map((x) => (x.id === id ? { ...x, messages: msgs.map((m) => ({ id: m.id, authorId: m.author_id === myId ? "me" : m.author_id, text: m.body, t: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })) } : x)));
    })();
  }, [auth.userId]);

  /** Read-only content for a joined (non-owned) shared course -- the real, live data from the
   * owner's course, not a stale copy taken at share time. */
  const loadRemoteCourseContent = useCallback((sourceCourseId: string) => {
    void (async () => {
      const { notes, files, recs } = await fetchRemoteCourseContent(sourceCourseId);
      setSharedRemoteContent({
        notes: notes.map((n) => ({ id: n.id, title: n.title, body: n.body, date: new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) })),
        files: files.map((f) => ({ id: f.id, name: f.name, kind: f.kind as FileItem["kind"], size: 0, added: new Date(f.created_at).toLocaleDateString([], { month: "short", day: "numeric" }), storagePath: f.storage_path ?? undefined })),
        recs: recs.map((r) => ({ id: r.id, name: r.name, dur: r.duration_seconds, date: new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric" }), storagePath: r.storage_path ?? undefined, text: r.transcript ?? undefined })),
      });
    })();
  }, []);

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const flash = useCallback((t: string) => { setToast(t); later(() => setToast(null), 2400); }, []);
  const now = useCallback(() => Date.now() + skew, [skew]);
  const emote = useCallback((kind: Emote, text?: string) => setMascotEvent({ id: uid(), kind, text }), []);
  const notify = useCallback((title: string, body?: string) => setNotices((n) => [{ id: uid(), title, body, t: nowTime(), read: false }, ...n].slice(0, 40)), []);
  const logActivity = useCallback(() => setActivity((a) => ({ ...a, [dayKey()]: (a[dayKey()] ?? 0) + 1 })), []);

  // ---------- 12-hour recommendation ----------
  useEffect(() => {
    if (!settings.recs12h || tab === "birdie") return;
    const t = now();
    if (t - lastRecAt < 12 * HOUR) return;
    const rec = recommend(chats, courses, lastRecAt, t);
    if (rec) { setRecommendation(rec); setLastRecAt(t); if (settings.notifRec) notify("Birdie has a recommendation", rec.title); }
  }, [chats, courses, skew, tab, settings.recs12h, settings.notifRec, lastRecAt, now, notify]);

  // ---------- streak + badges ----------
  const streak = useMemo(() => streakOf(activity), [activity]);
  const todayCount = activity[dayKey()] ?? 0;
  const stats: Stats = useMemo(() => ({
    notes: courses.reduce((a, c) => a + c.notes.length, 0), courses: courses.length, recs: courses.reduce((a, c) => a + c.recs.length, 0),
    quizzes: counters.quizzes, streak, posts: counters.posts, contacts: contacts.length, chats: counters.chats, files: courses.reduce((a, c) => a + c.files.length, 0),
  }), [courses, counters, streak, contacts]);
  useEffect(() => {
    if (!loaded.current) return;
    const fresh = BADGES.filter((b) => b.test(stats) && !unlocked.includes(b.id));
    if (fresh.length) { setUnlocked((u) => [...u, ...fresh.map((b) => b.id)]); const b = fresh[0]; emote("love", `New badge: ${b.label}!`); notify(`Badge unlocked: ${b.label}`, b.desc); }
  }, [stats, unlocked, emote, notify]);

  // ---------- focus timer ----------
  useEffect(() => {
    if (!focusEndsAt) return;
    const ms = focusEndsAt - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => { setFocusEndsAt(null); logActivity(); emote("love", "Focus session done. Nice work!"); notify("Focus session complete", "Take a short break."); }, ms);
    return () => clearTimeout(t);
  }, [focusEndsAt, emote, notify, logActivity]);

  const patchCourse = (id: string, fn: (c: Course) => Course) => setCourses((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  const dateLabel = () => new Date().toLocaleDateString([], { month: "short", day: "numeric" });
  const meId = "me";
  // Lets the fire-and-forget Supabase syncs below read the just-updated course (sharedId, etc.)
  // without waiting for a re-render -- the mutators that use it run synchronously right after the
  // matching setCourses call.
  const coursesRef = useRef(courses); coursesRef.current = courses;
  const userId = auth.userId;

  const value = useMemo<AppCtx>(() => ({
    boot, setBoot, auth, authOpen, setAuthOpen,
    signUp: async (name, email, password) => {
      try {
        const sb = createClient();
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/prototype` : undefined } });
        if (error) return { error: error.message };
        setProfileState((p) => ({ ...p, name: name || p.name }));
        if (data.session) return {};
        return { needsConfirm: true };
      } catch (e) { return { error: (e as Error).message }; }
    },
    signIn: async (email, password) => {
      try { const { error } = await createClient().auth.signInWithPassword({ email, password }); return error ? { error: error.message } : {}; }
      catch (e) { return { error: (e as Error).message }; }
    },
    signOut: async () => {
      try { await createClient().auth.signOut(); } catch { /* ignore */ }
      try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ }
      setAuth({ status: "out" });
    },
    continueAsGuest: () => { try { localStorage.setItem(GUEST_KEY, "1"); } catch { /* ignore */ } setAuth({ status: "guest" }); setAuthOpen(false); },
    resetPassword: async (email) => {
      try { const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: typeof window !== "undefined" ? `${window.location.origin}/prototype` : undefined }); return error ? { error: error.message } : {}; }
      catch (e) { return { error: (e as Error).message }; }
    },
    tab, setTab, profile, setProfile: (p) => setProfileState((x) => ({ ...x, ...p })),
    settings, setSetting: (k, v) => setSettings((s) => ({ ...s, [k]: v })),
    courses, folders,
    // A real UUID, not the short uid() used elsewhere -- this is what lets a course be shared
    // later without an id migration: file/recording storage paths (keyed by course.id) and the
    // eventual Supabase `courses` row (same id) already line up from the moment the course exists.
    addCourse: (code, name, folderId, extra) => { const id = crypto.randomUUID(); setCourses((cs) => [...cs, { id, code, name, color: COLORS[cs.length % COLORS.length], folderId, files: [], notes: [], recs: [], topics: [], ...extra }]); logActivity(); return id; },
    deleteCourse: (id) => { setCourses((cs) => cs.filter((c) => c.id !== id)); emote("sad", "Aww, that course is gone."); },
    moveCourse: (id, folderId) => patchCourse(id, (c) => ({ ...c, folderId })),
    addFolder: (name, parentId) => setFolders((f) => [...f, { id: uid(), name, parentId }]),
    renameFolder: (id, name) => setFolders((f) => f.map((x) => (x.id === id ? { ...x, name } : x))),
    deleteFolder: (id) => {
      const f = folders.find((x) => x.id === id); if (!f) return;
      setFolders((fs) => fs.filter((x) => x.id !== id).map((x) => (x.parentId === id ? { ...x, parentId: f.parentId } : x)));
      setCourses((cs) => cs.map((c) => (c.folderId === id ? { ...c, folderId: f.parentId } : c)));
    },
    // Notes/files/recordings only sync to Supabase once their course has actually been shared
    // (course.sharedId set) -- that's the only time another real account needs to read them, since
    // private Study data already has its own cross-device sync via the user_state blob below.
    addNote: (courseId, title, body) => {
      const id = crypto.randomUUID();
      patchCourse(courseId, (c) => ({ ...c, notes: [{ id, title, body, date: dateLabel() }, ...c.notes] }));
      logActivity(); emote("happy", "Nice note! I'll remember that.");
      if (coursesRef.current.find((c) => c.id === courseId)?.sharedId && userId) void createRemoteNote(id, courseId, userId, title, body);
    },
    deleteNote: (courseId, noteId) => {
      patchCourse(courseId, (c) => ({ ...c, notes: c.notes.filter((n) => n.id !== noteId) })); emote("sad", "Was that note important?");
      if (coursesRef.current.find((c) => c.id === courseId)?.sharedId) void deleteRemoteNote(noteId);
    },
    addFile: (courseId, f) => {
      patchCourse(courseId, (c) => ({ ...c, files: [{ ...f, id: uid(), added: dateLabel() }, ...c.files] })); logActivity();
      if (coursesRef.current.find((c) => c.id === courseId)?.sharedId && userId && f.storagePath) void createRemoteFile(courseId, userId, f.name, f.kind, f.storagePath);
    },
    deleteFile: (courseId, fileId) => {
      const f = coursesRef.current.find((c) => c.id === courseId)?.files.find((x) => x.id === fileId);
      patchCourse(courseId, (c) => ({ ...c, files: c.files.filter((x) => x.id !== fileId) }));
      if (f?.storagePath) void deleteRemoteFile(f.storagePath);
    },
    addRec: (courseId, r) => {
      const id = uid();
      patchCourse(courseId, (c) => ({ ...c, recs: [{ ...r, id, date: dateLabel() }, ...c.recs] })); logActivity(); emote("happy", "Lecture saved!");
      return id;
    },
    deleteRec: (courseId, recId) => {
      const r = coursesRef.current.find((c) => c.id === courseId)?.recs.find((x) => x.id === recId);
      patchCourse(courseId, (c) => ({ ...c, recs: c.recs.filter((x) => x.id !== recId) }));
      if (r?.storagePath) void deleteRemoteRecording(r.storagePath);
    },
    updateRec: (courseId, recId, patch) => {
      const before = coursesRef.current.find((c) => c.id === courseId)?.recs.find((r) => r.id === recId);
      patchCourse(courseId, (c) => ({ ...c, recs: c.recs.map((r) => (r.id === recId ? { ...r, ...patch } : r)) }));
      const course = coursesRef.current.find((c) => c.id === courseId);
      if (!course?.sharedId || !before) return;
      // The recording's raw audio finishes uploading (and gets its storagePath) after the course
      // may already be shared -- push it to course_files' sibling table at that point, not before.
      if (patch.storagePath && !before.storagePath && userId) void createRemoteRecording(courseId, userId, before.name, before.dur, patch.storagePath);
    },
    applyQuiz: (courseId, per) => {
      let right = 0, total = 0;
      Object.values(per).forEach((r) => { right += r.right; total += r.total; });
      patchCourse(courseId, (c) => {
        const topics = [...c.topics];
        Object.entries(per).forEach(([name, r]) => {
          if (!r.total) return;
          const score = (r.right / r.total) * 100;
          const i = topics.findIndex((t) => t.name === name);
          if (i >= 0) topics[i] = { name, mastery: Math.round(topics[i].mastery * 0.6 + score * 0.4) };
          else topics.push({ name, mastery: Math.round(50 * 0.6 + score * 0.4) });
        });
        return { ...c, topics };
      });
      setCounters((c) => ({ ...c, quizzes: c.quizzes + 1 })); logActivity();
      const pct = total ? right / total : 0;
      if (pct >= 0.8) emote("love", "Wow, top marks!"); else if (pct <= 0.4) emote("sad", "That was tough. We'll get it next time."); else emote("happy", "Good effort! Let's keep going.");
    },
    chats, setChats: (fn) => setChatsState(fn),
    recommendation, dismissRec: () => setRecommendation(null), skipHours: (h) => setSkew((s) => s + h * HOUR),
    deadlines,
    addDeadline: (title, date, courseId) => setDeadlines((d) => [...d, { id: uid(), title, date, courseId, done: false }].sort((a, b) => a.date.localeCompare(b.date))),
    toggleDeadline: (id) => { setDeadlines((d) => d.map((x) => (x.id === id ? { ...x, done: !x.done } : x))); },
    deleteDeadline: (id) => setDeadlines((d) => d.filter((x) => x.id !== id)),
    activity, streak, todayCount, stats, unlocked, logChat: () => { setCounters((c) => ({ ...c, chats: c.chats + 1 })); logActivity(); },
    notices, notify, markNoticesRead: () => setNotices((n) => n.map((x) => ({ ...x, read: true }))), clearNotices: () => setNotices([]),
    focusEndsAt, startFocus: (m) => { setFocusEndsAt(Date.now() + m * 60_000); emote("say", "Shh. Focus time. I'll be quiet."); },
    stopFocus: () => setFocusEndsAt(null),
    mascotEvent, emote,
    balance, txs,
    walletLive, refreshWallet,
    examPassUntil, buyExamPass,
    spend: (amount, label) => {
      if (walletLive) { flash("Writer sessions move onto your real balance in the next update"); return false; }
      if (amount > balance) return false; setBalance((b) => b - amount); if (amount > 0) setTxs((t) => [{ id: uid(), label, amount: -amount, t: "Just now" }, ...t]); return true;
    },
    topUp: (amount) => {
      if (walletLive) { flash("Use the top-up screen to pay with Paystack"); return; }
      setBalance((b) => b + amount); setTxs((t) => [{ id: uid(), label: "Top up (simulated)", amount, t: "Just now" }, ...t]);
    },
    spendWallet: async (amount, label) => {
      if (!walletLive) return true; // guest/demo balance already deducted by callers via spend()
      try {
        const { data, error } = await createClient().rpc("spend_wallet", { p_amount: amount, p_label: label });
        if (error) throw error;
        if (data) void refreshWallet();
        return !!data;
      } catch { return false; }
    },
    topUpLive: async (amount) => {
      try {
        const r = await fetch("/api/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
        const j = await r.json();
        if (!r.ok) { flash(j.error === "payments_not_configured" ? "Payments aren't set up yet" : "Couldn't start the top-up"); return null; }
        return j.authorization_url as string;
      } catch { flash("Couldn't reach the payment server"); return null; }
    },
    people, contacts, following, convos, blocked,
    addContact: (id) => { setContacts((c) => (c.includes(id) ? c : [...c, id])); emote("happy", "New study buddy!"); },
    removeContact: (id) => setContacts((c) => c.filter((x) => x !== id)),
    toggleFollow: (id) => setFollowing((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    toggleBlock: (id) => { setBlocked((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id])); setContacts((c) => c.filter((x) => x !== id)); setFollowing((f) => f.filter((x) => x !== id)); },
    sendChat: (id, text) => {
      setConvos((c) => ({ ...c, [id]: [...(c[id] ?? []), { id: uid(), from: "me", text, t: nowTime() }] }));
      const p = people.find((x) => x.id === id);
      if (p?.demo) later(() => { setConvos((c) => ({ ...c, [id]: [...(c[id] ?? []), { id: uid(), from: "them", text: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)], t: nowTime() }] })); notify(p.name, "Sent you a message"); }, 1400);
    },
    posts,
    addPost: (p) => { setPosts((ps) => [{ ...p, id: uid(), authorId: meId, createdAt: Date.now(), likes: 0, liked: false }, ...ps]); setCounters((c) => ({ ...c, posts: c.posts + 1 })); logActivity(); emote("love", "You posted! Everyone will love it."); },
    toggleLike: (id) => setPosts((ps) => ps.map((p) => { if (p.id !== id) return p; if (!p.liked) emote("love"); return { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }; })),
    deletePost: (id) => setPosts((ps) => ps.filter((p) => p.id !== id)),
    shared,
    loadSharedDetail,
    sharedRemoteContent,
    loadRemoteCourseContent,
    // Publishes the course for real: a Supabase courses/notes/course_files/recordings snapshot
    // (RLS-gated so only the owner and, once they join, shared_course_members can read it) plus
    // the shared_courses row that makes it discoverable. Everything after this point (new notes,
    // new files, chat) is real and multi-user -- see addNote/addFile/addRec and sendShared below.
    shareCourse: (courseId, description, field, ownerName, school) => {
      const c = coursesRef.current.find((x) => x.id === courseId); if (!c || !userId) return;
      emote("happy", "Sharing is caring!");
      void (async () => {
        await createRemoteCourse(c.id, userId, c.code, c.name, c.color);
        await Promise.all([
          ...c.notes.map((n) => createRemoteNote(n.id, c.id, userId, n.title, n.body)),
          ...c.files.filter((f) => f.storagePath).map((f) => createRemoteFile(c.id, userId, f.name, f.kind, f.storagePath!)),
          ...c.recs.filter((r) => r.storagePath).map((r) => createRemoteRecording(c.id, userId, r.name, r.dur, r.storagePath!)),
        ]);
        const sharedId = await publishSharedCourse(c.id, userId, school, field, description);
        if (!sharedId) return;
        setShared((s) => [{ id: sharedId, ownerId: "me", ownerName, code: c.code, name: c.name, school: school || undefined, field, description, files: c.files.map((f) => f.name), members: ["me"], messages: [], sourceCourseId: c.id }, ...s]);
        patchCourse(courseId, (x) => ({ ...x, sharedId }));
      })();
    },
    joinShared: (id) => {
      const s = shared.find((x) => x.id === id); if (!s) return null;
      setShared((ss) => ss.map((x) => (x.id === id && !x.members.includes("me") ? { ...x, members: [...x.members, "me"] } : x)));
      if (userId) void joinSharedCourse(id, userId);
      const existing = coursesRef.current.find((c) => c.sharedId === id);
      if (existing) return existing.id;
      const cid = uid();
      // Deliberately no local files/notes copy -- CourseView fetches the owner's real, live
      // content (via loadRemoteCourseContent) whenever sourceCourseId is set, instead of a
      // snapshot that would go stale the moment the owner adds something new.
      setCourses((cs) => [...cs, { id: cid, code: s.code, name: s.name, color: COLORS[cs.length % COLORS.length], folderId: null, sharedId: id, sourceCourseId: s.sourceCourseId, notes: [], recs: [], topics: [], files: [] }]);
      return cid;
    },
    leaveShared: (id) => {
      setShared((ss) => ss.map((x) => (x.id === id ? { ...x, members: x.members.filter((m) => m !== "me") } : x)));
      if (userId) void leaveSharedCourse(id, userId);
    },
    sendShared: (id, text) => {
      setShared((ss) => ss.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { id: uid(), authorId: "me", text, t: nowTime() }] } : x)));
      if (userId) void postMessage(id, userId, text);
    },
    personById: (id) => people.find((p) => p.id === id) ?? null,
    demoOn,
    setDemo: (on) => {
      setDemoOn(on);
      if (on) {
        setPeople((p) => [...p, ...DEMO_PEOPLE.filter((d) => !p.some((x) => x.id === d.id))]);
        setPosts((p) => [...p, ...DEMO_POSTS.filter((d) => !p.some((x) => x.id === d.id))]);
        setShared((s) => [...s, ...DEMO_SHARED.filter((d) => !s.some((x) => x.id === d.id))]);
      } else {
        setPeople((p) => p.filter((x) => !x.demo)); setPosts((p) => p.filter((x) => !x.demo)); setShared((s) => s.filter((x) => !x.demo));
        setContacts((c) => c.filter((id) => !DEMO_PEOPLE.some((d) => d.id === id))); setFollowing((f) => f.filter((id) => !DEMO_PEOPLE.some((d) => d.id === id)));
      }
    },
    walletOpen, setWalletOpen, brainOpen, setBrainOpen, overlay, setOverlay, recorderOpen, setRecorderOpen, toast, flash,
    birdieIntent, goBirdie: (i) => { setBirdieIntent(i); setTab("birdie"); }, clearBirdieIntent: () => setBirdieIntent(null),
    studyIntent, goStudy: (i) => { setStudyIntent(i); setTab("study"); }, clearStudyIntent: () => setStudyIntent(null),
    helpIntent, goHelp: (i) => { setHelpIntent(i); setTab("help"); }, clearHelpIntent: () => setHelpIntent(null),
    phone, setPhone, slot, setSlot,
    resetAll: () => {
      try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
      setProfileState(emptyProfile); setSettings(defaultSettings); setCourses([]); setFolders([]); setChatsState({}); setRecommendation(null); setLastRecAt(0); setSkew(0);
      setDeadlines([]); setActivity({}); setCounters({ quizzes: 0, chats: 0, posts: 0 }); setUnlocked([]); setNotices([]); setFocusEndsAt(null);
      setBalance(0); setTxs([]); setPeople([]); setContacts([]); setFollowing([]); setBlocked([]); setConvos({}); setPosts([]); setShared([]); setDemoOn(false);
      setOverlay(null); setTab("study"); setResetKey((k) => k + 1);
    },
    resetKey, ready,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [boot, auth, authOpen, tab, profile, settings, courses, folders, chats, recommendation, deadlines, activity, streak, todayCount, stats, unlocked, notices, focusEndsAt, mascotEvent, balance, txs, people, contacts, following, blocked, convos, posts, shared, demoOn, walletOpen, brainOpen, overlay, recorderOpen, toast, birdieIntent, studyIntent, helpIntent, phone, slot, resetKey, ready, flash, emote, notify, logActivity, walletLive, refreshWallet, examPassUntil, buyExamPass]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function folderPath(folders: Folder[], id: string | null): Folder[] {
  const out: Folder[] = []; let cur = id;
  while (cur) { const f = folders.find((x) => x.id === cur); if (!f) break; out.unshift(f); cur = f.parentId; }
  return out;
}
export const firstName = (p: Profile) => p.name.trim().split(" ")[0] || "there";
