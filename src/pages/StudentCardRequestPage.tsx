// src/pages/StudentCardRequestPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ID Card Request — modern, glowing UI
// Flow: loading → (blocked | form) → success
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IdCard, Upload, Loader2, AlertCircle, CheckCircle2,
  User, Hash, GraduationCap, Mail, Layers, Clock, RefreshCcw,
  ShieldCheck, XCircle, Hourglass, ArrowRight, Sparkles,
  Camera, Image as ImageIcon, Info, Scan, Wand2, Zap,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import {
  erpService,
  StudentProfile,
  ProgramEnrollment,
  StudentCardRequestDoc,
} from '../services/erpService';
import { StudentCardPhotoCropper } from '../components/StudentCardPhotoCropper';
import {
  SCR_FIELDS,
  SCR_MAX_ORIGINAL_MB,
  SCR_ACCEPTED_TYPES,
} from '../lib/studentCardRequestConfig';

const ERP_BASE_URL =
  (import.meta as any).env?.VITE_ERP_BASE_URL || 'https://learnschool.online';

function resolveFileUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${ERP_BASE_URL}${url}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return value;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Building Blocks — Modern Glowing
// ─────────────────────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className={`relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 
                p-6 shadow-[0_8px_32px_rgba(27,106,59,0.08)]
                hover:shadow-[0_12px_40px_rgba(27,106,59,0.12)]
                transition-shadow duration-300 ${className || ''}`}
  >
    {children}
  </motion.div>
);

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; extra?: React.ReactNode }> = ({
  icon: Icon, title, extra,
}) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 
                    flex items-center justify-center shadow-lg shadow-green-500/25">
      <Icon className="w-4 h-4 text-white" />
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 
                      opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
    </div>
    <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">{title}</h3>
    {extra && <div className="ml-auto">{extra}</div>}
  </div>
);

const InfoRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value?: string | null;
  alwaysShow?: boolean;
}> = ({ icon: Icon, label, value, alwaysShow = false }) => {
  if (!value && !alwaysShow) return null;
  return (
    <div className="group flex items-start gap-3.5 py-3.5 border-b border-gray-100/70 last:border-0 
                    hover:bg-green-50/30 -mx-2 px-2 rounded-xl transition-colors duration-200">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 
                      flex items-center justify-center shrink-0 mt-0.5 
                      group-hover:from-green-50 group-hover:to-emerald-50 
                      transition-all duration-200">
        <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary-green transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em]">{label}</p>
        <p className={`text-sm font-semibold mt-1 break-words ${value ? 'text-gray-900' : 'text-gray-300 italic'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
};

// ── Status Badge (Modern) ─────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status?: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const s = (status || '').toLowerCase();
  const config =
    s === 'approved'
      ? { label: 'Approved', icon: ShieldCheck, style: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200/70 shadow-emerald-500/10' }
      : s === 'rejected'
      ? { label: 'Rejected', icon: XCircle, style: 'bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border-red-200/70 shadow-red-500/10' }
      : { label: 'Pending', icon: Hourglass, style: 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200/70 shadow-amber-500/10' };

  const Icon = config.icon;
  const sizeCls = size === 'sm' ? 'text-[10px] px-2.5 py-1' : 'text-xs px-3.5 py-1.5';
  const iconCls = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border 
                      shadow-md ${sizeCls} ${config.style}`}>
      <Icon className={iconCls} />
      {config.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

type FlowStep = 'loading' | 'blocked' | 'form' | 'success';

export const StudentCardRequestPage: React.FC = () => {
  const { user, activeStudentId } = useUser();
  const studentId = activeStudentId ?? (user as any)?.name ?? null;

  const [profile, setProfile]                 = useState<StudentProfile | null>(null);
  const [enrollment, setEnrollment]           = useState<ProgramEnrollment | null>(null);
  const [existingRequest, setExistingRequest] = useState<StudentCardRequestDoc | null>(null);
  const [step, setStep]                       = useState<FlowStep>('loading');
  const [loadError, setLoadError]             = useState<string | null>(null);

  // Photo pipeline
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [finalPhoto, setFinalPhoto]   = useState<{
    blob: Blob; dataUrl: string; sizeBytes: number; width: number; height: number;
  } | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<StudentCardRequestDoc | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) {
      setLoadError('No student is associated with this account.');
      setStep('form');
      return;
    }
    let cancelled = false;

    (async () => {
      setStep('loading');
      setLoadError(null);
      try {
        const [profileData, enrollments, active] = await Promise.all([
          erpService.getStudentById(studentId),
          erpService.getEnrolledCourses(studentId).catch(() => []),
          erpService.getActiveStudentCardRequest(studentId),
        ]);
        if (cancelled) return;

        setProfile(profileData);
        setEnrollment(enrollments?.[0] || null);
        setExistingRequest(active);

        const latestStatus = (active?.status || '').toString().trim().toLowerCase();
        const isPending = latestStatus === 'pending';
        const isApproved = latestStatus === 'approved';

        if (active && (isPending || isApproved)) {
          setStep('blocked');
        } else {
          setStep('form');
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || 'Could not load your information.');
          setStep('form');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [studentId]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSelectError(null);
    setFinalPhoto(null);

    if (!SCR_ACCEPTED_TYPES.includes(file.type)) {
      setSelectError('Please select a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > SCR_MAX_ORIGINAL_MB * 1024 * 1024) {
      setSelectError(`Please select an image smaller than ${SCR_MAX_ORIGINAL_MB} MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    setRawImageSrc(url);
    setShowCropper(true);
  };

  const handleCropped = useCallback((result: {
    blob: Blob; dataUrl: string; sizeBytes: number; width: number; height: number;
  }) => {
    setFinalPhoto(result);
    setShowCropper(false);
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
  }, [rawImageSrc]);

  const handleCancelCrop = () => {
    setShowCropper(false);
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
  };

  const handleChangePhoto = () => {
    setFinalPhoto(null);
    fileInputRef.current?.click();
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!studentId || !finalPhoto) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const studentName = profile?.student_name || (user as any)?.student_name || studentId;
      const photoFile = new File([finalPhoto.blob], `${studentId}_id_card_request.jpg`, { type: 'image/jpeg' });
      const doc = await erpService.createStudentCardRequest(studentId, studentName, photoFile);
      setCreatedRequest(doc);
      setStep('success');
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to submit your ID Card Request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading (Modern Skeleton) ─────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                          flex items-center justify-center shadow-2xl shadow-green-500/40">
            <IdCard className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                          opacity-30 blur-xl animate-pulse" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Loading your information…</p>
      </div>
    );
  }

  // ── Student Info Card ─────────────────────────────────────────────────────
  const studentInfoCard = (
    <SectionCard>
      <SectionHeader icon={User} title="Personal Information" />
      <InfoRow icon={User}          label="Student Name"  value={profile?.student_name} alwaysShow />
      <InfoRow icon={Hash}          label="Student ID"    value={profile?.custom_student_id_number || studentId || undefined} alwaysShow />
      <InfoRow icon={GraduationCap} label="Program"       value={enrollment?.program} />

      <InfoRow
        icon={Layers}
        label="Batch"
        value={(() => {
          const isDateLike = (v?: string) =>
            !!v && /^\d{4}-\d{2}-\d{2}/.test(String(v).trim());
          const batch1 = enrollment?.student_batch_name;
          const batch2 = profile?.custom_batch;
          if (batch1 && !isDateLike(batch1)) return batch1;
          if (batch2 && !isDateLike(batch2)) return batch2;
          return undefined;
        })()}
      />

      <InfoRow icon={Mail}          label="Email"         value={profile?.student_email_id} />
      <p className="text-[10px] text-gray-400 mt-4 pt-4 border-t border-gray-100/70 leading-relaxed">
        💡 This information comes from your account and can't be edited here.
      </p>
    </SectionCard>
  );

  // ── BLOCKED SCREEN ────────────────────────────────────────────────────────
  if (step === 'blocked' && existingRequest) {
    const photoUrl = resolveFileUrl(existingRequest[SCR_FIELDS.photo]);
    const status = existingRequest.status || 'Pending';
    const statusLower = status.toLowerCase();
    const isApproved = statusLower === 'approved';
    const isPending  = statusLower === 'pending';

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                          flex items-center justify-center shadow-xl shadow-green-500/30">
            <IdCard className="w-6 h-6 text-white" />
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                            opacity-40 blur-lg" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight tracking-tight">
              ID Card Request
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {isApproved ? 'Your ID Card is ready to print' : 'Your request is being reviewed'}
            </p>
          </div>
        </motion.div>

        {/* Main Card */}
        <SectionCard>
          {/* Status Banner — Modern Glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`relative flex items-start gap-4 rounded-2xl px-5 py-4 mb-6 
                        border overflow-hidden ${
              isApproved
                ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-200/70'
                : 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200/70'
            }`}
          >
            {/* Animated glow orb */}
            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-40 ${
              isApproved ? 'bg-emerald-400' : 'bg-amber-400'
            }`} />

            <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 
                            shadow-lg ${
              isApproved
                ? 'bg-gradient-to-br from-emerald-400 to-green-600 shadow-emerald-500/40'
                : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/40'
            }`}>
              {isApproved ? (
                <ShieldCheck className="w-6 h-6 text-white" />
              ) : (
                <Hourglass className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 relative">
              <p className={`text-base font-extrabold ${isApproved ? 'text-emerald-900' : 'text-amber-900'}`}>
                {isApproved ? 'Your ID Card is Ready!' : 'Request Under Review'}
              </p>
              <p className={`text-xs mt-1.5 leading-relaxed ${isApproved ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isApproved
                  ? 'Your request has been approved. Print your ID Card from the Profile page.'
                  : 'Your request has been submitted and is being reviewed by the office. You will be able to print your ID Card once it is approved.'}
              </p>
            </div>
          </motion.div>

          {/* Request Details */}
          <SectionHeader icon={IdCard} title="Request Details" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-5 p-5 rounded-2xl 
                       bg-gradient-to-br from-gray-50 via-white to-gray-50 
                       border border-gray-100 shadow-sm"
          >
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-white 
                            bg-white shadow-xl shrink-0 flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Submitted" className="w-full h-full object-cover" />
              ) : (
                <IdCard className="w-10 h-10 text-gray-300" />
              )}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/5" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Request ID</p>
                <p className="text-base font-extrabold text-gray-900 truncate font-mono mt-0.5">
                  {existingRequest.name}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Submitted {formatDate(existingRequest.creation)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  Status
                </span>
                <StatusBadge status={status} />
              </div>
            </div>
          </motion.div>

          {/* CTA for approved */}
          {isApproved && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              type="button"
              onClick={() => (window.location.href = '/profile')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative w-full mt-6 py-4 rounded-2xl 
                         bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500
                         text-white text-sm font-extrabold tracking-tight
                         hover:from-green-600 hover:via-emerald-600 hover:to-teal-600
                         transition-all duration-300
                         flex items-center justify-center gap-2 
                         shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40
                         overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                              -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <ArrowRight className="w-4 h-4" />
              Go to Profile & Print ID Card
            </motion.button>
          )}

          {/* Timeline for pending */}
          {isPending && (
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-white 
                            border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">
                What happens next?
              </p>
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 
                                  flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs font-extrabold text-gray-800">Submitted</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Your request has been sent to the office</p>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="relative w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 
                                  flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                    <Hourglass className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs font-extrabold text-amber-700">Under Review</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Office is verifying your photograph</p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex items-start gap-3 opacity-40">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 
                                  flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-xs font-extrabold text-gray-500">Ready to Print</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Once approved, print from Profile page</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {studentInfoCard}
      </div>
    );
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (step === 'success' && createdRequest) {
    const photoUrl = finalPhoto?.dataUrl || resolveFileUrl(createdRequest[SCR_FIELDS.photo]);
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        <SectionCard className="text-center !py-10">
          {/* Confetti-like glow */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full 
                            bg-gradient-to-br from-emerald-300 to-green-400 opacity-20 blur-3xl" />
          </div>

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 
                       flex items-center justify-center mx-auto mb-5 
                       shadow-2xl shadow-emerald-500/40"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 
                            opacity-30 blur-xl animate-pulse" />
          </motion.div>

          <h2 className="relative text-lg font-extrabold text-gray-900 tracking-tight">
            ID Card Request Submitted!
          </h2>
          <p className="relative text-xs text-gray-500 mt-1.5">
            Your request has been sent for review.
          </p>

          <div className="flex justify-center mt-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-36 h-36 rounded-3xl overflow-hidden 
                         border-4 border-white bg-gray-50 
                         shadow-2xl shadow-gray-500/20"
            >
              {photoUrl && <img src={photoUrl} alt="Submitted" className="w-full h-full object-cover" />}
            </motion.div>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Request ID</p>
            <p className="text-sm font-bold text-gray-900 font-mono">{createdRequest.name}</p>
            <div className="flex justify-center mt-3">
              <StatusBadge status={createdRequest.status || 'Pending'} />
            </div>
          </div>

          <div className="mt-7 pt-6 border-t border-gray-100">
            <div className="flex items-start gap-3 text-left 
                            bg-gradient-to-br from-blue-50 to-indigo-50 
                            border border-blue-100 rounded-2xl px-4 py-4">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                Once approved by the office, you can print your ID Card from the{' '}
                <strong>Profile</strong> page.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                        flex items-center justify-center shadow-xl shadow-green-500/30">
          <IdCard className="w-6 h-6 text-white" />
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                          opacity-40 blur-lg" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 leading-tight tracking-tight">
            ID Card Request
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload a photograph to request your ID card
          </p>
        </div>
      </motion.div>

      {/* Load error */}
      {loadError && (
        <SectionCard className="!py-4 !border-red-200 !bg-red-50/50">
          <div className="flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{loadError}</span>
          </div>
        </SectionCard>
      )}

      {/* Rejected banner */}
      {existingRequest && (
        <SectionCard className="!py-4 !border-red-200 !bg-gradient-to-br !from-red-50/70 !to-rose-50/50">
          <div className="flex items-start gap-3 text-red-700 text-xs">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <RefreshCcw className="w-3.5 h-3.5 text-red-600" />
            </div>
            <span className="pt-1 leading-relaxed">
              Your previous request (<strong className="font-mono">{existingRequest.name}</strong>) was marked{' '}
              <strong>Rejected</strong>. You can submit a new one below.
            </span>
          </div>
        </SectionCard>
      )}

      {studentInfoCard}

      {/* Photograph Section */}
      <SectionCard>
        <SectionHeader
          icon={ImageIcon}
          title="ID Card Photograph"
          extra={
            <span className="text-[10px] text-gray-400 font-bold tracking-widest">
              JPG · PNG · WEBP
            </span>
          }
        />

        {finalPhoto ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-2"
          >
            <div className="relative">
              <div className="w-52 h-52 rounded-3xl overflow-hidden border-4 border-white 
                              shadow-2xl shadow-green-500/20">
                <img src={finalPhoto.dataUrl} alt="Final card photo" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-green-400 to-emerald-500 
                              opacity-20 blur-xl -z-10" />
            </div>
            <div className="text-xs text-gray-500 text-center font-semibold 
                            px-3 py-1.5 bg-gray-100 rounded-full">
              {finalPhoto.width} × {finalPhoto.height} · {formatBytes(finalPhoto.sizeBytes)}
            </div>
            <button
              type="button"
              onClick={handleChangePhoto}
              className="text-xs font-bold text-primary-green hover:underline 
                         flex items-center gap-1.5 transition-all hover:gap-2"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Change Photo
            </button>
          </motion.div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center gap-4
                       border-2 border-dashed border-gray-300 rounded-3xl py-14 px-6
                       cursor-pointer hover:border-primary-green 
                       transition-all duration-300 overflow-hidden"
          >
            {/* Background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                            flex items-center justify-center 
                            group-hover:scale-110 group-hover:rotate-3
                            transition-all duration-300 
                            shadow-xl shadow-green-500/30">
              <Camera className="w-9 h-9 text-white" />
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 
                              opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300" />
            </div>

            <div className="relative text-center">
              <p className="text-base font-extrabold text-primary-green tracking-tight">
                Upload Photograph
              </p>
              <p className="text-[11px] text-gray-500 mt-1.5 font-medium">
                Square (1:1) crop · Max {SCR_MAX_ORIGINAL_MB} MB
              </p>
            </div>

            {/* Corner accents */}
            <Scan className="absolute top-4 left-4 w-4 h-4 text-primary-green/40" />
            <Scan className="absolute bottom-4 right-4 w-4 h-4 text-primary-green/40 rotate-180" />
          </motion.div>
        )}

        {selectError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 bg-red-50 border border-red-200 
                       text-red-600 text-[11px] rounded-2xl px-4 py-3 mt-4"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{selectError}</span>
          </motion.div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </SectionCard>

      {/* Info note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative flex items-start gap-3 
                   bg-gradient-to-br from-blue-50 to-indigo-50 
                   border border-blue-100 rounded-2xl px-5 py-4 overflow-hidden"
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-300 opacity-20 blur-2xl" />
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 relative" />
        <p className="text-[11px] text-blue-800 leading-relaxed font-medium relative">
          Make sure your photograph is <strong>clear and front-facing</strong> with good lighting.
          The photo will be reviewed by the office before your ID Card is issued.
        </p>
      </motion.div>

      {submitError && (
        <SectionCard className="!py-4 !border-red-200 !bg-red-50/50">
          <div className="flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{submitError}</span>
          </div>
        </SectionCard>
      )}

      {/* Submit Button — Modern Gradient */}
      <motion.button
        whileHover={!(!finalPhoto || isSubmitting || !studentId) ? { scale: 1.01 } : {}}
        whileTap={!(!finalPhoto || isSubmitting || !studentId) ? { scale: 0.99 } : {}}
        type="button"
        onClick={handleSubmit}
        disabled={!finalPhoto || isSubmitting || !studentId}
        className="relative w-full py-4 rounded-2xl 
                   bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500
                   text-white text-sm font-extrabold tracking-tight
                   hover:from-green-600 hover:via-emerald-600 hover:to-teal-600
                   transition-all duration-300
                   disabled:opacity-40 disabled:cursor-not-allowed
                   disabled:hover:from-green-500 disabled:hover:via-emerald-500 disabled:hover:to-teal-500
                   flex items-center justify-center gap-2 
                   shadow-xl shadow-green-500/30 
                   hover:shadow-2xl hover:shadow-green-500/40
                   overflow-hidden group"
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent 
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Submit ID Card Request
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {showCropper && rawImageSrc && (
          <StudentCardPhotoCropper
            imageSrc={rawImageSrc}
            onCancel={handleCancelCrop}
            onCropped={handleCropped}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentCardRequestPage;