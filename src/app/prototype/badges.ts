export interface Stats { notes: number; courses: number; recs: number; quizzes: number; streak: number; posts: number; contacts: number; chats: number; files: number }
export interface Badge { id: string; emoji: string; label: string; desc: string; test: (s: Stats) => boolean; /** What it counts and how many it needs (for progress). */ key: keyof Stats; goal: number; unit: string }

export const BADGES: Badge[] = [
  { id: "first-course", emoji: "📘", label: "First course", desc: "Create your first course", key: "courses", goal: 1, unit: "course", test: (s) => s.courses >= 1 },
  { id: "first-note", emoji: "📝", label: "Note taker", desc: "Write your first note", key: "notes", goal: 1, unit: "note", test: (s) => s.notes >= 1 },
  { id: "ten-notes", emoji: "🗂️", label: "Well organised", desc: "Keep 10 notes", key: "notes", goal: 10, unit: "note", test: (s) => s.notes >= 10 },
  { id: "first-quiz", emoji: "🎯", label: "Quiz taker", desc: "Finish your first quiz", key: "quizzes", goal: 1, unit: "quiz", test: (s) => s.quizzes >= 1 },
  { id: "five-quizzes", emoji: "🧠", label: "Sharp mind", desc: "Finish 5 quizzes", key: "quizzes", goal: 5, unit: "quiz", test: (s) => s.quizzes >= 5 },
  { id: "first-record", emoji: "🎙️", label: "In the lecture", desc: "Record a lecture", key: "recs", goal: 1, unit: "recording", test: (s) => s.recs >= 1 },
  { id: "ask-birdie", emoji: "💬", label: "Curious", desc: "Ask Birdie 10 questions", key: "chats", goal: 10, unit: "question", test: (s) => s.chats >= 10 },
  { id: "streak-3", emoji: "🔥", label: "On a roll", desc: "3 day study streak", key: "streak", goal: 3, unit: "day", test: (s) => s.streak >= 3 },
  { id: "streak-7", emoji: "⚡", label: "Unstoppable", desc: "7 day study streak", key: "streak", goal: 7, unit: "day", test: (s) => s.streak >= 7 },
  { id: "first-post", emoji: "📣", label: "Sharing is caring", desc: "Post to Explore", key: "posts", goal: 1, unit: "post", test: (s) => s.posts >= 1 },
  { id: "friend", emoji: "🤝", label: "Study buddy", desc: "Add someone to chat with", key: "contacts", goal: 1, unit: "contact", test: (s) => s.contacts >= 1 },
];

export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString("en-CA");

export function streakOf(activity: Record<string, number>, now = Date.now()) {
  let n = 0;
  let d = now;
  if (!activity[dayKey(d)]) d -= 86400_000; // today not done yet: streak still alive through yesterday
  while (activity[dayKey(d)]) { n++; d -= 86400_000; }
  return n;
}
