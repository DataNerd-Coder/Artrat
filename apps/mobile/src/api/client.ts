/**
 * Typed HTTP client for the Artrat FastAPI backend (`contract/openapi.yaml`).
 * Automatically syncs student actions (link-drops, profile/level updates, Vault uploads,
 * Canvas rewrites, and Declare & Submit) with `ARTRAT_API_URL` (`http://localhost:8000` by default).
 */

export const ARTRAT_API_URL =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.EXPO_PUBLIC_ARTRAT_API_URL) ||
  'http://localhost:8000';

export interface BackendUniversitySemester {
  short_code: string;
  university_name: string;
  current_session: { value: string | null };
  current_semester: { value: '1st Semester' | '2nd Semester' | 'Session Break / Exam Processing' | null };
  next_level_promotion_window: string;
  last_checked_at: string;
}

export interface BackendStudent {
  id: string;
  email: string;
  full_name: string;
  date_of_birth: string;
  is_minor: boolean;
  institution: string;
  department: string;
  matric_number: string;
  academic_level: string;
  autonomous_level_promotion: boolean;
  state_of_origin: string;
  lga: string;
  residential_address: string;
}

async function requestJson<T>(
  path: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(`${ARTRAT_API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  const data = await requestJson<{ status: string }>('/health');
  return data?.status === 'ok';
}

export async function syncStudentProfileToBackend(payload: {
  email: string;
  full_name: string;
  date_of_birth: string;
  institution: string;
  department: string;
  matric_number: string;
  academic_level: string;
  state_of_origin: string;
  lga: string;
  residential_address: string;
}): Promise<BackendStudent | null> {
  return requestJson<BackendStudent>('/v1/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitStudentLinkDrop(
  url: string
): Promise<{ queued: boolean; canonical_url: string } | null> {
  return requestJson<{ queued: boolean; canonical_url: string }>(
    '/v1/research/link-drop',
    {
      method: 'POST',
      body: JSON.stringify({ url }),
    }
  );
}

export async function fetchUniversitySemesterFromBackend(
  shortCode: string
): Promise<BackendUniversitySemester | null> {
  return requestJson<BackendUniversitySemester>(
    `/v1/universities/${encodeURIComponent(shortCode)}/semester`
  );
}

export async function syncVaultUploadToBackend(
  studentId: string,
  payload: {
    doc_type: string;
    signed_by?: string | null;
    title: string;
    file_name: string;
    storage_key: string;
    extracted_summary: string;
  }
): Promise<unknown> {
  return requestJson(`/v1/students/${studentId}/vault`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, extracted_facts: [] }),
  });
}

export interface BackendChatResponse {
  reply: string;
  output_format: 'text' | 'json' | 'audio';
  reasoning_model: string;
  media_model_used?: string | null;
  audio_model_used?: string | null;
  media_extracted?: string | null;
  audio_transcribed?: string | null;
  audio_output?: string | null;
}

export async function sendChatToBackend(payload: {
  message: string;
  media_data_url?: string | null;
  audio_data_url?: string | null;
  output_format?: 'text' | 'json' | 'audio';
  context?: string | null;
}): Promise<BackendChatResponse | null> {
  return requestJson<BackendChatResponse>('/v1/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
