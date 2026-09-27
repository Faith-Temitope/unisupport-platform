// Opt-in DEMO community (off by default). It exists only so you can try the social features
// (follow, chat, shared-course chat) without other real users. Nothing here is part of the real app.
// The video clip is a bundled public sample file standing in for student uploads.
import type { Person, Post, SharedCourse } from "./store";

const G = ["from-[#7C4DDB] to-[#3b1f7a]", "from-[#A63FBD] to-[#5a1c6b]", "from-[#4C6EF5] to-[#1f3a9e]", "from-[#D9467E] to-[#7a1d42]"];
const VIDS = ["/demo/clip.mp4", "/demo/clip.mp4", "/demo/clip.mp4", "/demo/clip.mp4"]; // one bundled CC-BY sample clip (Big Buck Bunny, (c) Blender Foundation)

export const DEMO_PEOPLE: Person[] = [
  { id: "d-ada", name: "Ada Nwosu", handle: "ada.codes", field: "Computer Science", bio: "300L CS. I explain data structures the way I wish they were explained to me.", color: "#7C4DDB", demo: true },
  { id: "d-kel", name: "Kelechi Mba", handle: "kelechi.maths", field: "Maths", bio: "Maths tutor. Linear algebra without the fear.", color: "#4C6EF5", demo: true },
  { id: "d-ife", name: "Ifeoma Eze", handle: "ife.nursing", field: "Nursing", bio: "Nursing student. Clinical tips and exam prep.", color: "#D9467E", demo: true },
  { id: "d-fem", name: "Femi Ojo", handle: "femi.law", field: "Law", bio: "Law school. Case notes that actually stick.", color: "#1B8A85", demo: true },
];

export const DEMO_REPLIES = ["Thanks for reaching out! Happy to help where I can.", "Good question. Let me think about that and get back to you.", "Yes, I've got notes on that. I'll share them in the course.", "Sounds good. Let's go through it together this weekend."];

export const DEMO_POSTS: Post[] = [
  { id: "p1", authorId: "d-ada", kind: "video", title: "Recursion and the call stack, explained", videoUrl: VIDS[0], field: "Computer Science", tags: ["recursion", "data structures"], dur: "0:10", grad: G[0], createdAt: Date.now() - 3 * 3600_000, likes: 42, liked: false, demo: true },
  { id: "p2", authorId: "d-kel", kind: "video", title: "Eigenvalues in one picture", videoUrl: VIDS[1], field: "Maths", tags: ["eigenvalues", "linear algebra"], dur: "0:10", grad: G[2], createdAt: Date.now() - 8 * 3600_000, likes: 87, liked: false, demo: true },
  { id: "p3", authorId: "d-ife", kind: "text", title: "3 mistakes to avoid in dosage calculations", body: "1. Not converting units first. 2. Mixing up dose on hand and dose ordered. 3. Skipping the sanity check: does the answer make clinical sense?", field: "Nursing", tags: ["dosage", "nursing"], grad: G[3], createdAt: Date.now() - 20 * 3600_000, likes: 31, liked: false, demo: true },
  { id: "p4", authorId: "d-fem", kind: "video", title: "Offer, acceptance, consideration", videoUrl: VIDS[2], field: "Law", tags: ["contracts", "law"], dur: "0:10", grad: G[1], createdAt: Date.now() - 30 * 3600_000, likes: 19, liked: false, demo: true },
];

export const DEMO_SHARED: SharedCourse[] = [
  { id: "s-csc", ownerId: "d-ada", code: "CSC 305", name: "Data Structures", school: "Demo University", field: "Computer Science", description: "Slides, lab manual and past questions for the whole class.", files: ["Slide deck.pdf", "Lab manual.pdf", "Past questions.pdf"], members: ["d-ada", "d-kel"], demo: true,
    messages: [{ id: "m1", authorId: "d-ada", text: "Uploaded the lab manual. Test is next Friday.", t: "09:12" }, { id: "m2", authorId: "d-kel", text: "Thanks! Does anyone have the trees slides?", t: "09:20" }] },
  { id: "s-mth", ownerId: "d-kel", code: "MTH 201", name: "Linear Algebra", school: "Demo University", field: "Maths", description: "Tutorial sheets and worked solutions.", files: ["Tutorial sheets.pdf", "Solutions.pdf"], members: ["d-kel", "d-ife"], demo: true, messages: [] },
];
