// src/lib/studentCardRequestConfig.ts
// ─────────────────────────────────────────────────────────────────────────────



export const SCR_FIELDS = {
  student:     'studentid',
  studentName: 'student_name',
  photo:       'photo',
  remarks:     'remarks_by_office',
  status:      'status',
} as const;


export const SCR_APPROVED_STATUS = 'Approved' as const;

export const SCR_BLOCKED_STATUSES: readonly string[] = [
  'Pending',
  'Rejected',
  'Draft',
  'Cancelled',
];


export const SCR_MAX_ORIGINAL_MB = 10;

export const SCR_ACCEPTED_TYPES: string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const SCR_OUTPUT_SIZE    = 600;
export const SCR_OUTPUT_QUALITY = 0.9;
export const SCR_OUTPUT_MAX_KB  = 500;