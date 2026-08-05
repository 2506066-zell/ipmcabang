// Centralized TypeScript types for the IPM Cabang Panawuan application

export interface SessionUser {
  id: number;
  username: string;
  nama_panjang: string | null;
  pimpinan: string | null;
  role: 'admin' | 'user';
}

export interface UserRecord {
  id: number;
  username: string;
  nama_panjang: string | null;
  pimpinan: string | null;
  role: string;
  created_at: string;
  email?: string | null;
}

// === Quiz / Questions ===
export interface QuestionOptions {
  a: string;
  b: string;
  c?: string;
  d: string;
}

export interface Question {
  id: number;
  question: string;
  options: QuestionOptions;
  correct_answer: 'a' | 'b' | 'c' | 'd';
  active: boolean;
  category: string | null;
  quiz_set: number;
  created_at: string;
}

export interface QuizResult {
  id: number;
  user_id: number;
  quiz_set: number;
  score: number;
  total: number;
  answers: Record<string, string>;
  created_at: string;
}

// === Materials ===
export interface Material {
  id: number;
  title: string;
  description: string | null;
  file_type: string;
  file_url: string;
  thumbnail: string | null;
  category: string;
  author: string | null;
  active: boolean;
  updated_at: string;
  created_at: string;
}

// === Articles ===
export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  author_id: number | null;
  author_name: string | null;
  published: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// === Organization ===
export interface OrgBidang {
  id: number;
  code: string;
  name: string;
  color: string;
  image_url: string;
  sort_order: number;
  is_core: boolean;
  is_active: boolean;
  members: OrgMember[];
  programs: OrgProgram[];
}

export interface OrgMember {
  id: number;
  bidang_id: number;
  full_name: string;
  role_title: string;
  quote: string;
  photo_url: string;
  instagram_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface OrgProgram {
  id: number;
  bidang_id: number;
  title: string;
  description: string;
  status: 'draft' | 'rencana' | 'terlaksana';
  sort_order: number;
  progress_percent: number;
  upvote_count: number;
  is_active: boolean;
}

// === Attendance ===
export interface AttendanceRoom {
  id: number;
  pimpinan: string;
  room_code: string;
  is_active: boolean;
  identity_mode: 'org_member_select' | 'account_identity';
  created_at: string;
  updated_at: string;
}

export interface AttendanceEvent {
  id: number;
  room_id: number;
  title: string;
  description: string | null;
  event_date: string;
  status: 'active' | 'closed';
  created_by: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface AttendanceRecord {
  id: number;
  event_id: number;
  user_id: number | null;
  org_member_id: number | null;
  attendee_name_snapshot: string | null;
  attendance_status: 'hadir' | 'izin' | 'sakit' | 'alfa';
  photo_url: string | null;
  check_in_at: string | null;
  submitted_by_admin: boolean;
  submitted_by: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  total_events: number;
  hadir_count: number;
  izin_count: number;
  sakit_count: number;
  alfa_count: number;
  attendance_percent: number;
  activity_status: 'aktif' | 'pasif';
}

// === Notifications ===
export interface Notification {
  id: number;
  user_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

// === Forms / PKDTM1 ===
export interface FormSubmission {
  id: number;
  form_id: string;
  user_id: number | null;
  data: Record<string, unknown>;
  created_at: string;
}

// === Push Subscriptions ===
export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

// === API Response ===
export interface ApiSuccess<T = unknown> {
  status: 'success';
  [key: string]: T | string;
}

export interface ApiError {
  status: 'error';
  message: string;
}
