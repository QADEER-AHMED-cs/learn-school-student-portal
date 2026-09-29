import axios, { AxiosInstance } from "axios";

const AUTH_TOKEN_KEY = "erpnext_auth_token";
const API_KEY = import.meta.env.VITE_ERP_API_KEY || 'e559cde874cdf6d';
const API_SECRET = import.meta.env.VITE_ERP_API_SECRET || '355b4f41e87a77c';
const DEV_ADMIN_TOKEN = `token ${API_KEY}:${API_SECRET}`;

// ── Debug flag (production mein logs band) ────────────────────────────────────
const DEBUG = import.meta.env.DEV;
const log = (...args: any[]) => { if (DEBUG) console.log(...args); };
const warn = (...args: any[]) => { if (DEBUG) console.warn(...args); };

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
export function setAuthToken(token: string | null) {
  if (!token) localStorage.removeItem(AUTH_TOKEN_KEY);
  else localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// ── Axios clients ─────────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: "/api/method",
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 20000,
});

export const resourceClient: AxiosInstance = axios.create({
  baseURL: `/api/resource`,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 20000,
});

// ── CSRF ──────────────────────────────────────────────────────────────────────

let _cachedCsrf: string | null = null;

export function readCsrfToken(): string | null {
  if (_cachedCsrf) return _cachedCsrf;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (
    typeof fromWindow === "string" &&
    fromWindow.trim() &&
    fromWindow !== "{{ csrf_token }}"
  ) {
    _cachedCsrf = fromWindow;
    return fromWindow;
  }
  const meta =
    document.querySelector('meta[name="csrf-token"]') ||
    document.querySelector('meta[name="csrf_token"]');
  const fromMeta = meta?.getAttribute("content");
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    _cachedCsrf = fromMeta;
    return fromMeta;
  }
  const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
  if (m?.[2]) {
    _cachedCsrf = decodeURIComponent(m[2]);
    return _cachedCsrf;
  }
  return null;
}

export async function fetchAndCacheCsrfToken(): Promise<void> {
  try {
    await apiClient.get("frappe.auth.get_logged_user").catch(() => {});
    const cookieMatch = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (cookieMatch?.[2]) {
      _cachedCsrf = decodeURIComponent(cookieMatch[2]);
      return;
    }
    const w = window as any;
    if (w?.frappe?.csrf_token) _cachedCsrf = w.frappe.csrf_token;
  } catch {
    /* non-blocking */
  }
}

// ── Interceptors ──────────────────────────────────────────────────────────────

function attachInterceptors(client: AxiosInstance, useAdminToken = true) {
  client.interceptors.request.use((config) => {
    const isLogin = config.url?.includes("login");
    const t = getAuthToken();

    if (t && !isLogin) {
      (config.headers as any)["Authorization"] = t.startsWith("token ")
        ? t
        : `token ${t}`;
    } else if (useAdminToken && !isLogin && API_KEY && API_SECRET) {
      (config.headers as any)["Authorization"] = DEV_ADMIN_TOKEN;
    }

    const method = (config.method || "get").toLowerCase();
    if (method !== "get") {
      const csrf = readCsrfToken();
      if (csrf) (config.headers as any)["X-Frappe-CSRF-Token"] = csrf;
      (config.headers as any)["X-Requested-With"] = "XMLHttpRequest";
    }

    return config;
  });

  client.interceptors.response.use(
    (r) => r.data,
    async (error) => {
      const orig = error.config;

      if (error.response?.status === 417 && !orig._retry) {
        orig._retry = true;
        _cachedCsrf = null;
        await fetchAndCacheCsrfToken();
        const csrf = readCsrfToken();
        if (csrf) {
          orig.headers["X-Frappe-CSRF-Token"] = csrf;
          return client(orig);
        }
      }

      if (error.response?.status === 403) {
        console.error(
          "[ERP 403 Forbidden]",
          orig?.url,
          "| Auth header present:",
          !!orig?.headers?.Authorization,
          "| Response:",
          error.response?.data
        );
      }

      return Promise.reject(error);
    }
  );
}

attachInterceptors(apiClient, true);
attachInterceptors(resourceClient, true);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  name: string;
  student_name: string;
  first_name: string;
  student_email_id: string;
  student_mobile_number?: string;
  gender?: string;
  blood_group?: string;
  joining_date?: string;
  city?: string;
  date_of_birth?: string;
  country?: string;
  custom_student_id_number?: string;
  custom_serial_no?: string;
  custom_batch?: string;
  custom_previous_school_record?: string;
  enabled: number;
  image?: string;
  guardians?: GuardianEntry[];
  siblings?: any[];
}

export interface CourseEnrollment {
  name: string;
  course: string;
  course_name?: string;
  program: string;
  student: string;
  student_name: string;
  enrollment_date: string;
  program_enrollment: string;
}

export interface GuardianEntry {
  guardian: string;
  guardian_name: string;
  relation?: string;
  guardian_email?: string;
}

export interface GuardianFullDetail {
  name: string;
  guardian_name?: string;
  email_address?: string;
  mobile_number?: string;
  alternate_number?: string;
  date_of_birth?: string;
  user?: string;
  id_type?: string;
  id_number?: string;
  education?: string;
  occupation?: string;
  designation?: string;
  work_address?: string;
  relation?: string; // Student.guardians child table se merge hoga
}

// ✅ ID Card Request type (status field included)
export interface StudentCardRequestDoc {
  name: string;
  studentid: string;
  student_name?: string;
  photo?: string;
  remarks_by_office?: string;
  status?: 'Pending' | 'Approved' | 'Rejected';    // ✅ NAYA
  creation?: string;
  modified?: string;
  [key: string]: any;
}

declare const frappe: { csrf_token: string } | undefined;

export type TemplateType = "KG" | "PRIMARY" | "MIDDLE";
export type TermType = "Mid Term" | "Final Term";
export type PSDOption = "Often" | "Sometimes" | "Rarely";

export interface Student {
  name: string;
  student_name: string;
  student_email_id?: string;
  image?: string;
}

export interface SubjectMark {
  subject: string;
  mid_term: string | number;
  final_term: string | number;
}

export interface PSDRow {
  objective: string;
  mid_term: PSDOption;
  final_term: PSDOption;
}

export interface AssignmentDetail {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  course: string;
  link_gdbv: string;
  heading: string;
  description: string;
  due_date?: string;
  doctype: string;
}

export interface ReportCardDoc {
  name?: string;
  doctype?: string;
  student: string;
  student_name: string;
  roll_no?: string;
  academic_year: string;
  grade: string;
  term: TermType;
  date?: string;
  report_template?: TemplateType;
  subject_marks: SubjectMark[];
  obtained_marks?: number;
  total_marks?: number;
  percentage?: string | number;
  overall_grade?: string;
  teacher_comment?: string;
  psd: PSDRow[];
  promoted_to_grade?: string;
}

export interface ClassListCard {
  name: string;
  student: string;
  student_name: string;
  roll_no?: string;
  grade: string;
  academic_year: string;
  term: TermType;
  obtained_marks?: number;
  total_marks?: number;
  percentage?: string | number;
  overall_grade?: string;
}

export interface ComputedStats {
  obtained: number;
  totalPossible: number;
  percentage: string;
  grade: string;
}
export interface QuizQuestionItem {
  name: string;
  idx: number;
  question_link: string;
  question: string;
}

export interface QuizDoc {
  name: string;
  title: string;
  passing_score: number;
  max_attempts: number;
  grading_basis: string;
  is_time_bound: 0 | 1;
  duration: number;
  creation: string;
  question?: QuizQuestionItem[];
}

export interface QuizResult {
  name: string;
  student: string;
  quiz: string;
  score?: number;
  status?: 'Completed' | 'In Progress';
  [key: string]: any;
}

export interface QuizWithResult extends QuizDoc {
  status: 'Completed' | 'Not Started';
  score: number | null;
  date: string;
}
// ─── Constants ────────────────────────────────────────────────────────────────

export const GRADES: string[] = [
  "KG 1", "KG 2",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8",
];

export const TERMS: TermType[] = ["Mid Term", "Final Term"];

export const PSD_OBJECTIVES: string[] = [
  "Is enthusiastic and resourceful learner",
  "Self-disciplined and resolves difficulties in mature ways",
  "Enjoys excellent relationship with peers and teachers",
  "Is genuine, empathetic and respectful towards others",
  "Punctual to school and lessons",
  "Contributes actively to school and wider community",
  "Exhibits excellent work ethic, is creative and leads confidence",
];

export const PSD_OPTIONS: PSDOption[] = ["Often", "Sometimes", "Rarely"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL: string =
  typeof window !== "undefined" ? window.location.origin : "";

const getCsrfToken = (): string =>
  typeof frappe !== "undefined" ? frappe.csrf_token : "";

const fetchWithAuth = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": getCsrfToken(),
      ...(options.headers as Record<string, string> || {}),
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
};

// ─── Template & Subjects ──────────────────────────────────────────────────────

export const getReportCardTemplate = (grade: string): TemplateType => {
  const g = grade.trim().toLowerCase();
  if (["kg1", "kg 1", "kg-1"].includes(g)) return "KG";
  if (["kg2", "kg 2", "kg-2"].includes(g)) return "KG";
  const num = parseInt(g.replace(/\D/g, ""), 10);
  if (num >= 1 && num <= 4) return "PRIMARY";
  if (num >= 5 && num <= 8) return "MIDDLE";
  return "PRIMARY";
};

export const getSubjectsByTemplate = (template: TemplateType): string[] => {
  switch (template) {
    case "KG":
      return ["English", "Mathematics", "STEM", "Urdu"];
    case "PRIMARY":
      return ["English", "Mathematics", "STEM / Science", "Urdu"];
    case "MIDDLE":
      return ["English", "Mathematics", "Science", "Urdu", "Social Studies", "Islamiat", "Computer"];
    default:
      return ["English", "Mathematics", "Science", "Urdu"];
  }
};

export const calculateGrade = (percentage: number): string => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
};

// ─── API Calls ────────────────────────────────────────────────────────────────

export const fetchAcademicYears = async (): Promise<string[]> => {
  const params = new URLSearchParams({
    doctype: "Academic Year",
    fields: JSON.stringify(["name", "year_start_date", "year_end_date"]),
    limit_page_length: "20",
    order_by: "year_start_date desc",
  });
  const data = await fetchWithAuth<{ data: { name: string }[] }>(
    `${BASE_URL}/api/resource/Academic Year?${params}`
  );
  return (data.data || []).map((y) => y.name);
};

export const fetchStudents = async (
  filters: Record<string, string> = {}
): Promise<Student[]> => {
  const params = new URLSearchParams({
    doctype: "Student",
    fields: JSON.stringify(["name", "student_name", "student_email_id", "image"]),
    filters: JSON.stringify(filters),
    limit_page_length: "500",
  });
  const data = await fetchWithAuth<{ data: Student[] }>(
    `${BASE_URL}/api/resource/Student?${params}`
  );
  return data.data || [];
};

export const fetchReportCard = async (
  studentId: string,
  academicYear: string,
  term: TermType,
  grade: string
): Promise<ReportCardDoc | null> => {
  const params = new URLSearchParams({
    doctype: "Student Report Card",
    fields: JSON.stringify(["*"]),
    filters: JSON.stringify({
      student: studentId,
      academic_year: academicYear,
      term,
      grade,
    }),
    limit_page_length: "1",
  });

  try {
    const list = await fetchWithAuth<{ data: { name: string }[] }>(
      `${BASE_URL}/api/resource/Student Report Card?${params}`
    );

    if (list.data && list.data.length > 0) {
      const doc = await fetchWithAuth<{ data: ReportCardDoc }>(
        `${BASE_URL}/api/resource/Student Report Card/${list.data[0].name}`
      );
      return doc.data;
    }
    return null;
  } catch {
    return null;
  }
};

export const fetchClassReportCards = async (
  grade: string,
  academicYear: string,
  term: TermType
): Promise<ClassListCard[]> => {
  const params = new URLSearchParams({
    doctype: "Student Report Card",
    fields: JSON.stringify([
      "name", "student", "student_name", "roll_no",
      "grade", "academic_year", "term",
      "obtained_marks", "total_marks", "percentage", "overall_grade",
    ]),
    filters: JSON.stringify({ grade, academic_year: academicYear, term }),
    limit_page_length: "200",
    order_by: "roll_no asc",
  });
  const data = await fetchWithAuth<{ data: ClassListCard[] }>(
    `${BASE_URL}/api/resource/Student Report Card?${params}`
  );
  return data.data || [];
};

export const saveReportCard = async (
  payload: ReportCardDoc
): Promise<{ data: ReportCardDoc }> => {
  const { name, ...rest } = payload;

  if (name) {
    return fetchWithAuth<{ data: ReportCardDoc }>(
      `${BASE_URL}/api/resource/Student Report Card/${name}`,
      { method: "PUT", body: JSON.stringify(rest) }
    );
  }

  return fetchWithAuth<{ data: ReportCardDoc }>(
    `${BASE_URL}/api/resource/Student Report Card`,
    { method: "POST", body: JSON.stringify(rest) }
  );
};
export interface EnrolledCourse {
  name: string;
  course: string;
  course_name: string;
  docstatus: number;
}

export interface ProgramEnrollment {
  name: string;
  program: string;
  student: string;
  student_name: string;
  enrollment_date: string;
  academic_year: string;
  academic_term: string;
  student_batch_name: string;
  docstatus: number;
  courses: EnrolledCourse[];
}

export interface AssignmentSubmission {
  name: string;
  assignment: string;
  assignmentstudent: string;
  course: string;
  courseschedule: string;
  submissiondate: string;
  answer: string;
  status: 'Draft' | 'Submitted' | 'Graded';
  gradedby?: string;
  docstatus: number;
  creation: string;
  modified: string;
}

export interface CourseScheduleEntry {
  name: string;
  course: string;
  course_name: string;
  instructor: string;
  instructor_name: string;
  room: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  student_group: string;
  color?: string;
  class_schedule_color?: string;
  title?: string;
  program?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
  custom_meeting_link?: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface ProgramInfo {
  name: string;
}

export interface Notice {
  name: string;
  subject: string;
  message: string;
  type: 'NEWS' | 'STREAM' | 'CIRCULAR';
  creation: string;
  owner: string;
}
async function enrichCourseNames(
  schedule: CourseScheduleEntry[]
): Promise<CourseScheduleEntry[]> {
  const missing = schedule.filter((e) => !e.course_name && e.course);
  if (missing.length === 0) return schedule;

  const uniqueCourses = [...new Set(missing.map((e) => e.course))];
  const map: Record<string, string> = {};

  await Promise.allSettled(
    uniqueCourses.map(async (id) => {
      try {
        const r: any = await resourceClient.get(
          `Course/${encodeURIComponent(id)}`,
          { params: { fields: JSON.stringify(["name", "course_name"]) } }
        );
        if (r?.data?.course_name) map[id] = r.data.course_name;
      } catch {
        /* ignore */
      }
    })
  );

  return schedule.map((e) => ({
    ...e,
    course_name: e.course_name || map[e.course] || e.course,
  }));
}

// ── Date Helper ───────────────────────────────────────────────────────────────
function toFrappeDatetime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

// ── erpService ────────────────────────────────────────────────────────────────

export const erpService = {

  // ── Auth ───────────────────────────────────────────────────────────────────

  login: async (usr: string, pwd: string) => {
    setAuthToken(null);
    _cachedCsrf = null;
    const fd = new FormData();
    fd.append("usr", usr);
    fd.append("pwd", pwd);
    await fetchAndCacheCsrfToken();
    const response: any = await apiClient.post("login", fd, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (response.message === "Logged In") await fetchAndCacheCsrfToken();
    return response;
  },

  logout: async () => {
    try {
      await apiClient.get("logout");
    } catch {
      /* ignore */
    } finally {
      setAuthToken(null);
      _cachedCsrf = null;
      localStorage.removeItem("student_portal_user");
      ["sid", "system_user", "user_id"].forEach((k) => {
        document.cookie = `${k}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    }
  },

  getLoggedUser: () => apiClient.get("frappe.auth.get_logged_user"),

  loginAsEmployee: async (usr: string, pwd: string) => {
    try {
      setAuthToken(null);
      _cachedCsrf = null;
      const fd = new FormData();
      fd.append("usr", usr);
      fd.append("pwd", pwd);
      await fetchAndCacheCsrfToken();
      const response: any = await apiClient.post("login", fd, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (response.message === "Logged In") {
        await fetchAndCacheCsrfToken();
        return { ok: true, data: response };
      }
      return { ok: false, error: response.message || "Login failed" };
    } catch (error: any) {
      return {
        ok: false,
        error: error.response?.data?.message || error.message || "Login failed",
      };
    }
  },

  getProfile: async () => {
    try {
      const res: any = await apiClient.get("frappe.auth.get_logged_user");
      if (res?.message && res.message !== "Guest")
        return { ok: true, data: res.message };
      return { ok: false, error: "Not logged in" };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  resetPassword: async (email: string) => {
    try {
      await apiClient.post(
        "frappe.core.doctype.user.user.reset_password",
        { user: email }
      );
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  },

  // ── Student ────────────────────────────────────────────────────────────────

  getStudentDetails: async (email: string): Promise<StudentProfile | null> => {
    const fields = [
      "student_email_id",
    ];
    for (const field of fields) {
      try {
        const res: any = await resourceClient.get("Student", {
          params: {
            filters: JSON.stringify([
              [field, "=", email],
              ["enabled", "=", 1],
            ]),
            fields: JSON.stringify(["*"]),
          },
        });
        if (res.data?.length > 0) return res.data[0];
      } catch (err) {
        warn(`[getStudentDetails] field "${field}" failed:`, err);
      }
    }
    return null;
  },

  getStudentById: async (studentId: string): Promise<StudentProfile | null> => {
    try {
      const res: any = await resourceClient.get(
        `Student/${encodeURIComponent(studentId)}`
      );
      return res?.data || null;
    } catch (err) {
      console.error("[getStudentById] error:", err);
      return null;
    }
  },

  getAttendanceSummary: async (
    studentId: string
  ): Promise<AttendanceSummary> => {
    try {
      const res: any = await resourceClient.get("Student Attendance", {
        params: {
          filters: JSON.stringify([["student", "=", studentId]]),
          fields: JSON.stringify(["status"]),
          limit_page_length: 1000,
        },
      });
      const records: any[] = res?.data || [];
      const present = records.filter((r) => r.status === "Present").length;
      const absent  = records.filter((r) => r.status === "Absent").length;
      const total   = records.length;
      return {
        total,
        present,
        absent,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    } catch {
      return { total: 0, present: 0, absent: 0, percentage: 0 };
    }
  },

  getAttendance: async (studentId: string) => {
    try {
      const res: any = await resourceClient.get("Student Attendance", {
        params: {
          filters: JSON.stringify([["student", "=", studentId]]),
          fields: JSON.stringify([
            "name", "student", "student_name", "course_schedule",
            "student_group", "date", "status", "link_nvfk",
          ]),
          limit_page_length: 200,
          order_by: "date desc",
        },
      });
      return res?.data || [];
    } catch (err: any) {
      console.error("[getAttendance] error:", err?.response?.data || err?.message);
      return [];
    }
  },

  getAssignments: async (studentId: string) => {
    try {
      const res: any = await resourceClient.get("Student Assignment", {
        params: {
          filters: JSON.stringify([["student", "=", studentId]]),
          fields: JSON.stringify(["*"]),
          order_by: "due_date desc",
        },
      });
      return res?.data || [];
    } catch (err: any) {
      warn("[getAssignments] failed (likely 403):", err?.response?.status);
      return [];
    }
  },

  getSubmissionForAssignment: async (
    assignmentId: string,
    studentId: string
  ): Promise<AssignmentSubmission | null> => {
    try {
      const res: any = await resourceClient.get(
        "Student Assignment Submission",
        {
          params: {
            filters: JSON.stringify([
              ["assignment", "=", assignmentId],
              ["assignmentstudent", "=", studentId],
            ]),
            fields: JSON.stringify(["*"]),
            limit_page_length: 1,
          },
        }
      );
      const list: AssignmentSubmission[] = res?.data || [];
      return list.length > 0 ? list[0] : null;
    } catch (err) {
      console.error("[getSubmissionForAssignment] error:", err);
      return null;
    }
  },

  saveSubmission: async (payload: {
    name?: string;
    assignment: string;
    assignmentstudent: string;
    course: string;
    courseschedule: string;
    answer: string;
    status: "Draft" | "Submitted";
  }): Promise<AssignmentSubmission | null> => {
    try {
      if (payload.name) {
        const res: any = await resourceClient.put(
          `Student Assignment Submission/${encodeURIComponent(payload.name)}`,
          {
            answer: payload.answer,
            status: payload.status,
            submissiondate: toFrappeDatetime(),
          }
        );
        return res?.data || null;
      }

      const res: any = await resourceClient.post(
        "Student Assignment Submission",
        {
          assignment: payload.assignment,
          assignmentstudent: payload.assignmentstudent,
          course: payload.course,
          courseschedule: payload.courseschedule,
          answer: payload.answer,
          status: payload.status,
          submissiondate: toFrappeDatetime(),
        }
      );
      return res?.data || null;
    } catch (err) {
      console.error("[saveSubmission] error:", err);
      throw err;
    }
  },

  // ── Quizzes ────────────────────────────────────────────────────────────────

  getQuizList: async (): Promise<QuizDoc[]> => {
    try {
      const res: any = await resourceClient.get("Quiz", {
        params: {
          fields: JSON.stringify([
            "name", "title", "passing_score", "max_attempts",
            "grading_basis", "is_time_bound", "duration", "creation",
          ]),
          limit_page_length: 200,
          order_by: "creation desc",
        },
      });
      return res?.data || [];
    } catch (err: any) {
      warn("[getQuizList] failed (likely 403):", err?.response?.status);
      return [];
    }
  },

  getQuizDetail: async (quizName: string): Promise<QuizDoc | null> => {
    try {
      const res: any = await resourceClient.get(`Quiz/${encodeURIComponent(quizName)}`);
      return res?.data || null;
    } catch (err) {
      console.error("[getQuizDetail] error:", err);
      return null;
    }
  },

  getQuizzesWithResults: async (studentId: string): Promise<QuizWithResult[]> => {
    try {
      const quizzes = await erpService.getQuizList();
      return quizzes.map((quiz) => ({
        ...quiz,
        status: "Not Started" as const,
        score: null,
        date: quiz.creation,
      }));
    } catch (err) {
      console.error("[getQuizzesWithResults] error:", err);
      return [];
    }
  },

  getResults: async (studentId: string) => {
    try {
      const res: any = await resourceClient.get("Assessment Result", {
        params: {
          filters: JSON.stringify([["student", "=", studentId]]),
          fields: JSON.stringify(["*"]),
          limit_page_length: 200,
        },
      });
      if (res?.data?.length > 0) return res.data;
    } catch {}
    try {
      const res: any = await resourceClient.get("Assessment Result", {
        params: {
          filters: JSON.stringify([["student_name", "=", studentId]]),
          fields: JSON.stringify(["*"]),
          limit_page_length: 200,
        },
      });
      return res?.data || [];
    } catch {}

    return [];
  },

  getQuizzes: async (studentId: string) => {
    try {
      const res: any = await resourceClient.get("Quiz Result", {
        params: {
          filters: JSON.stringify([["student", "=", studentId]]),
          fields: JSON.stringify(["*"]),
        },
      });
      return res?.data || [];
    } catch (err: any) {
      warn("[getQuizzes] failed (likely 403):", err?.response?.status);
      return [];
    }
  },

  // ── Academic Assignments ────────────────────────────────────────────────────
  getAcademicAssignments: async (studentId: string): Promise<AssignmentDetail[]> => {
    try {
      const enrollments = await erpService.getEnrolledCourses(studentId);
      const courseIds = [...new Set(
        enrollments.flatMap((e) => e.courses.map((c) => c.course)).filter(Boolean)
      )];

      log("[getAcademicAssignments] studentId:", studentId, "| course codes:", courseIds);

      if (courseIds.length === 0) {
        warn("[getAcademicAssignments] No enrolled courses found — returning empty list");
        return [];
      }

      const res: any = await resourceClient.get("Academic Assignments", {
        params: {
          filters: JSON.stringify([["course", "in", courseIds]]),
          fields: JSON.stringify([
            "name", "course", "link_gdbv", "heading", "description",
            "creation", "modified", "owner", "modified_by",
            "docstatus", "idx", "doctype",
          ]),
          limit_page_length: 500,
          order_by: "creation desc",
        },
      });

      return res?.data || [];
    } catch (err) {
      console.error("[getAcademicAssignments] error:", err);
      return [];
    }
  },

  // ── Bulk Submissions ────────────────────────────────────────────────────────
  getSubmissionsForStudent: async (
    studentId: string
  ): Promise<AssignmentSubmission[]> => {
    try {
      const res: any = await resourceClient.get("Student Assignment Submission", {
        params: {
          filters: JSON.stringify([["assignmentstudent", "=", studentId]]),
          fields: JSON.stringify(["name", "assignment", "status", "submissiondate"]),
          limit_page_length: 500,
        },
      });
      return res?.data || [];
    } catch (err) {
      console.error("[getSubmissionsForStudent] error:", err);
      return [];
    }
  },

  // ── Guardian (by User) ──────────────────────────────────────────────────────
  getGuardianByUser: async (userId: string) => {
    try {
      const res: any = await resourceClient.get('Guardian', {
        params: {
          filters: JSON.stringify([['user', '=', userId]]),
          fields: JSON.stringify([
            'name', 'guardian_name', 'email_address', 'mobile_number', 'user',
          ]),
          limit_page_length: 1,
        },
      });

      const guardian = res?.data?.[0];
      if (!guardian) return null;

      const fullRes: any = await resourceClient.get(
        `Guardian/${encodeURIComponent(guardian.name)}`
      );
      const fullGuardian = fullRes?.data;

      const studentsArr = fullGuardian?.students || [];
      log('[getGuardianByUser] guardian:', guardian.name, '| students array:', studentsArr);

      if (studentsArr.length > 0) {
        return fullGuardian;
      }

      warn('[getGuardianByUser] students[] empty — trying Student reverse lookup');

      const studentRes: any = await resourceClient.get('Student', {
        params: {
          filters: JSON.stringify([
            ['Student Guardian', 'guardian', '=', guardian.name],
            ['enabled', '=', 1],
          ]),
          fields: JSON.stringify(['name', 'student_name']),
          limit_page_length: 10,
        },
      });

      const linkedStudents: any[] = studentRes?.data || [];
      log('[getGuardianByUser] reverse lookup students:', linkedStudents);

      return {
        ...fullGuardian,
        students: linkedStudents.map((s: any) => ({
          student: s.name,
          student_name: s.student_name,
        })),
      };

    } catch (err) {
      console.error('[getGuardianByUser] error:', err);
      return null;
    }
  },

  // ── Guardians of a Student (fetch full details by IDs) ────────────────────
  getGuardiansDetail: async (guardianIds: string[]): Promise<GuardianFullDetail[]> => {
    if (!guardianIds || guardianIds.length === 0) return [];
    const uniqueIds = [...new Set(guardianIds.filter(Boolean))];

    const results = await Promise.allSettled(
      uniqueIds.map(async (id) => {
        const res: any = await resourceClient.get(
          `Guardian/${encodeURIComponent(id)}`,
          {
            params: {
              fields: JSON.stringify([
                'name', 'guardian_name', 'email_address', 'mobile_number',
                'alternate_number', 'date_of_birth', 'user', 'id_type',
                'id_number', 'education', 'occupation', 'designation', 'work_address',
              ]),
            },
          }
        );
        return res?.data as GuardianFullDetail | undefined;
      })
    );

    const guardians = results
      .filter(
        (r): r is PromiseFulfilledResult<GuardianFullDetail> =>
          r.status === 'fulfilled' && !!r.value
      )
      .map((r) => r.value);

    log('[getGuardiansDetail] fetched:', guardians.length, 'of', uniqueIds.length);

    return guardians;
  },

  // ── Course Enrollments ─────────────────────────────────────────────────────

  getCourseEnrollments: async (studentId: string): Promise<CourseEnrollment[]> => {
    const res: any = await resourceClient.get("Course Enrollment", {
      params: {
        filters: JSON.stringify([["student", "=", studentId]]),
        fields: JSON.stringify([
          "name", "course", "course_name", "program",
          "student", "student_name", "enrollment_date", "program_enrollment",
        ]),
        limit_page_length: 100,
      },
    });
    return (res?.data as CourseEnrollment[]) || [];
  },

  // ── getEnrolledCourses ─────────────────────────────────────────────────────
  getEnrolledCourses: async (
    studentId: string
  ): Promise<ProgramEnrollment[]> => {
    try {
      let allEnrollments: any[] = [];
      try {
        const res: any = await resourceClient.get("Program Enrollment", {
          params: {
            filters: JSON.stringify([["student", "=", studentId]]),
            fields: JSON.stringify([
              "name", "program", "student", "student_name",
              "enrollment_date", "academic_year", "academic_term",
              "student_batch_name", "docstatus",
            ]),
            limit_page_length: 100,
            order_by: "docstatus desc, enrollment_date desc",
          },
        });
        allEnrollments = res?.data || [];
      } catch { /* skip */ }

      log("[getEnrolledCourses] Total enrollments found:", allEnrollments.length,
        allEnrollments.map((e: any) => `${e.name}(status=${e.docstatus})`));

      if (allEnrollments.length > 0) {
        const bestPerProgram = new Map<string, any>();
        for (const e of allEnrollments) {
          const key = e.program || e.name;
          const existing = bestPerProgram.get(key);
          if (!existing) {
            bestPerProgram.set(key, e);
          } else {
            if (e.docstatus === 1 && existing.docstatus !== 1) {
              bestPerProgram.set(key, e);
            }
          }
        }

        const uniqueEnrollments = [...bestPerProgram.values()];
        log("[getEnrolledCourses] Unique enrollments after dedup:",
          uniqueEnrollments.map((e: any) => `${e.name}(status=${e.docstatus})`));

        const enriched = await Promise.all(
          uniqueEnrollments.map(async (enrollment: any) => {
            try {
              const docRes: any = await resourceClient.get(
                `Program Enrollment/${encodeURIComponent(enrollment.name)}`
              );

              const seenCourses = new Set<string>();
              const courses: EnrolledCourse[] = (docRes?.data?.courses || [])
                .filter((c: any) => {
                  if (!c.course || seenCourses.has(c.course)) return false;
                  seenCourses.add(c.course);
                  return true;
                })
                .map((c: any) => ({
                  name:        c.name,
                  course:      c.course,
                  course_name: c.course_name || c.course,
                  docstatus:   c.docstatus ?? enrollment.docstatus,
                }));

              log(`[getEnrolledCourses] ${enrollment.name} → ${courses.length} courses`);
              return { ...enrollment, courses };
            } catch {
              return { ...enrollment, courses: [] };
            }
          })
        );

        if (enriched.some((e: any) => e.courses.length > 0)) {
          return enriched;
        }

        warn("[getEnrolledCourses] No courses in Program Enrollment — trying fallback");
      }

      log("[getEnrolledCourses] Course Enrollment fallback for:", studentId);

      const ceRes: any = await resourceClient.get("Course Enrollment", {
        params: {
          filters: JSON.stringify([["student", "=", studentId]]),
          fields: JSON.stringify([
            "name", "course", "program", "enrollment_date", "program_enrollment",
          ]),
          limit_page_length: 100,
        },
      });

      const ceRows: any[] = ceRes?.data || [];
      if (ceRows.length === 0) return [];

      const seenCe = new Set<string>();
      const uniqueCeRows = ceRows.filter((r: any) => {
        if (!r.course || seenCe.has(r.course)) return false;
        seenCe.add(r.course);
        return true;
      });

      const courseNameMap: Record<string, string> = {};
      await Promise.allSettled(
        [...new Set(uniqueCeRows.map((r: any) => r.course).filter(Boolean))].map(
          async (courseId: string) => {
            try {
              const r: any = await resourceClient.get(
                `Course/${encodeURIComponent(courseId)}`,
                { params: { fields: JSON.stringify(["name", "course_name"]) } }
              );
              if (r?.data?.course_name) courseNameMap[courseId] = r.data.course_name;
            } catch { /* ignore */ }
          }
        )
      );

      const programMap: Record<string, ProgramEnrollment> = {};
      for (const ce of uniqueCeRows) {
        const key = ce.program_enrollment || ce.program || "unknown";
        if (!programMap[key]) {
          programMap[key] = {
            name: key, program: ce.program || "",
            student: studentId, student_name: "",
            enrollment_date: ce.enrollment_date || "",
            academic_year: "", academic_term: "",
            student_batch_name: "", docstatus: 0, courses: [],
          };
        }
        programMap[key].courses.push({
          name: ce.name, course: ce.course,
          course_name: courseNameMap[ce.course] || ce.course,
          docstatus: 0,
        });
      }

      return Object.values(programMap);

    } catch (err) {
      console.error("[getEnrolledCourses] error:", err);
      return [];
    }
  },

  // ── Notice Board ────────────────────────────────────────────────────────────
  getNoticeBoard: async (): Promise<Notice[]> => {
    const doctypeNames = [
      'Notice Board',
      'NoticeBoard',
      'School Notice',
      'Notice',
      'Announcement',
      'LMS Announcement',
    ];

    for (const doctype of doctypeNames) {
      try {
        const res: any = await resourceClient.get(doctype, {
          params: {
            fields: JSON.stringify([
              'name', 'subject', 'message', 'type', 'creation', 'owner',
            ]),
            order_by: 'creation desc',
            limit_page_length: 50,
          },
        });

        const data = res?.data;
        if (Array.isArray(data)) {
          log(`[getNoticeBoard] Found notices using doctype: "${doctype}", count:`, data.length);
          return data;
        }
      } catch (err: any) {
        const status = err?.response?.status;
        log(`[getNoticeBoard] doctype "${doctype}" failed with status:`, status);

        if (status === 403) {
          warn(`[getNoticeBoard] 403 on "${doctype}" — doctype exists but no permission`);
        }
        continue;
      }
    }

    console.error('[getNoticeBoard] No valid Notice Board doctype found. Tried:', doctypeNames);
    return [];
  },

  // ── Student Groups ─────────────────────────────────────────────────────────
  getStudentGroups: async (studentId: string): Promise<string[]> => {
    const currentYear = new Date().getFullYear().toString();
    const nextYear    = (new Date().getFullYear() + 1).toString();
    const yearFormats = [
      currentYear,
      `${currentYear}-${nextYear}`,
      nextYear,
    ];

    for (const academicYear of yearFormats) {
      try {
        const res: any = await resourceClient.get("Student Group", {
          params: {
            filters: JSON.stringify([
              ["Student Group Student", "student", "=", studentId],
              ["academic_year", "=", academicYear],
            ]),
            fields: JSON.stringify(["name", "student_group_name", "academic_year"]),
            limit_page_length: 100,
          },
        });
        const groups = (res?.data || [])
          .map((g: any) => g.name)
          .filter(Boolean) as string[];

        log(`[getStudentGroups] strategy1 (academic_year=${academicYear}) found:`, groups);
        if (groups.length > 0) return groups;
      } catch (err) {
        console.error(`[getStudentGroups] strategy1 (academic_year=${academicYear}) error:`, err);
      }
    }

    try {
      const res: any = await resourceClient.get("Student Group Student", {
        params: {
          filters: JSON.stringify([
            ["student", "=", studentId],
          ]),
          fields: JSON.stringify(["parent", "student"]),
          limit_page_length: 200,
        },
      });
      const rows: any[] = res?.data || [];
      const groups = [...new Set(
        rows.map((r: any) => r.parent).filter(Boolean)
      )] as string[];
      log("[getStudentGroups] strategy2 (no academic_year) found:", groups);
      if (groups.length > 0) return groups;
    } catch (err) {
      console.error("[getStudentGroups] strategy2 error:", err);
    }

    try {
      const res: any = await resourceClient.get("Student Group", {
        params: {
          filters: JSON.stringify([
            ["Student Group Student", "student", "=", studentId],
          ]),
          fields: JSON.stringify(["name"]),
          limit_page_length: 100,
        },
      });
      const groups = (res?.data || []).map((g: any) => g.name).filter(Boolean);
      log("[getStudentGroups] strategy3 found:", groups);
      return groups;
    } catch (err) {
      console.error("[getStudentGroups] strategy3 error:", err);
      return [];
    }
  },

  // ── Photo Upload ───────────────────────────────────────────────────────────

  uploadStudentPhoto: async (studentId: string, file: File) => {
    await fetchAndCacheCsrfToken();
    const csrf = readCsrfToken();

    const formData = new FormData();
    formData.append("file", file, `${studentId}_photo.jpg`);
    formData.append("doctype", "Student");
    formData.append("docname", studentId);
    formData.append("fieldname", "image");
    formData.append("is_private", "0");

    const uploadRes: any = await apiClient.post("upload_file", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Frappe-CSRF-Token": csrf || "",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const fileUrl =
      uploadRes?.message?.file_url || uploadRes?.file_url || null;

    if (!fileUrl) throw new Error("Upload failed — file_url missing");

    await resourceClient.put(`Student/${encodeURIComponent(studentId)}`, {
      image: fileUrl,
    });

    return fileUrl;
  },

  // ── Course Schedule ────────────────────────────────────────────────────────

  getStudentSchedule: async (
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CourseScheduleEntry[]> => {
    const SCHEDULE_FIELDS = JSON.stringify([
      "name", "course", "course_name", "instructor", "instructor_name",
      "room", "schedule_date", "from_time", "to_time",
      "student_group", "color", "class_schedule_color", "title", "program",
      "custom_meeting_link",
    ]);

    try {
      const groups = await erpService.getStudentGroups(studentId);
      log("[getStudentSchedule] studentId:", studentId, "groups:", groups);

      if (groups.length > 0) {
        const filters: any[] = [
          ["student_group", "in", groups],
          ["docstatus", "in", [0, 1]],
        ];
        if (startDate) filters.push(["schedule_date", ">=", startDate]);
        if (endDate)   filters.push(["schedule_date", "<=", endDate]);

        const res: any = await resourceClient.get("Course Schedule", {
          params: {
            filters:          JSON.stringify(filters),
            fields:           SCHEDULE_FIELDS,
            order_by:         "schedule_date asc, from_time asc",
            limit_page_length: 500,
          },
        });

        const schedule: CourseScheduleEntry[] = res?.data || [];

        if (schedule.length > 0) {
          log("[getStudentSchedule] Strategy 1 schedules found:", schedule.length);
          return await enrichCourseNames(schedule);
        }

        warn("[getStudentSchedule] Groups found but no schedules — trying Course Enrollment fallback");
      } else {
        warn("[getStudentSchedule] No student groups — trying Course Enrollment fallback");
      }

      log("[getStudentSchedule] Fetching Course Enrollments for:", studentId);

      const enrollRes: any = await resourceClient.get("Course Enrollment", {
        params: {
          filters:           JSON.stringify([["student", "=", studentId]]),
          fields:            JSON.stringify(["name", "course", "program"]),
          limit_page_length: 100,
        },
      });

      const enrollments: any[] = enrollRes?.data || [];
      log("[getStudentSchedule] Course Enrollments found:", enrollments.length);

      if (enrollments.length === 0) return [];

      const courseIds = [...new Set(
        enrollments.map((e: any) => e.course).filter(Boolean)
      )];
      log("[getStudentSchedule] Unique course IDs:", courseIds);

      const schedFilters: any[] = [
        ["course", "in", courseIds],
        ["docstatus", "in", [0, 1]],
      ];
      if (startDate) schedFilters.push(["schedule_date", ">=", startDate]);
      if (endDate)   schedFilters.push(["schedule_date", "<=", endDate]);

      const schedRes: any = await resourceClient.get("Course Schedule", {
        params: {
          filters:           JSON.stringify(schedFilters),
          fields:            SCHEDULE_FIELDS,
          order_by:          "schedule_date asc, from_time asc",
          limit_page_length: 500,
        },
      });

      const schedule: CourseScheduleEntry[] = schedRes?.data || [];
      log("[getStudentSchedule] Strategy 2 schedules found:", schedule.length);

      return await enrichCourseNames(schedule);
    } catch (err) {
      console.error("[getStudentSchedule] error:", err);
      return [];
    }
  },

  // ── Weekly Schedule ────────────────────────────────────────────────────────

  getWeeklySchedule: async (
    studentId: string,
    weekOffset = 0
  ): Promise<CourseScheduleEntry[]> => {
    const today  = new Date();
    const dow    = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date): string => {
      const y  = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      return `${y}-${mo}-${da}`;
    };

    const startDate = fmt(monday);
    const endDate   = fmt(sunday);

    log("[getWeeklySchedule] weekOffset:", weekOffset, "range:", startDate, "→", endDate);

    return erpService.getStudentSchedule(studentId, startDate, endDate);
  },

  // ── Schedule Range ─────────────────────────────────────────────────────────

  getScheduleRange: async (
    studentId: string,
    startDate: string,
    endDate: string
  ): Promise<CourseScheduleEntry[]> => {
    return erpService.getStudentSchedule(studentId, startDate, endDate);
  },

  // ── Fees ───────────────────────────────────────────────────────────────────

  getFees: async (studentName: string) => {
    try {
      const studentRes: any = await resourceClient.get('Student', {
        params: {
          filters: JSON.stringify([['name', '=', studentName]]),
          fields: JSON.stringify(['name', 'student_name', 'custom_student_id_number']),
          limit_page_length: 1,
        },
      });

      const studentRecord      = studentRes?.data?.[0];
      const studentDisplayName = studentRecord?.student_name || studentName;

      let invoices: any[] = [];

      try {
        const res: any = await resourceClient.get('Sales Invoice', {
          params: {
            filters: JSON.stringify([['student', '=', studentName]]),
            fields: JSON.stringify([
              'name', 'grand_total', 'outstanding_amount',
              'total_advance', 'status', 'posting_date', 'due_date', 'currency',
            ]),
            limit_page_length: 100,
            order_by: 'posting_date desc',
          },
        });
        invoices = res?.data || [];
      } catch { /* try next */ }

      if (invoices.length === 0) {
        try {
          const res: any = await resourceClient.get('Sales Invoice', {
            params: {
              filters: JSON.stringify([['customer', '=', studentDisplayName]]),
              fields: JSON.stringify([
                'name', 'grand_total', 'outstanding_amount',
                'total_advance', 'status', 'posting_date', 'due_date', 'currency',
              ]),
              limit_page_length: 100,
              order_by: 'posting_date desc',
            },
          });
          invoices = res?.data || [];
        } catch { /* try next */ }
      }

      if (invoices.length === 0) {
        try {
          const res: any = await resourceClient.get('Fees', {
            params: {
              filters: JSON.stringify([['student', '=', studentName]]),
              fields: JSON.stringify([
                'name', 'grand_total', 'outstanding_amount',
                'total_advance', 'status', 'posting_date', 'due_date', 'currency',
              ]),
              limit_page_length: 100,
              order_by: 'posting_date desc',
            },
          });
          invoices = res?.data || [];
        } catch { /* ignore */ }
      }

      return invoices.map((inv: any) => ({
        name:               inv.name,
        grand_total:        inv.grand_total || 0,
        total_paid:         (inv.grand_total || 0) - (inv.outstanding_amount || 0),
        outstanding_amount: inv.outstanding_amount || 0,
        status:             inv.status || 'Unpaid',
        posting_date:       inv.posting_date || '',
        due_date:           inv.due_date || '',
        currency:           inv.currency || 'PKR',
      }));
    } catch (err) {
      console.error('[getFees] error:', err);
      return [];
    }
  },

  // ── Programs ───────────────────────────────────────────────────────────────

  getPrograms: async (): Promise<ProgramInfo[]> => {
    try {
      const res: any = await resourceClient.get("Program", {
        params: {
          fields:            JSON.stringify(["name"]),
          limit_page_length: 200,
          order_by:          "name asc",
        },
      });
      return (res?.data || []).map((p: any) => ({ name: p.name }));
    } catch (err) {
      console.error("[getPrograms] error:", err);
      return [];
    }
  },

    // ── Guardian Details (single call for login flow) ──────────────────────────
  getGuardianDetails: async (userId?: string) => {
    try {
      // Agar userId nahi diya toh logged-in user le lo
      let uid = userId;
      if (!uid) {
        const me: any = await apiClient.get("frappe.auth.get_logged_user");
        uid = me?.message;
        if (!uid || uid === "Guest") {
          return { ok: false, error: "User not logged in" };
        }
      }

      const guardian = await erpService.getGuardianByUser(uid);
      if (!guardian) {
        return { ok: false, error: "No guardian found for this user" };
      }

      // Linked students
      const students = guardian.students || [];
      if (students.length === 0) {
        return { ok: false, error: "No student linked to this guardian" };
      }

      // Pehla student ka full profile
      const studentId = students[0].student || students[0].name;
      const studentProfile = await erpService.getStudentById(studentId);

      // Guardian full details
      const guardianDetails = await erpService.getGuardiansDetail([
        guardian.name,
      ]);

      return {
        ok: true,
        data: {
          guardian: guardianDetails[0] || guardian,
          student: studentProfile,
          students, // agar multiple students hain toh
        },
      };
    } catch (error: any) {
      console.error("[getGuardianDetails] error:", error);
      return {
        ok: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch guardian details",
      };
    }
  },

  // ✅ ID Card Request — Get latest (koi bhi status)
  getActiveStudentCardRequest: async (
    studentId: string
  ): Promise<StudentCardRequestDoc | null> => {
    try {
      const res: any = await resourceClient.get('ID Card Request', {
        params: {
          filters: JSON.stringify([['studentid', '=', studentId]]),
          fields: JSON.stringify(['*']),
          limit_page_length: 1,
          order_by: 'creation desc',
        },
      });
      return res?.data?.[0] || null;
    } catch (err) {
      console.error('[getActiveStudentCardRequest] error:', err);
      return null;
    }
  },

  // ✅ ID Card Request — Sirf approved wali (purani bhi chalegi)
  getApprovedStudentCardRequest: async (
    studentId: string
  ): Promise<StudentCardRequestDoc | null> => {
    try {
      const res: any = await resourceClient.get('ID Card Request', {
        params: {
          filters: JSON.stringify([
            ['studentid', '=', studentId],
            ['status', '=', 'Approved'],
          ]),
          fields: JSON.stringify(['*']),
          limit_page_length: 1,
          order_by: 'creation desc',      // Latest approved
        },
      });
      return res?.data?.[0] || null;
    } catch (err) {
      console.error('[getApprovedStudentCardRequest] error:', err);
      return null;
    }
  },

  // ✅ ID Card Request — Create new (status = Pending)
  createStudentCardRequest: async (
    studentId: string,
    studentName: string,
    photoFile: File
  ): Promise<StudentCardRequestDoc> => {
    await fetchAndCacheCsrfToken();
    const csrf = readCsrfToken();

    const fd = new FormData();
    fd.append('file', photoFile, photoFile.name);
    fd.append('is_private', '0');

    const uploadRes: any = await apiClient.post('upload_file', fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Frappe-CSRF-Token': csrf || '',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    const fileUrl = uploadRes?.message?.file_url || uploadRes?.file_url;
    if (!fileUrl) throw new Error('Photo upload failed — file_url missing');

    const docRes: any = await resourceClient.post('ID Card Request', {
      studentid: studentId,
      photo: fileUrl,
      status: 'Pending',              
    });

    return docRes?.data as StudentCardRequestDoc;
  },
};

export const api = erpService;