"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { recommend, type Recommendation } from "./engine";
import {
  createRemoteFile, createRemoteNote, createRemoteRecording,
  deleteRemoteFile, deleteRemoteNote, deleteRemoteRecording,
  leaveSharedCourse, listMessages, postMessage, publishSharedCourse,
  fetchRemoteCourseContent, listPublishedSharedWithCounts,
  syncCourseForSharing, setSharedItems, getSharedItems, updateSharedSettings, buySharedCourse, type ShareItem,
} from "./live/sharedData";
import { logEvent } from "./live/analyticsData";
import { fetchMyRep } from "./live/repData";
import { createPost, deletePostRemote, fetchChannels, fetchFeed, fetchLikedPosts, fetchMyFollowing, fetchPostsBy, fetchPostsByIds, pinPost, setFollow, setLike, upsertMyChannel, type Channel, type FeedPost, type Link } from "./live/socialData";
import { clearViewState, useViewState } from "./persist";
import { fetchForYou, fetchMyTopics, logPostEvent, type Ranked } from "./live/recData";
import { DEMO_PEOPLE, DEMO_POSTS, DEMO_SHARED, DEMO_REPLIES } from "./demo";
import { BADGES, dayKey, streakOf, type Stats } from "./badges";

export type TabId = "study" | "explore" | "birdie" | "help";
export type AuthStatus = "loading" | "out" | "guest" | "in";
export type Boot = "splash" | "word" | "done";
export type Emote = "happy" | "sad" | "love" | "say" | "angry";

export interface FileItem { id: string; name: string; kind: "pdf" | "img" | "slides" | "notes" | "link" | "text"; size: number; added: string; text?: string; url?: string; storagePath?: string; category?: string }
export interface Note { id: string; title: string; body: string; date: string; category?: string }
/** Local ids of the notes/files/recordings an owner chose to include in a shared listing. */
export type Picked = { notes: string[]; files: string[]; recs: string[] };
export interface Rec { id: string; name: string; dur: number; date: string; url?: string; text?: string; transcribing?: boolean; storagePath?: string }
export interface Topic { name: string; mastery: number }
export interface Course { id: string; code: string; name: string; color: string; folderId: string | null; files: FileItem[]; notes: Note[]; recs: Rec[]; topics: Topic[]; sharedId?: string; sourceCourseId?: string }
export interface Folder { id: string; name: string; parentId: string | null }
export interface Tx { id: string; label: string; amount: number; t: string }
export interface Deadline { id: string; title: string; date: string; courseId: string | null; done: boolean }
export interface Notice { id: string; title: string; body?: string; t: string; read: boolean }

export interface BAction { label: string; run: "note" | "file" | "test" | "writer" | "study" | "topup" | "spark" | "brain"; payload?: string }
export interface BMsg { id: string; from: "me" | "bird"; text: string; cite?: string; cards?: { q: string; a: string }[]; actions?: BAction[]; done?: boolean; t: string; at: number; meta?: string }

export interface Person { id: string; name: string; handle: string; field: string; bio: string; color: string; demo?: boolean; links?: Link[]; school?: string; country?: string }
export type Audience = "everyone" | "country" | "region" | "school";
export interface CMsg { id: string; from: "me" | "them"; text: string; t: string; author?: string }
export interface Post { id: string; authorId: string; kind: "video" | "text"; title: string; body?: string; videoUrl?: string; videoPath?: string; youtubeId?: string; sourceName?: string; pinnedAt?: number; field: string; tags: string[]; dur?: string; grad: string; createdAt: number; likes: number; liked: boolean; comments?: number; demo?: boolean; remote?: boolean }
export type PrintIntent = { kind: "print" | "handwrite" | "orders"; file?: { name: string; path: string } };
export type NewPost ={ kind: "video" | "text"; title: string; body?: string; field: string; tags: string[]; durationSeconds?: number; file?: File };
export interface SharedCourse { id: string; ownerId: string; ownerName?: string; code: string; name: string; school?: string; field: string; description: string; files: string[]; members: string[]; messages: { id: string; authorId: string; text: string; t: string }[]; demo?: boolean; sourceCourseId?: string; priceNgn?: number; itemCounts?: { notes: number; files: number; recs: number } }

export interface Profile { name: string; handle: string; level: string; program: string; institution: string; country: string; region?: string; links?: Link[]; bio: string; onboarded: boolean }
export interface Settings {
  autoplay: boolean; personalTags: boolean; recs12h: boolean; readAloud: boolean; answerLength: "short" | "normal" | "detailed";
  notifChat: boolean; notifRec: boolean; notifSession: boolean; notifExplore: boolean;
  dyslexia: boolean; textSize: "s" | "m" | "l"; reduceMotion: boolean;
  theme: "light" | "dark" | "system"; accent: "purple" | "blue" | "green" | "orange" | "pink";
  calendar: boolean; schoolApps: boolean; offline: boolean; dataSaver: boolean;
  profileVisibility: "everyone" | "followers" | "private"; whoCanChat: "everyone" | "contacts"; recordReminder: boolean; twoFactor: boolean;
  aiBrain: "spark" | "nova" | "sage"; aiTier: "quick" | "balanced" | "deep";
  mascotOn: boolean; mascotChatty: boolean; dailyGoal: number;
}
export type Overlay = null | { t: "chats" } | { t: "thread"; id: string } | { t: "settings" } | { t: "profile"; id: string } | { t: "source"; name: string } | { t: "post" };
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
  theme: "system", accent: "purple",
  calendar: false, schoolApps: false, offline: false, dataSaver: false,
  profileVisibility: "everyone", whoCanChat: "everyone", recordReminder: true, twoFactor: false,
  aiBrain: "spark", aiTier: "balanced",
  mascotOn: true, mascotChatty: true, dailyGoal: 3,
};
const emptyProfile: Profile = { name: "", handle: "", level: "", program: "", institution: "", country: "", region: "", links: [], bio: "", onboarded: false };
const GRAD = "from-[#7C4DDB] to-[#3b1f7a]";
const fmtDur = (s?: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : undefined);
const channelToPerson = (c: Channel): Person => ({ id: c.id, name: c.display_name || c.handle || "Student", handle: c.handle ?? "", field: c.program ?? "", bio: c.bio, color: c.color, links: c.links ?? [], school: c.school ?? undefined, country: c.country ?? undefined });

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
  addNote: (courseId: string, title: string, body: string, category?: string) => void; deleteNote: (courseId: string, noteId: string) => void;
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
  examPassUntil: string | null; buyExamPass: () => Promise<{ ok: boolean; error?: string }>; refreshExamPass: () => Promise<void>;
  isRep: boolean; refreshRep: () => Promise<void>;
  people: Person[]; contacts: string[]; following: string[]; convos: Record<string, CMsg[]>; blocked: string[];
  addContact: (id: string) => void; removeContact: (id: string) => void; toggleFollow: (id: string) => void; sendChat: (id: string, text: string) => void; toggleBlock: (id: string) => void;
  posts: Post[]; addPost: (p: NewPost) => Promise<string | null>; toggleLike: (id: string) => void; deletePost: (id: string) => void;
  refreshFeed: () => Promise<void>; loadMoreFeed: () => Promise<number>; searchFeed: (term: string) => Promise<void>; loadChannel: (id: string) => Promise<void>;
  /** For you: post ids ranked by the Birdie algorithm, with why each was picked. */
  forYou: Ranked[]; loadForYou: (reset: boolean) => Promise<number>; topics: { topic: string; mine: boolean }[]; refreshTopics: () => Promise<void>;
  loadPostsByIds: (ids: string[]) => Promise<void>; loadLiked: () => Promise<string[]>; setPinned: (id: string, on: boolean) => Promise<string | null>;
  saveProfile: (p: Profile) => Promise<string | null>;
  shared: SharedCourse[];
  shareCourse: (courseId: string, info: { description: string; field: string; ownerName: string; school: string; priceNgn: number; audience: Audience; audienceValue: string | null }, picked: Picked) => Promise<string | null>;
  getSharing: (courseId: string) => Promise<{ priceNgn: number; picked: Picked; audience: Audience } | null>;
  updateSharing: (courseId: string, priceNgn: number, picked: Picked, audience: Audience, audienceValue: string | null) => Promise<string | null>;
  sharedIntent: string | null; openShared: (id: string) => void; clearSharedIntent: () => void;
  printIntent: PrintIntent | null; openPrint: (i: PrintIntent) => void; closePrint: () => void;
  barsHidden: boolean; setBarsHidden: (b: boolean) => void;
  /** The video playing now: full watch page, or minimized to a bar that keeps playing. */
  watching: { id: string; mini: boolean } | null; watch: (id: string) => void; minimizeWatch: () => void; closeWatch: () => void;
  joinShared: (id: string) => Promise<{ courseId?: string; error?: string }>; sendShared: (id: string, text: string) => void; leaveShared: (id: string) => void;
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

/** Picked local items -> shared_course_items rows. Notes share their id with the remote row;
 * files and recordings are matched to theirs by storage path (anything never uploaded is skipped). */
function toShareItems(c: Course, picked: Picked, maps: { fileIdByPath: Record<string, string>; recIdByPath: Record<string, string> }): ShareItem[] {
  const out: ShareItem[] = picked.notes.filter((id) => c.notes.some((n) => n.id === id)).map((id) => ({ item_type: "note", item_id: id }));
  for (const f of c.files) if (picked.files.includes(f.id) && f.storagePath && maps.fileIdByPath[f.storagePath]) out.push({ item_type: "file", item_id: maps.fileIdByPath[f.storagePath] });
  for (const r of c.recs) if (picked.recs.includes(r.id) && r.storagePath && maps.recIdByPath[r.storagePath]) out.push({ item_type: "recording", item_id: maps.recIdByPath[r.storagePath] });
  return out;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Boot>("splash");
  const [auth, setAuth] = useState<{ status: AuthStatus; email?: string; userId?: string }>({ status: "loading" });
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTabState] = useViewState<TabId>("tab", "study");
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
  const [overlay, setOverlayState] = useViewState<Overlay>("overlay", null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [birdieIntent, setBirdieIntent] = useState<AppCtx["birdieIntent"]>(null);
  const [studyIntent, setStudyIntent] = useState<AppCtx["studyIntent"]>(null);
  const [helpIntent, setHelpIntent] = useState<AppCtx["helpIntent"]>(null);
  const [sharedIntent, setSharedIntent] = useState<string | null>(null);
  const [printIntent, setPrintIntent] = useState<PrintIntent | null>(null);
  const [barsHidden, setBarsHidden] = useState(false);
  // Changing screen always brings the bottom nav back.
  const setTab = useCallback((t: TabId) => { setBarsHidden(false); setTabState(t); }, [setTabState]);
  const setOverlay = useCallback((o: Overlay) => { setBarsHidden(false); setOverlayState(o); }, [setOverlayState]);
  const [watching, setWatching] = useViewState<{ id: string; mini: boolean } | null>("watching", null);
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
  // Active course reps get unlimited AI (the chat route checks this server-side too).
  const [isRep, setIsRep] = useState(false);
  const refreshRep = useCallback(async () => { const r = await fetchMyRep(); setIsRep(r?.status === "active"); }, []);
  useEffect(() => { void (auth.status === "in" ? refreshRep() : Promise.resolve().then(() => setIsRep(false))); }, [auth.status, refreshRep]);
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
    const { list, membersBySharedId, fileNamesByCourseId, messageCountBySharedId, itemCountsBySharedId } = await listPublishedSharedWithCounts();
    const myId = auth.userId;
    void messageCountBySharedId; // counts fold into `members`/`files` below; message count itself shown once loadSharedDetail runs
    setShared((prev): SharedCourse[] => list.map((sc): SharedCourse => {
      const members = (membersBySharedId[sc.id] ?? []).map((m) => (m === myId ? "me" : m));
      const prior = prev.find((p) => p.id === sc.id);
      return {
        id: sc.id, ownerId: sc.owner_id === myId ? "me" : sc.owner_id, ownerName: prior?.ownerName,
        code: sc.course_code || sc.courses?.code || "?", name: sc.course_name || sc.courses?.name || "Untitled course", school: sc.school ?? undefined,
        field: sc.field, description: sc.description, files: fileNamesByCourseId[sc.source_course_id] ?? [],
        members, messages: prior?.messages ?? [], sourceCourseId: sc.source_course_id,
        priceNgn: Number(sc.price_ngn ?? 0), itemCounts: itemCountsBySharedId[sc.id] ?? { notes: 0, files: 0, recs: 0 },
      };
    }).concat(prev.filter((p) => p.demo))); // keep any explicit demo-mode entries alongside the real list
  }, [auth.userId]);
  useEffect(() => { if (auth.status === "in") void loadSharedList(); }, [auth.status, loadSharedList]);

  // ---------- real Explore social layer (signed-in users): posts, likes, follows, channels ----------
  // Remote rows are mapped onto the same Post/Person shapes the UI already uses; the signed-in
  // user's own id becomes "me", like everywhere else. Demo entries (Settings > demo) stay local.
  const ingestChannels = useCallback((chs: Channel[]) => {
    const myId = auth.userId;
    const others = chs.filter((c) => c.id !== myId).map(channelToPerson);
    if (others.length) setPeople((ps) => [...ps.filter((p) => !others.some((o) => o.id === p.id)), ...others]);
  }, [auth.userId]);
  const toPost = useCallback((r: FeedPost): Post => ({
    id: r.id, authorId: r.author_id === auth.userId ? "me" : r.author_id, kind: r.kind, title: r.title, body: r.body ?? undefined,
    videoUrl: r.videoUrl, videoPath: r.video_path ?? undefined, youtubeId: r.youtube_id ?? undefined, sourceName: r.source_name ?? undefined, pinnedAt: r.pinned_at ? Date.parse(r.pinned_at) : undefined, field: r.field ?? "", tags: r.tags, dur: fmtDur(r.duration_seconds), grad: GRAD,
    createdAt: Date.parse(r.created_at), likes: r.likes, liked: r.liked, comments: r.comment_count ?? 0, remote: true,
  }), [auth.userId]);
  const ingestPosts = useCallback(async (rows: FeedPost[], replaceAll: boolean) => {
    const mapped = rows.map(toPost);
    setPosts((ps) => replaceAll
      ? [...mapped, ...ps.filter((p) => p.demo)]
      : [...ps.filter((p) => !mapped.some((m) => m.id === p.id)), ...mapped].sort((a, b) => b.createdAt - a.createdAt));
    ingestChannels(await fetchChannels(Array.from(new Set(rows.map((r) => r.author_id)))));
  }, [toPost, ingestChannels]);
  const refreshFeed = useCallback(async () => {
    if (auth.status !== "in") return;
    try { await ingestPosts(await fetchFeed(auth.userId), true); } catch { /* keep what we have */ }
  }, [auth.status, auth.userId, ingestPosts]);
  const postsRef = useRef<Post[]>([]);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  // Next page, older than the oldest real post loaded so far. Returns how many came back (0 = end).
  const loadMoreFeed = useCallback(async () => {
    if (auth.status !== "in") return 0;
    const oldest = postsRef.current.filter((p) => p.remote).reduce((m, p) => Math.min(m, p.createdAt), Infinity);
    if (!Number.isFinite(oldest)) return 0;
    const rows = await fetchFeed(auth.userId, { before: new Date(oldest).toISOString() });
    await ingestPosts(rows, false);
    return rows.length;
  }, [auth.status, auth.userId, ingestPosts]);
  // Loads specific posts (a playlist, the liked list) into the shared list so likes etc. stay in sync.
  const loadPostsByIds = useCallback(async (ids: string[]) => {
    if (auth.status !== "in" || !ids.length) return;
    await ingestPosts(await fetchPostsByIds(ids, auth.userId), false);
  }, [auth.status, auth.userId, ingestPosts]);
  const loadLiked = useCallback(async (): Promise<string[]> => {
    if (auth.status !== "in" || !auth.userId) return [];
    const rows = await fetchLikedPosts(auth.userId);
    await ingestPosts(rows, false);
    return rows.map((r) => r.id);
  }, [auth.status, auth.userId, ingestPosts]);
  const setPinned = useCallback(async (id: string, on: boolean): Promise<string | null> => {
    const err = await pinPost(id, on);
    if (!err) setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, pinnedAt: on ? Date.now() : undefined } : p)));
    return err;
  }, []);
  // Pulls matches for a search/tag from the server, so results aren't limited to what's loaded.
  const [forYou, setForYou] = useState<Ranked[]>([]);
  const forYouRef = useRef<Ranked[]>([]);
  const seedRef = useRef("");
  const loadForYou = useCallback(async (reset: boolean) => {
    if (auth.status !== "in") return 0;
    if (reset || !seedRef.current) seedRef.current = Math.random().toString(36).slice(2, 10);
    const offset = reset ? 0 : forYouRef.current.length;
    const rows = await fetchForYou(seedRef.current, offset);
    const have = new Set(postsRef.current.map((p) => p.id));
    const missing = rows.filter((r) => !have.has(r.id)).map((r) => r.id);
    if (missing.length) await ingestPosts(await fetchPostsByIds(missing, auth.userId), false);
    const next = reset ? rows : [...forYouRef.current, ...rows.filter((r) => !forYouRef.current.some((x) => x.id === r.id))];
    forYouRef.current = next; setForYou(next);
    return rows.length;
  }, [auth.status, auth.userId, ingestPosts]);
  const [topics, setTopics] = useState<{ topic: string; mine: boolean }[]>([]);
  const refreshTopics = useCallback(async () => {
    if (auth.status !== "in") return;
    const t = await fetchMyTopics();
    if (t.length) setTopics(t);
  }, [auth.status]);
  const searchFeed = useCallback(async (term: string) => {
    if (auth.status !== "in" || term.trim().length < 2) return;
    try { await ingestPosts(await fetchFeed(auth.userId, { term, limit: 60 }), false); } catch { /* keep what we have */ }
  }, [auth.status, auth.userId, ingestPosts]);
  const loadChannel = useCallback(async (id: string) => {
    if (auth.status !== "in" || id === "me" || people.find((p) => p.id === id)?.demo) return;
    try {
      const [chs, rows] = await Promise.all([fetchChannels([id]), fetchPostsBy(id, auth.userId)]);
      ingestChannels(chs);
      await ingestPosts(rows, false);
    } catch { /* keep what we have */ }
  }, [auth.status, auth.userId, people, ingestChannels, ingestPosts]);
  useEffect(() => {
    if (auth.status !== "in" || !auth.userId) return;
    void refreshFeed();
    void fetchMyFollowing(auth.userId).then((ids) => setFollowing((f) => Array.from(new Set([...f.filter((x) => people.find((p) => p.id === x)?.demo), ...ids]))));
  }, [auth.status, auth.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // The public channel mirrors the profile's public fields. Background sync covers onboarding and
  // other devices; if the chosen handle is taken it still saves everything else (handle left
  // empty) so school/country -- which gate audience-limited shared courses -- are never lost.
  const channelFields = (p: Profile) => ({
    handle: p.handle || null, display_name: p.name, bio: p.bio, links: p.links ?? [],
    school: p.institution || null, country: p.country || null, region: p.region || null, program: p.program || null,
  });
  useEffect(() => {
    if (auth.status !== "in" || !auth.userId || !profile.onboarded) return;
    const uidNow = auth.userId;
    const t = setTimeout(async () => {
      const err = await upsertMyChannel(uidNow, channelFields(profile));
      if (err === "handle_taken") await upsertMyChannel(uidNow, { ...channelFields(profile), handle: null });
    }, 1500);
    return () => clearTimeout(t);
  }, [auth.status, auth.userId, profile]);

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
        notes: notes.map((n) => ({ id: n.id, title: n.title, body: n.body, category: n.category ?? undefined, date: new Date(n.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) })),
        files: files.map((f) => ({ id: f.id, name: f.name, kind: f.kind as FileItem["kind"], size: 0, category: f.category ?? undefined, added: new Date(f.created_at).toLocaleDateString([], { month: "short", day: "numeric" }), storagePath: f.storage_path ?? undefined })),
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
    addNote: (courseId, title, body, category) => {
      const id = crypto.randomUUID();
      patchCourse(courseId, (c) => ({ ...c, notes: [{ id, title, body, category, date: dateLabel() }, ...c.notes] }));
      logActivity(); emote("happy", "Nice note! I'll remember that.");
      if (coursesRef.current.find((c) => c.id === courseId)?.sharedId && userId) void createRemoteNote(id, courseId, userId, title, body, category);
    },
    deleteNote: (courseId, noteId) => {
      patchCourse(courseId, (c) => ({ ...c, notes: c.notes.filter((n) => n.id !== noteId) })); emote("sad", "Was that note important?");
      if (coursesRef.current.find((c) => c.id === courseId)?.sharedId) void deleteRemoteNote(noteId);
    },
    addFile: (courseId, f) => {
      patchCourse(courseId, (c) => ({ ...c, files: [{ ...f, id: uid(), added: dateLabel() }, ...c.files] })); logActivity();
      if (coursesRef.current.find((c) => c.id === courseId)?.sharedId && userId && f.storagePath) void createRemoteFile(courseId, userId, f.name, f.kind, f.storagePath, f.category);
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
    examPassUntil, buyExamPass, refreshExamPass, isRep, refreshRep,
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
    toggleFollow: (id) => {
      const on = !following.includes(id);
      setFollowing((f) => (on ? [...f, id] : f.filter((x) => x !== id)));
      if (userId && !people.find((p) => p.id === id)?.demo) void setFollow(userId, id, on);
    },
    toggleBlock: (id) => { setBlocked((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id])); setContacts((c) => c.filter((x) => x !== id)); setFollowing((f) => f.filter((x) => x !== id)); },
    sendChat: (id, text) => {
      setConvos((c) => ({ ...c, [id]: [...(c[id] ?? []), { id: uid(), from: "me", text, t: nowTime() }] }));
      const p = people.find((x) => x.id === id);
      if (p?.demo) later(() => { setConvos((c) => ({ ...c, [id]: [...(c[id] ?? []), { id: uid(), from: "them", text: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)], t: nowTime() }] })); notify(p.name, "Sent you a message"); }, 1400);
    },
    posts,
    // Signed in: uploads the video and saves the post for everyone. Guests keep a local-only post.
    addPost: async (p) => {
      let post: Post;
      if (userId) {
        const r = await createPost(userId, p);
        if (r.error || !r.post) return r.error ?? "Couldn't post";
        post = toPost(r.post);
      } else {
        post = { id: uid(), authorId: meId, kind: p.kind, title: p.title, body: p.body, videoUrl: p.file ? URL.createObjectURL(p.file) : undefined, field: p.field, tags: p.tags, dur: fmtDur(p.durationSeconds), grad: GRAD, createdAt: Date.now(), likes: 0, liked: false };
      }
      setPosts((ps) => [post, ...ps]); setCounters((c) => ({ ...c, posts: c.posts + 1 })); logActivity(); emote("love", "You posted! Everyone will love it.");
      return null;
    },
    toggleLike: (id) => {
      const target = posts.find((p) => p.id === id); if (!target) return;
      if (!target.liked) emote("love");
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
      if (target.remote && userId) { void setLike(id, userId, !target.liked); void logPostEvent(id, target.liked ? "unlike" : "like"); }
    },
    deletePost: (id) => {
      const target = posts.find((p) => p.id === id);
      setPosts((ps) => ps.filter((p) => p.id !== id));
      if (target?.remote) void deletePostRemote(id, target.videoPath);
    },
    refreshFeed, loadMoreFeed, searchFeed, loadChannel, loadPostsByIds, loadLiked, setPinned,
    saveProfile: async (p) => {
      if (userId) {
        const err = await upsertMyChannel(userId, channelFields(p));
        if (err) return err;
      }
      setProfileState(p);
      return null;
    },
    sharedIntent, openShared: (id) => { setSharedIntent(id); setTab("explore"); }, clearSharedIntent: () => setSharedIntent(null),
    printIntent, openPrint: (i) => setPrintIntent(i), closePrint: () => setPrintIntent(null),
    barsHidden, setBarsHidden,
    forYou, loadForYou, topics, refreshTopics,
    watching, watch: (id) => setWatching({ id, mini: false }), minimizeWatch: () => setWatching((w) => (w ? { ...w, mini: true } : w)), closeWatch: () => setWatching(null),
    shared,
    loadSharedDetail,
    sharedRemoteContent,
    loadRemoteCourseContent,
    // Publishes the course for real: a Supabase courses/notes/course_files/recordings snapshot
    // (RLS-gated so only the owner and, once they join, shared_course_members can read it) plus
    // the shared_courses row that makes it discoverable. Everything after this point (new notes,
    // new files, chat) is real and multi-user -- see addNote/addFile/addRec and sendShared below.
    // Publishes for real: syncs the course to Supabase, creates the listing, then records exactly
    // which items the owner ticked -- members (free or paid) only ever see those. Anything added
    // to the course later stays private until the owner adds it via updateSharing.
    shareCourse: async (courseId, info, picked) => {
      const c = coursesRef.current.find((x) => x.id === courseId);
      if (!c || !userId) return "Sign in to share a course";
      const maps = await syncCourseForSharing(c, userId);
      const sharedId = await publishSharedCourse(c.id, userId, info.school, info.field, info.description, info.priceNgn, info.audience, info.audienceValue, c.code, c.name);
      if (!sharedId) return "Couldn't publish the course";
      const err = await setSharedItems(sharedId, toShareItems(c, picked, maps));
      if (err) return err;
      emote("happy", "Sharing is caring!");
      setShared((s) => [{ id: sharedId, ownerId: "me", ownerName: info.ownerName, code: c.code, name: c.name, school: info.school || undefined, field: info.field, description: info.description, files: [], members: [], messages: [], sourceCourseId: c.id, priceNgn: info.priceNgn, itemCounts: { notes: picked.notes.length, files: picked.files.length, recs: picked.recs.length } }, ...s]);
      patchCourse(courseId, (x) => ({ ...x, sharedId }));
      return null;
    },
    getSharing: async (courseId) => {
      const c = coursesRef.current.find((x) => x.id === courseId);
      if (!c?.sharedId || !userId) return null;
      const [maps, items, price] = await Promise.all([syncCourseForSharing(c, userId), getSharedItems(c.sharedId), createClient().from("shared_courses").select("price_ngn,audience").eq("id", c.sharedId).maybeSingle()]);
      const pathById = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([p, id]) => [id, p]));
      const filePath = pathById(maps.fileIdByPath), recPath = pathById(maps.recIdByPath);
      const pick = (t: ShareItem["item_type"]) => new Set(items.filter((i) => i.item_type === t).map((i) => i.item_id));
      const pn = pick("note"), pf = new Set(Array.from(pick("file")).map((id) => filePath[id])), pr = new Set(Array.from(pick("recording")).map((id) => recPath[id]));
      return {
        priceNgn: Number(price.data?.price_ngn ?? 0), audience: (price.data?.audience as Audience) ?? "everyone",
        picked: { notes: c.notes.filter((n) => pn.has(n.id)).map((n) => n.id), files: c.files.filter((f) => f.storagePath && pf.has(f.storagePath)).map((f) => f.id), recs: c.recs.filter((r) => r.storagePath && pr.has(r.storagePath)).map((r) => r.id) },
      };
    },
    updateSharing: async (courseId, priceNgn, picked, audience, audienceValue) => {
      const c = coursesRef.current.find((x) => x.id === courseId);
      if (!c?.sharedId || !userId) return "This course isn't shared";
      const maps = await syncCourseForSharing(c, userId);
      const err = (await updateSharedSettings(c.sharedId, priceNgn, audience, audienceValue, c.code, c.name)) ?? (await setSharedItems(c.sharedId, toShareItems(c, picked, maps)));
      if (err) return err;
      setShared((ss) => ss.map((x) => (x.id === c.sharedId ? { ...x, priceNgn, itemCounts: { notes: picked.notes.length, files: picked.files.length, recs: picked.recs.length } } : x)));
      return null;
    },
    // One path for free and paid: the server charges (if priced), pays the owner, then adds the
    // membership. Membership is only shown locally once the server says it went through.
    joinShared: async (id) => {
      const s = shared.find((x) => x.id === id); if (!s) return { error: "not_found" };
      if (!userId) return { error: "sign_in_required" };
      const err = await buySharedCourse(id);
      if (err) return { error: err };
      setShared((ss) => ss.map((x) => (x.id === id && !x.members.includes("me") ? { ...x, members: [...x.members, "me"] } : x)));
      if (s.priceNgn) void refreshWallet();
      const existing = coursesRef.current.find((c) => c.sharedId === id);
      if (existing) return { courseId: existing.id };
      const cid = uid();
      // Deliberately no local files/notes copy -- CourseView fetches the owner's real, live
      // content (via loadRemoteCourseContent) whenever sourceCourseId is set, instead of a
      // snapshot that would go stale the moment the owner adds something new.
      setCourses((cs) => [...cs, { id: cid, code: s.code, name: s.name, color: COLORS[cs.length % COLORS.length], folderId: null, sharedId: id, sourceCourseId: s.sourceCourseId, notes: [], recs: [], topics: [], files: [] }]);
      return { courseId: cid };
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
      clearViewState(); setOverlay(null); setWatching(null); setTab("study"); setResetKey((k) => k + 1);
    },
    resetKey, ready,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [boot, auth, authOpen, tab, profile, settings, courses, folders, chats, recommendation, deadlines, activity, streak, todayCount, stats, unlocked, notices, focusEndsAt, mascotEvent, balance, txs, people, contacts, following, blocked, convos, posts, shared, demoOn, walletOpen, brainOpen, overlay, recorderOpen, toast, birdieIntent, studyIntent, helpIntent, phone, slot, resetKey, ready, flash, emote, notify, logActivity, walletLive, refreshWallet, examPassUntil, buyExamPass, refreshExamPass, isRep, refreshRep, sharedIntent, printIntent, barsHidden, watching, forYou, loadForYou, topics, refreshTopics, refreshFeed, loadMoreFeed, searchFeed, loadChannel, loadPostsByIds, loadLiked, setPinned, toPost]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function folderPath(folders: Folder[], id: string | null): Folder[] {
  const out: Folder[] = []; let cur = id;
  while (cur) { const f = folders.find((x) => x.id === cur); if (!f) break; out.unshift(f); cur = f.parentId; }
  return out;
}
export const firstName = (p: Profile) => p.name.trim().split(" ")[0] || "there";
