"use client";

// Sponsor certificate courses: lessons, a server-graded exam, free or paid certificate.
import { createClient } from "@/lib/supabase";

export type Lesson = { title: string; body: string; video_url?: string };
export interface CertListItem { id: string; sponsor_name: string; sponsor_logo: string | null; title: string; description: string; price_ngn: number; pass_pct: number; lesson_count: number; question_count: number; my_code: string | null }
export interface CertCourse {
  id: string; sponsor_name: string; sponsor_logo: string | null; title: string; description: string; lessons: Lesson[]; pass_pct: number; price_ngn: number;
  questions: { id: string; prompt: string; options: string[] }[]; best: number | null; passed: boolean; attempts_today: number; my_code: string | null;
}
export interface ExamResult { score_pct: number; passed: boolean; pass_pct: number; right: number; total: number; code: string | null; price_ngn: number }
export interface AdminCert {
  id: string; sponsor_name: string; sponsor_logo: string | null; title: string; description: string; lessons: Lesson[]; pass_pct: number; price_ngn: number;
  countries: string[]; regions: string[]; schools: string[]; active: boolean; created_at: string;
  questions: { prompt: string; options: string[]; correct: number }[]; takers: number; passers: number; issued: number; revenue: number;
}

const msg = (e: { message?: string } | null) => (e?.message ?? "").replace(/^.*?exception:\s*/i, "");

export async function listCertCourses(): Promise<CertListItem[]> {
  const { data } = await createClient().rpc("list_cert_courses");
  return (data ?? []) as CertListItem[];
}
export async function getCertCourse(id: string): Promise<CertCourse | null> {
  const { data } = await createClient().rpc("get_cert_course", { p_id: id });
  return (data as CertCourse) ?? null;
}
export async function submitExam(id: string, answers: Record<string, number>): Promise<{ result?: ExamResult; error?: string }> {
  const { data, error } = await createClient().rpc("submit_cert_exam", { p_id: id, p_answers: answers });
  return error ? { error: msg(error) } : { result: data as ExamResult };
}
export async function unlockCertificate(id: string): Promise<{ code?: string; error?: string }> {
  const { data, error } = await createClient().rpc("unlock_certificate", { p_id: id });
  return error ? { error: error.message } : { code: data as string };
}
export async function myCertificates(): Promise<{ code: string; title: string; sponsor: string; issued_at: string; score_pct: number }[]> {
  const { data } = await createClient().rpc("my_certificates");
  return (data ?? []) as { code: string; title: string; sponsor: string; issued_at: string; score_pct: number }[];
}

export async function adminListCerts(): Promise<AdminCert[]> {
  const { data } = await createClient().rpc("admin_list_cert_courses");
  return (data ?? []) as AdminCert[];
}
export async function adminSaveCert(p: Partial<AdminCert>): Promise<string | null> {
  const { error } = await createClient().rpc("admin_save_cert_course", { p });
  return error ? msg(error) : null;
}
export async function adminDeleteCert(id: string): Promise<string | null> {
  const { error } = await createClient().rpc("admin_delete_cert_course", { p_id: id });
  return error ? msg(error) : null;
}
