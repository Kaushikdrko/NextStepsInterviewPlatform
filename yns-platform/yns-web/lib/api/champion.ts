import type {
  Champion,
  DashboardSummary,
  InterviewSession,
  Meeting,
  MentorNote,
  ProgressPoint,
  SaveNotePayload,
  Student,
} from "@/types/champion";
import {
  buildFallbackInterviews,
  buildFallbackProgress,
  mockChampion,
  mockInterviewsByStudent,
  mockMeetings,
  mockProgressByStudent,
  mockStudents,
  mockSummary,
} from "@/lib/mock/champion-dashboard";

/**
 * Champion Dashboard data access layer.
 *
 * Today these functions return mock data so the UI works without a backend.
 * When the FastAPI service is ready, set NEXT_PUBLIC_API_BASE_URL and replace
 * each mock return with the matching `apiGet` / `apiPost` call (examples shown
 * in comments). The function signatures will not change, so the components do
 * not need to be touched.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Simulate network latency so loading states are visible during development. */
function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// --- Generic fetch helpers (used once the backend is live) ---------------

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Keep the helpers referenced so they are not flagged as unused before the
// backend is wired in.
void apiGet;
void apiPost;

// --- Champion + dashboard ------------------------------------------------

export async function getCurrentChampion(): Promise<Champion> {
  // return apiGet<Champion>("/admin/me");
  return delay(mockChampion);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // return apiGet<DashboardSummary>("/admin/dashboard/summary");
  return delay(mockSummary);
}

// --- Students ------------------------------------------------------------

export async function getStudents(): Promise<Student[]> {
  // return apiGet<Student[]>("/admin/students");
  return delay(mockStudents);
}

export async function getStudent(studentId: string): Promise<Student | null> {
  // return apiGet<Student>(`/admin/students/${studentId}`);
  return delay(mockStudents.find((s) => s.id === studentId) ?? null);
}

export async function getStudentInterviews(
  studentId: string
): Promise<InterviewSession[]> {
  // return apiGet<InterviewSession[]>(`/admin/students/${studentId}/interviews`);
  const found = mockInterviewsByStudent[studentId];
  if (found) return delay(found);
  const student = mockStudents.find((s) => s.id === studentId);
  return delay(student ? buildFallbackInterviews(student) : []);
}

export async function getStudentProgress(
  studentId: string
): Promise<ProgressPoint[]> {
  // return apiGet<ProgressPoint[]>(`/admin/students/${studentId}/progress`);
  const found = mockProgressByStudent[studentId];
  if (found) return delay(found);
  const student = mockStudents.find((s) => s.id === studentId);
  return delay(student ? buildFallbackProgress(student.latestScore) : []);
}

// --- Meetings ------------------------------------------------------------

export async function getMeetings(): Promise<Meeting[]> {
  // return apiGet<Meeting[]>("/admin/meetings");
  return delay(mockMeetings);
}

// --- Notes ---------------------------------------------------------------

export async function saveNote(
  payload: SaveNotePayload
): Promise<MentorNote> {
  // return apiPost<MentorNote>(
  //   `/admin/students/${payload.studentId}/notes`,
  //   payload
  // );
  const note: MentorNote = {
    id: `note-${Date.now()}`,
    studentId: payload.studentId,
    championId: mockChampion.id,
    note: payload.note,
    visibility: payload.visibility,
    createdAt: new Date().toISOString(),
  };
  return delay(note, 400);
}
