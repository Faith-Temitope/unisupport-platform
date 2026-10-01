// Thin installable shell around the real staff app, branded as its own app so help desk agents
// can install just this (not the whole combined codebase) with its own name/icon. Same live
// Supabase-backed page as /prototype/live/staff and /writer-app -- the page itself detects
// support/admin vs writer by the signed-in account's role, this route exists only for branding.
export { default } from "../prototype/live/staff/page";
