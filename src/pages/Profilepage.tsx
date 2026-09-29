import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GuardianEntry } from '../types';
import { useUser } from '../context/UserContext';
import {
  erpService,
  StudentProfile,
  ProgramEnrollment,
  AttendanceSummary,
  GuardianFullDetail,
} from '../services/erpService';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Mail, Phone, MapPin, Calendar,
  Hash, GraduationCap, BookOpen, Users,
  Droplet, School, CheckCircle2, XCircle,
  TrendingUp, Loader2, AlertCircle, Shield,
  Camera, X, Eye, CreditCard,
  Clock,          // ✅ NAYA (status badge ke liye)
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';   // ✅ NAYA
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { StudentIDCardModal, StudentIDCardData } from '../components/Studentidcardmodal';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PASSPORT_W = 413;
const PASSPORT_H = 531;
const MAX_FILE_MB = 15;
const MAX_DETECT_SIZE = 1280;
const PAD_TOP    = 0.65;
const PAD_SIDES  = 0.50;
const PAD_BOTTOM = 0.30;

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';

const ERP_BASE_URL =
  (import.meta as any).env?.VITE_ERP_BASE_URL || 'https://learnschool.online';

// ─────────────────────────────────────────────────────────────────────────────
// Image helper
// ─────────────────────────────────────────────────────────────────────────────

function resolveImageUrl(image: string | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('/private/')) return undefined;
  if (image.startsWith('http')) return image;
  return `${ERP_BASE_URL}${image}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe singleton
// ─────────────────────────────────────────────────────────────────────────────

let _detector: FaceDetector | null = null;
let _loadPromise: Promise<FaceDetector> | null = null;

async function getFaceDetector(): Promise<FaceDetector> {
  if (_detector) return _detector;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    _detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.4,
    });
    return _detector;
  })();

  return _loadPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas helpers
// ─────────────────────────────────────────────────────────────────────────────

function resizeCanvas(src: HTMLCanvasElement, maxSize: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(src.width, src.height));
  if (scale === 1) return src;
  const out = document.createElement('canvas');
  out.width  = Math.round(src.width  * scale);
  out.height = Math.round(src.height * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function cropHighQuality(
  src: HTMLCanvasElement,
  sx: number, sy: number, sw: number, sh: number
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width  = PASSPORT_W;
  out.height = PASSPORT_H;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PASSPORT_W, PASSPORT_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, PASSPORT_W, PASSPORT_H);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core crop function
// ─────────────────────────────────────────────────────────────────────────────

async function cropToPassport(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const detector = await getFaceDetector();

  const img = await createImageBitmap(file, { colorSpaceConversion: 'default' });
  const origCanvas = document.createElement('canvas');
  origCanvas.width  = img.width;
  origCanvas.height = img.height;
  origCanvas.getContext('2d')!.drawImage(img, 0, 0);
  img.close();

  const detectCanvas = resizeCanvas(origCanvas, MAX_DETECT_SIZE);
  const scaleX = origCanvas.width  / detectCanvas.width;
  const scaleY = origCanvas.height / detectCanvas.height;

  const result = detector.detect(detectCanvas);
  const detections = result?.detections ?? [];

  if (detections.length === 0) {
    throw new Error(
      'Face could not be detected.\n• Use a clear, front-facing photo\n• Take the photo in good lighting\n• Remove sunglasses / face coverings'
    );
  }

  const best = detections.reduce((a, b) =>
    a.boundingBox!.width * a.boundingBox!.height >=
    b.boundingBox!.width * b.boundingBox!.height ? a : b
  );

  const bb = best.boundingBox!;
  const fx = bb.originX * scaleX;
  const fy = bb.originY * scaleY;
  const fw = bb.width   * scaleX;
  const fh = bb.height  * scaleY;

  const padX = fw * PAD_SIDES;
  const padT = fh * PAD_TOP;
  const padB = fh * PAD_BOTTOM;

  let sx = fx - padX;
  let sy = fy - padT;
  let sw = fw + padX * 2;
  let sh = fh + padT + padB;

  const targetRatio = PASSPORT_W / PASSPORT_H;
  if (sw / sh > targetRatio) {
    const newH = sw / targetRatio;
    sy -= (newH - sh) / 2;
    sh = newH;
  } else {
    const newW = sh * targetRatio;
    sx -= (newW - sw) / 2;
    sw = newW;
  }

  const csx = Math.max(0, sx);
  const csy = Math.max(0, sy);
  const csw = Math.min(sw, origCanvas.width  - csx);
  const csh = Math.min(sh, origCanvas.height - csy);

  const passportCanvas = cropHighQuality(origCanvas, csx, csy, csw, csh);

  const blob = await new Promise<Blob>((resolve, reject) =>
    passportCanvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas export failed')),
      'image/jpeg', 0.92
    )
  );

  return { blob, dataUrl: passportCanvas.toDataURL('image/jpeg', 0.92) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PhotoViewModal
// ─────────────────────────────────────────────────────────────────────────────

interface PhotoViewModalProps {
  imageUrl: string;
  studentName: string;
  onClose: () => void;
}

const PhotoViewModal: React.FC<PhotoViewModalProps> = ({ imageUrl, studentName, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ width: 280 }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40
                     flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
        <img
          src={imageUrl}
          alt={studentName}
          className="w-full object-cover"
          style={{ aspectRatio: '413 / 531' }}
        />
        <div className="px-4 py-3 text-center border-t border-gray-100">
          <p className="text-sm font-bold text-gray-800">{studentName}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Passport Photo</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AvatarUploader component
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

interface AvatarUploaderProps {
  currentImage?: string;
  studentName: string;
  studentId: string;
  onUploadSuccess: (url: string) => void;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentImage, studentName, studentId, onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]     = useState<string | null>(currentImage || null);
  const [status, setStatus]       = useState<'idle' | 'processing' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [hovering, setHovering]   = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => { getFaceDetector().catch(() => {}); }, []);
  useEffect(() => { if (currentImage) setPreview(currentImage); }, [currentImage]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Sirf image files allowed hain');
      setStatus('error');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(`File ${MAX_FILE_MB}MB se chhoti honi chahiye`);
      setStatus('error');
      return;
    }

    setStatus('processing');
    setErrorMsg(null);

    const tempUrl = URL.createObjectURL(file);
    setPreview(tempUrl);

    try {
      const { blob } = await cropToPassport(file);
      URL.revokeObjectURL(tempUrl);
      setStatus('uploading');

      const photoFile  = new File([blob], `${studentId}_photo.jpg`, { type: 'image/jpeg' });
      const savedUrl   = await erpService.uploadStudentPhoto(studentId, photoFile);
      const displayUrl = resolveImageUrl(savedUrl) || savedUrl;

      setPreview(displayUrl);
      setStatus('done');
      onUploadSuccess(displayUrl);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred, please try again');
      setStatus('error');
    }
  }, [studentId, onUploadSuccess]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const isBusy = status === 'processing' || status === 'uploading';

  const statusLabel = {
    processing: 'Detecting\nface…',
    uploading:  'Saving…',
    done:       '',
    error:      '',
    idle:       '',
  }[status];

  const handleAvatarClick = () => {
    if (isBusy) return;
    if (preview) setShowPhoto(true);
    else fileInputRef.current?.click();
  };

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative w-20 h-20 rounded-2xl border-4 border-white shadow-xl bg-green-50
                   flex items-center justify-center shrink-0 overflow-hidden
                   -mt-10 z-10 cursor-pointer select-none"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={handleAvatarClick}
      >
        {preview ? (
          <img src={preview} alt={studentName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-extrabold text-primary-green">
            {getInitials(studentName || 'S')}
          </span>
        )}

        {isBusy && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            <span className="text-[8px] text-white text-center px-1 leading-tight whitespace-pre-line">
              {statusLabel}
            </span>
          </div>
        )}

        <AnimatePresence>
          {hovering && !isBusy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1"
            >
              {preview ? (
                <>
                  <Eye className="w-5 h-5 text-white" />
                  <span className="text-[9px] text-white font-semibold">View</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[9px] text-white font-semibold">Upload</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {preview && !isBusy && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 flex items-center gap-1 text-[10px] text-gray-400
                     hover:text-primary-green transition-colors font-medium"
        >
          <Camera className="w-3 h-3" />
          Change
        </button>
      )}

      <AnimatePresence>
        {status === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold z-20"
          >
            <CheckCircle2 className="w-3 h-3" />
            Photo saved!
          </motion.div>
        )}

        {status === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 bg-red-50 border border-red-100 text-red-600 text-[10px]
                       rounded-xl px-3 py-2 max-w-45 z-20 relative"
          >
            <button
              type="button"
              onClick={() => { setStatus('idle'); setErrorMsg(null); }}
              className="absolute top-1 right-1.5 text-red-400 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
            <AlertCircle className="w-3 h-3 inline mr-1" />
            <span className="whitespace-pre-line">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      <AnimatePresence>
        {showPhoto && preview && (
          <PhotoViewModal
            imageUrl={preview}
            studentName={studentName}
            onClose={() => setShowPhoto(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useStudentProfile(studentId: string | undefined) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await erpService.getStudentById(studentId);
        if (!cancelled && data) {
          data.image = resolveImageUrl(data.image);
          setProfile(data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Profile could not be loaded');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return { profile, setProfile, loading, error };
}

export function useAttendanceSummary(studentId: string | undefined) {
  const [summary, setSummary] = useState<AttendanceSummary>({
    total: 0, present: 0, absent: 0, percentage: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await erpService.getAttendanceSummary(studentId);
        if (!cancelled) setSummary(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return { summary, loading };
}

export function useEnrolledCourses(studentId: string | undefined) {
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await erpService.getEnrolledCourses(studentId);
        if (!cancelled) setEnrollments(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return { enrollments, loading };
}

export function useStudentGuardians(profile: StudentProfile | null) {
  const [guardians, setGuardians] = useState<GuardianFullDetail[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const links = profile?.guardians;
    if (!links || links.length === 0) {
      setGuardians([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ids = links.map(g => g.guardian).filter(Boolean) as string[];
        const data = await erpService.getGuardiansDetail(ids);

        if (!cancelled) {
          const relationMap: Record<string, string> = {};
          links.forEach(g => {
            if (g.guardian) relationMap[g.guardian] = g.relation || '';
          });
          setGuardians(
            data.map(g => ({ ...g, relation: relationMap[g.name] || g.relation || '' }))
          );
        }
      } catch {
        if (!cancelled) setGuardians([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile]);

  return { guardians, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function AttendanceRing({ percentage }: { percentage: number }) {
  const r = 34, cx = 42, cy = 42;
  const circumference = 2 * Math.PI * r;
  const dash    = (percentage / 100) * circumference;
  const color   = percentage >= 75 ? '#16a34a' : percentage >= 50 ? '#f59e0b' : '#ef4444';
  const bgColor = percentage >= 75 ? '#dcfce7' : percentage >= 50 ? '#fef3c7' : '#fee2e2';
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx={cx} cy={cy} r={r} fill={bgColor} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={cx} y={cy - 3}  textAnchor="middle" fontSize="15" fontWeight="800" fill={color}>{percentage}%</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="8.5" fontWeight="500" fill="#9ca3af">Attendance</text>
    </svg>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  alwaysShow = false,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  alwaysShow?: boolean;
}) {
  if (!value && !alwaysShow) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{label}</p>
        <p className={`text-sm font-medium mt-0.5 word-break ${value ? 'text-gray-800' : 'text-gray-300 italic'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function GuardianCard({ guardian }: { guardian: GuardianFullDetail }) {
  const initials = (name?: string) =>
    (name || 'G').split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');

  const contactRows = [
    { icon: Phone, label: 'Mobile', value: guardian.mobile_number },
    { icon: Phone, label: 'Alternate', value: guardian.alternate_number },
    { icon: Mail, label: 'Email', value: guardian.email_address },
  ].filter(r => r.value);

  const otherRows = [
    { icon: Calendar, label: 'Date of Birth', value: formatDate(guardian.date_of_birth) },
    { icon: CreditCard, label: 'ID Type', value: guardian.id_type },
    { icon: Hash, label: 'ID Number', value: guardian.id_number },
    { icon: BookOpen, label: 'Education', value: guardian.education },
    { icon: BookOpen, label: 'Occupation', value: guardian.occupation },
    { icon: BookOpen, label: 'Designation', value: guardian.designation },
    { icon: MapPin, label: 'Work Address', value: guardian.work_address },
  ].filter(r => r.value);

  const relationStyle: Record<string, string> = {
    Father: 'bg-blue-50 text-blue-600 border-blue-100',
    Mother: 'bg-pink-50 text-pink-600 border-pink-100',
    Guardian: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  const relBadge = relationStyle[guardian.relation || ''] || 'bg-gray-100 text-gray-500 border-gray-200';

  return (
    <div className="relative h-full w-full flex flex-col rounded-2xl border border-gray-100 bg-white
                     shadow-sm hover:shadow-md transition-shadow overflow-hidden min-h-[280px]">
      <div className="h-1.5 w-full bg-linear-to-r from-green-600 via-emerald-500 to-teal-500" />

      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center
                         justify-center font-bold text-base shrink-0 ring-4 ring-blue-50/50">
          {initials(guardian.guardian_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            {guardian.guardian_name || guardian.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {guardian.relation && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${relBadge}`}>
                {guardian.relation}
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-mono">{guardian.name}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-4">
        {contactRows.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Contact
            </p>
            <div className="flex flex-col gap-2.5">
              {contactRows.map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <r.icon className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide leading-none">
                      {r.label}
                    </p>
                    <p className="text-xs font-semibold text-gray-800 truncate mt-1">
                      {r.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {otherRows.length > 0 && (
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Additional Details
            </p>
            <div className="flex flex-col gap-2.5">
              {otherRows.map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <r.icon className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide leading-none">
                      {r.label}
                    </p>
                    <p className="text-xs font-semibold text-gray-800 break-words mt-1">
                      {r.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contactRows.length === 0 && otherRows.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-300 italic">No additional details available</p>
          </div>
        )}
      </div>

      <div className="mt-auto px-5 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/60">
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
          {guardian.relation || 'Guardian'}
        </span>
        <span className="text-[10px] text-gray-500 font-medium font-mono truncate max-w-[130px]">
          {guardian.name}
        </span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, iconColor }: {
  icon: React.ElementType; label: string; value: string | number; color: string; iconColor: string;
}) {
  return (
    <div className={`rounded-2xl p-4 border ${color} flex flex-col gap-1`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor} mb-1`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-medium opacity-60">{label}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, extra }: {
  icon: React.ElementType; title: string; extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary-green" />
      </div>
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage
// ─────────────────────────────────────────────────────────────────────────────

const COURSE_COLORS = [
  { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  dot: 'bg-violet-400'  },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-400'    },
  { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    dot: 'bg-cyan-400'    },
];

function formatCourseName(raw: string): string {
  return raw.replace(/^[A-Z]{1,5}-/, '');
}

export const ProfilePage: React.FC = () => {
  const { user, role, activeStudentId } = useUser();
  const navigate = useNavigate();   // ✅ NAYA

  const isGuardian = role === 'guardian';

  const studentId: string | undefined = isGuardian
    ? (activeStudentId ?? undefined)
    : (activeStudentId ?? user?.name ?? undefined);

  const { profile, setProfile, loading: profileLoading, error: profileError } = useStudentProfile(studentId);
  const { summary, loading: attLoading }        = useAttendanceSummary(studentId);
  const { enrollments, loading: enrollLoading } = useEnrolledCourses(studentId);
  const { guardians, loading: guardiansLoading } = useStudentGuardians(profile);

  const isLoading  = profileLoading || attLoading || enrollLoading;
  const allCourses = enrollments.flatMap(e => e.courses);
  const displayProfile = profile || user;

  const [showIdCard, setShowIdCard] = useState(false);

  // ✅ APPROVED ID Card Request wali photo
  const [idCardPhoto, setIdCardPhoto] = useState<string | undefined>(undefined);
  const [checkingApproval, setCheckingApproval] = useState(true);
  // ✅ NAYA: Latest request status
  const [latestRequestStatus, setLatestRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setIdCardPhoto(undefined);
      setLatestRequestStatus(null);
      setCheckingApproval(false);
      return;
    }
    let cancelled = false;
    setCheckingApproval(true);

    (async () => {
      try {
        // ✅ Parallel: Approved photo + Latest request status
        const [approvedReq, latestReq] = await Promise.all([
          erpService.getApprovedStudentCardRequest(studentId).catch(() => null),
          erpService.getActiveStudentCardRequest(studentId).catch(() => null),
        ]);

        if (cancelled) return;

        setIdCardPhoto(approvedReq?.photo ? resolveImageUrl(approvedReq.photo) : undefined);
        setLatestRequestStatus(latestReq?.status || null);
      } catch {
        if (!cancelled) {
          setIdCardPhoto(undefined);
          setLatestRequestStatus(null);
        }
      } finally {
        if (!cancelled) setCheckingApproval(false);
      }
    })();

    return () => { cancelled = true; };
  }, [studentId]);

  // ✅ Sirf tab idCardData banao jab approved photo mojood ho
  // ✅ Grade Program Enrollment se utao (priority order)
const gradeValue = (() => {
  const firstEnrollment = enrollments[0];

  // 1. Program (best) — e.g. "LB Grade 3", "FB Grade 10"
  if (firstEnrollment?.program) {
    return firstEnrollment.program;
  }

  // 2. Student batch name — e.g. "Grade 3E"
  if (firstEnrollment?.student_batch_name) {
    return firstEnrollment.student_batch_name;
  }

  // 3. Fallback: custom_batch (agar date nahi hai)
  const customBatch = (displayProfile as any)?.custom_batch;
  if (customBatch && !/^\d{4}-\d{2}-\d{2}/.test(String(customBatch).trim())) {
    return customBatch;
  }

  return undefined;
})();

// ✅ Sirf tab idCardData banao jab approved photo mojood ho
const idCardData: StudentIDCardData | null =
  (displayProfile && studentId && idCardPhoto) ? {
    student_id: studentId,
    student_name: displayProfile.student_name || '',
    grade: gradeValue,                          // ✅ Program Enrollment se
    email: displayProfile.student_email_id,
    image: idCardPhoto,
  } : null;

  const handlePhotoSuccess = useCallback((url: string) => {
    setProfile(prev => prev ? { ...prev, image: url } : prev);
  }, [setProfile]);

  if (isGuardian && !activeStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-2">
          <Users className="w-7 h-7 text-blue-400" />
        </div>
        <p className="text-base font-bold text-gray-700">No Child Selected</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Please select a child from the menu above to view their profile.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-9 h-9 text-primary-green animate-spin" />
        <span className="text-sm text-gray-400 font-medium">
          {isGuardian ? 'Loading child profile…' : 'Loading profile…'}
        </span>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-2xl p-5 border border-red-100 max-w-lg">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm">{profileError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl pb-8">

      {/* Guardian banner */}
      {isGuardian && displayProfile && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3"
        >
          <Users className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 font-medium">
            You are <span className="font-bold">{displayProfile.student_name}</span> viewing profile
          </p>
        </motion.div>
      )}

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm"
      >
        <div className="h-28 bg-linear-to-r from-green-600 via-emerald-500 to-teal-500 relative">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
          />
        </div>

        <div className="px-6 pt-0 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">

            {studentId ? (
              <AvatarUploader
                currentImage={displayProfile?.image}
                studentName={displayProfile?.student_name || 'S'}
                studentId={studentId}
                onUploadSuccess={handlePhotoSuccess}
              />
            ) : null}

            <div className="flex flex-1 flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pt-2">
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
                  {displayProfile?.student_name}
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Tap the avatar — view or change it
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {displayProfile?.custom_student_id_number && (
                    <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                      ID: {displayProfile.custom_student_id_number}
                    </span>
                  )}
                  {enrollments[0]?.program && (
                    <span className="text-[11px] font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                      {enrollments[0].program}
                    </span>
                  )}
                  {displayProfile?.custom_batch && (
                    <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                      Batch: {displayProfile.custom_batch}
                    </span>
                  )}
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    displayProfile?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {displayProfile?.enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {displayProfile?.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <AttendanceRing percentage={summary.percentage} />

                {/* ✅ Approved → Print ID Card */}
                {!checkingApproval && idCardData && (
                  <button
                    onClick={() => setShowIdCard(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-green
                               bg-green-50 hover:bg-green-100 rounded-xl border border-green-200 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Print ID Card
                  </button>
                )}

                {/* ⏳ Pending → Request Pending */}
                {!checkingApproval && !idCardData && latestRequestStatus?.toLowerCase() === 'pending' && (
                  <button
                    onClick={() => navigate('/student-card-request')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700
                               bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Request Pending
                  </button>
                )}

                {/* ❌ Rejected → Request Rejected */}
                {!checkingApproval && !idCardData && latestRequestStatus?.toLowerCase() === 'rejected' && (
                  <button
                    onClick={() => navigate('/student-card-request')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700
                               bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Request Rejected
                  </button>
                )}

                {/* ⚪ No request → Request ID Card */}
                {!checkingApproval && !idCardData && !latestRequestStatus && (
                  <button
                    onClick={() => navigate('/student-card-request')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600
                               bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Request ID Card
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50 my-4" />

          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={CheckCircle2} label="Present" value={summary.present}
              color="bg-emerald-50 border-emerald-100 text-emerald-800" iconColor="bg-emerald-100 text-emerald-600" />
            <StatCard icon={XCircle} label="Absent" value={summary.absent}
              color="bg-red-50 border-red-100 text-red-700" iconColor="bg-red-100 text-red-500" />
            <StatCard icon={BookOpen} label="Courses" value={allCourses.length}
              color="bg-blue-50 border-blue-100 text-blue-700" iconColor="bg-blue-100 text-blue-500" />
          </div>
        </div>
      </motion.div>

      {/* Two-column detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <SectionHeader icon={User} title="Personal Information" />
          <InfoRow icon={Shield}   label="Profile ID"      value={studentId}                                 alwaysShow />
          <InfoRow icon={Mail}     label="Email"           value={displayProfile?.student_email_id} />
          <InfoRow icon={Phone}    label="Mobile"          value={displayProfile?.student_mobile_number} />
          <InfoRow icon={User}     label="Gender"          value={displayProfile?.gender}                    alwaysShow />
          <InfoRow icon={Calendar} label="Date of Birth"   value={formatDate(displayProfile?.date_of_birth)} alwaysShow />
          <InfoRow icon={Droplet}  label="Blood Group"     value={displayProfile?.blood_group} />
          <InfoRow icon={MapPin}   label="City"            value={displayProfile?.city} />
          <InfoRow icon={MapPin}   label="Country"         value={displayProfile?.country} />
          <InfoRow icon={Calendar} label="Joining Date"    value={formatDate(displayProfile?.joining_date)} />
          <InfoRow icon={School}   label="Previous School" value={displayProfile?.custom_previous_school_record} />
          
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="h-full"
        >
          <div className="h-full bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
            <SectionHeader
              icon={BookOpen}
              title="Enrolled in Program"
              extra={allCourses.length > 0 ? (
                <span className="text-xs text-gray-400 font-medium">
                  {allCourses.length} {allCourses.length === 1 ? 'course' : 'courses'}
                </span>
              ) : undefined}
            />
            {allCourses.length > 0 ? (
              <div className="space-y-2 overflow-y-auto pr-1 -mr-1 max-h-[420px]">
                {allCourses.map((course, i) => {
                  const c = COURSE_COLORS[i % COURSE_COLORS.length];
                  const name = formatCourseName(course.course_name || course.course || '');
                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-xl border ${c.bg} ${c.border} px-4 py-3`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                      <span className={`text-sm font-semibold ${c.text}`}>{name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-300 italic font-medium">—</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* GUARDIANS SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
      >
        <SectionHeader
          icon={Users}
          title="Guardians"
          extra={
            guardians.length > 0 ? (
              <span className="text-xs text-gray-400 font-medium">
                {guardians.length} {guardians.length === 1 ? 'guardian' : 'guardians'}
              </span>
            ) : undefined
          }
        />

        {guardiansLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading guardian details…
          </div>
        ) : guardians.length === 0 ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-300 italic font-medium">
              No guardian records found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
            {guardians.map(g => (
              <GuardianCard key={g.name} guardian={g} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ID Card print modal */}
      <StudentIDCardModal
        student={showIdCard ? idCardData : null}
        onClose={() => setShowIdCard(false)}
      />
    </div>
  );
};

export default ProfilePage;