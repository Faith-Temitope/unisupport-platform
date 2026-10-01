// Thin installable shell around the real staff app, branded as its own app so writers can install
// just this with its own name/icon. Same live Supabase-backed page as /prototype/live/staff and
// /desk-app -- the page itself detects writer vs support/admin by the signed-in account's role.
export { default } from "../prototype/live/staff/page";
