import React from 'react';
import { useUser, LinkedStudent } from '../context/UserContext';
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  GraduationCap,
  BrainCircuit,
  LogOut,
  Menu,
  X,
  Bell,
  CalendarDays,
  UserCircle,
  Wallet,
  ClipboardList,
  Newspaper,
  ChevronDown,
  Users,
  Sparkles,
  RefreshCw,
  Clock,
  AlertCircle,
  Inbox,
  Radio,
  ScrollText,
  School,
  Timer,
  Activity,
  IdCard,          // ← NAYA icon import
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNoticeBoard, NoticeType } from '../Hooks/Usenoticeboard';
import { format } from 'date-fns';

const LOGO_URL = 'https://share.google/vUsEtSdU87MNHPc2R/logo.png';

type UserRole = 'student' | 'guardian';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  allowedRoles?: UserRole[];
}

// ── getNavItems role-based ──────────────────────────────────────────
function getNavItems(role: UserRole): NavItem[] {
  return [
    { name: 'Dashboard',    path: '/',             icon: LayoutDashboard },
    { name: 'Attendance',   path: '/attendance',   icon: CalendarCheck   },
    { name: 'Classroom',    path: '/classroom',    icon: School          },
    { name: 'Results',      path: '/results',      icon: GraduationCap,  allowedRoles: ['student'] },
    { name: 'Schedule',     path: '/schedule',     icon: CalendarDays    },
    { name: 'Report Card',  path: '/report-card',  icon: ClipboardList   },
    { name: 'Fees',         path: '/fees',         icon: Wallet,         allowedRoles: ['guardian'] },
    { name: 'Notice Board', path: '/notice-board', icon: Newspaper       },

    // ✅ NAYA: Student Card Request (dono roles ke liye)
    {
      name: role === 'guardian' ? "Child's Student Card" : 'Student Card',
      path: '/student-card-request',
      icon: IdCard,
    },

    // ── NAYA: Screen Time ─────────────────────────────────────────
    {
      name: role === 'guardian' ? "Child's Screen Time" : 'Screen Time',
      path: '/screen-time',
      icon: Clock,
    },

    // ── Login Activity (existing) ─────────────────────────────────
    {
      name: role === 'guardian' ? "Child's Activity" : 'Login Activity',
      path: '/login-activity',
      icon: Timer,
    },

    { name: 'Profile',      path: '/profile',      icon: UserCircle      },
  ];
}

function getVisibleNav(role: UserRole): NavItem[] {
  return getNavItems(role).filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role)
  );
}

const avatarColors = [
  { bg: '#E8F5E9', text: '#2E7D32' },
  { bg: '#E3F2FD', text: '#1565C0' },
  { bg: '#FFF3E0', text: '#E65100' },
  { bg: '#F3E5F5', text: '#6A1B9A' },
  { bg: '#FCE4EC', text: '#AD1457' },
  { bg: '#E0F7FA', text: '#00695C' },
];

function getAvatarColor(name: string) {
  const idx = (name?.charCodeAt(0) ?? 0) % avatarColors.length;
  return avatarColors[idx];
}

function ChildAvatar({ name, size = 32, active = false }: { name: string; size?: number; active?: boolean }) {
  const color = getAvatarColor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: active ? '#1B6A3B' : color.bg,
        color: active ? '#fff' : color.text,
        fontSize: size * 0.42,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: active ? '0 2px 8px rgba(27,106,59,0.25)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      {name?.charAt(0)?.toUpperCase()}
    </div>
  );
}

// ─── Notice Type Config ───────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  NoticeType | 'ALL',
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string; dot: string }
> = {
  ALL:      { label: 'All',      icon: <Bell className="w-3 h-3" />,       color: 'text-gray-700',   bg: 'bg-gray-100',   border: 'border-gray-200',  dot: 'bg-gray-400'   },
  NEWS:     { label: 'News',     icon: <Newspaper className="w-3 h-3" />,  color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',  dot: 'bg-blue-500'   },
  STREAM:   { label: 'Stream',   icon: <Radio className="w-3 h-3" />,      color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200',dot: 'bg-purple-500' },
  CIRCULAR: { label: 'Circular', icon: <ScrollText className="w-3 h-3" />, color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200', dot: 'bg-amber-500'  },
};

// ─── Notice Dropdown ──────────────────────────────────────────────────────────
const NoticeDropdown: React.FC<{ onClose: () => void; onViewAll: () => void }> = ({ onClose, onViewAll }) => {
  const { notices, filteredNotices, activeFilter, isLoading, error, setActiveFilter, refetch } = useNoticeBoard();

  const countFor = (type: NoticeType | 'ALL') =>
    type === 'ALL' ? notices.length : notices.filter((n) => n.type === type).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 400,
        maxWidth: 'calc(100vw - 32px)',
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #EAEEEA',
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: '1px solid #F0F4F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell style={{ width: 16, height: 16, color: '#1B6A3B' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Notice Board</span>
          {notices.length > 0 && (
            <span style={{
              background: '#1B6A3B',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: 50,
            }}>
              {notices.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={refetch}
            disabled={isLoading}
            style={{
              padding: 6,
              borderRadius: 8,
              border: '1px solid #EAEEEA',
              background: '#fff',
              cursor: 'pointer',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 8,
              border: '1px solid #EAEEEA',
              background: '#fff',
              cursor: 'pointer',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #F0F4F0' }}>
        {(['ALL', 'NEWS', 'STREAM', 'CIRCULAR'] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const isActive = activeFilter === type;
          const count = countFor(type);
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 50,
                border: `1.5px solid ${isActive ? 'currentColor' : '#E5E7EB'}`,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: isActive ? undefined : '#fff',
              }}
              className={isActive ? `${cfg.bg} ${cfg.color}` : 'text-gray-500'}
            >
              {cfg.icon}
              {cfg.label}
              {count > 0 && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: 50,
                  background: isActive ? 'rgba(255,255,255,0.6)' : '#F3F4F6',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notice List */}
      <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 10px' }}>
        {isLoading && (
          <div style={{ padding: '20px 0' }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ padding: '12px', borderRadius: 14, marginBottom: 8, background: '#F9FAFB' }} className="animate-pulse">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ height: 18, width: 50, background: '#E5E7EB', borderRadius: 50 }} />
                  <div style={{ height: 18, width: 80, background: '#E5E7EB', borderRadius: 50, marginLeft: 'auto' }} />
                </div>
                <div style={{ height: 14, width: '70%', background: '#E5E7EB', borderRadius: 6, marginBottom: 6 }} />
                <div style={{ height: 12, width: '100%', background: '#E5E7EB', borderRadius: 6 }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div style={{
            margin: '8px 0',
            padding: '12px 14px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', margin: 0 }}>Failed to load notices</p>
              <p style={{ fontSize: 11, color: '#EF4444', margin: '2px 0 0' }}>{error}</p>
            </div>
            <button
              onClick={refetch}
              style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#fff', border: '1px solid #FCA5A5', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && filteredNotices.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Inbox style={{ width: 32, height: 32, color: '#E5E7EB', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', margin: 0 }}>No notices found</p>
            <p style={{ fontSize: 11, color: '#D1D5DB', marginTop: 4 }}>
              {activeFilter === 'ALL'
                ? 'No notices have been posted yet.'
                : `No ${TYPE_CONFIG[activeFilter].label} notices available.`}
            </p>
          </div>
        )}

        {!isLoading && !error && filteredNotices.length > 0 && (
          <AnimatePresence mode="popLayout">
            {filteredNotices.map((notice, i) => {
              const cfg = TYPE_CONFIG[notice.type] ?? TYPE_CONFIG['NEWS'];
              const date = new Date(notice.creation);
              return (
                <motion.div
                  key={notice.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: `1px solid`,
                    marginBottom: 8,
                    background: '#FAFAFA',
                    transition: 'box-shadow 0.15s',
                  }}
                  className={cfg.border}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 50,
                    }} className={`${cfg.bg} ${cfg.color}`}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%' }} className={cfg.dot} />
                      {cfg.label}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9CA3AF' }}>
                      <Clock style={{ width: 10, height: 10 }} />
                      {format(date, 'dd MMM · hh:mm a')}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 4px', lineHeight: 1.4 }}>
                    {notice.subject}
                  </h4>

                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {notice.message}
                  </p>

                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                      By <span style={{ fontWeight: 600, color: '#6B7280' }}>{notice.owner}</span>
                    </span>
                    <span style={{ fontSize: 9, color: '#D1D5DB', fontFamily: 'monospace' }}>{notice.name}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid #F0F4F0' }}>
        <button
          onClick={onViewAll}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 12,
            border: '1.5px solid #D1FAE5',
            background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
            color: '#1B6A3B',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          View All Notices →
        </button>
      </div>
    </motion.div>
  );
};

// ─── Main Layout ──────────────────────────────────────────────────────────────
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, linkedStudents, setActiveStudentId, activeStudentId } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [childMenuOpen, setChildMenuOpen] = React.useState(false);
  const [noticeOpen, setNoticeOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const noticeDropdownRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const role: UserRole = user?.role === 'guardian' ? 'guardian' : 'student';
  const visibleNav = getVisibleNav(role);

  const displayName = role === 'guardian'
    ? (user as any)?.guardian_name
    : (user as any)?.student_name;

  const portalLabel = role === 'guardian' ? 'Parents Portal' : 'Student Portal';
  const activeChild = linkedStudents.find(s => s.student === activeStudentId);
  const showSwitcher = role === 'guardian' && linkedStudents.length > 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setChildMenuOpen(false);
      }
    }
    if (childMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [childMenuOpen]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (noticeDropdownRef.current && !noticeDropdownRef.current.contains(e.target as Node)) {
        setNoticeOpen(false);
      }
    }
    if (noticeOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [noticeOpen]);

  const fallbackLetter = role === 'guardian' ? 'P' : 'S';

  const LogoMark = ({ size = 40 }: { size?: number }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1B6A3B 0%, #28A55A 100%)',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(27,106,59,0.3)',
        fontSize: size * 0.5,
        fontWeight: 700,
        color: '#fff',
      }}
    >
      {LOGO_URL ? (
        <img
          src={LOGO_URL}
          alt="Logo"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerText = fallbackLetter;
          }}
        />
      ) : fallbackLetter}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#F0F4F0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .nav-link-active { background: linear-gradient(135deg, #E8F5E0 0%, #D4EDDA 100%); color: #1B6A3B !important; font-weight: 600; }
        .nav-link-active .nav-icon { color: #1B6A3B; }
        .nav-link:hover:not(.nav-link-active) { background: #F5F7F5; color: #2d2d2d !important; }
        .sidebar-glow { box-shadow: 4px 0 24px rgba(0,0,0,0.06); }
        .child-btn-active { background: linear-gradient(135deg, #1B6A3B, #28A55A) !important; color: white !important; box-shadow: 0 4px 14px rgba(27,106,59,0.3); }
        .child-btn-active span { color: white !important; }
        .child-btn:not(.child-btn-active):hover { background: #F5FAF6 !important; }
        .logout-btn:hover { background: #FFF1F1 !important; color: #DC2626 !important; }
        .top-bar-glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .notification-btn:hover { background: #F5F7F5; transform: scale(1.05); }
        .notification-btn-active { background: #F0FDF4 !important; border-color: #D1FAE5 !important; color: #1B6A3B !important; }
        .profile-btn:hover { box-shadow: 0 0 0 3px rgba(27,106,59,0.25); }
        .main-card { background: #fff; border-radius: 20px; box-shadow: 0 2px 16px rgba(0,0,0,0.06); }
        .child-dropdown-item:hover { background: #F5FAF6 !important; }
        .notice-scroll::-webkit-scrollbar { width: 4px; }
        .notice-scroll::-webkit-scrollbar-track { background: transparent; }
        .notice-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
      `}</style>

      {/* ── Sidebar Desktop ─────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col sticky top-0 h-screen sidebar-glow"
        style={{ width: 260, background: '#fff', borderRight: '1px solid #EAEEEA' }}
      >
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #F0F4F0' }}>
          <div className="flex items-center gap-3">
            <LogoMark size={42} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#1a1a1a', letterSpacing: '-0.3px' }}>Portal</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1B6A3B', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{portalLabel}</div>
            </div>
          </div>
        </div>

        {showSwitcher && (
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #F0F4F0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 8 }}>
              Viewing Child
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {linkedStudents.map((child) => {
                const isActive = activeStudentId === child.student;
                return (
                  <button
                    key={child.student}
                    onClick={() => setActiveStudentId(child.student)}
                    className={`child-btn flex items-center gap-3 w-full text-left transition-all ${isActive ? 'child-btn-active' : ''}`}
                    style={{ padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: isActive ? undefined : 'transparent' }}
                  >
                    <ChildAvatar name={child.student_name ?? ''} size={32} active={isActive} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {child.student_name}
                      </div>
                      <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>{child.student}</div>
                    </div>
                    {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link flex items-center gap-3 transition-all duration-200 ${isActive ? 'nav-link-active' : ''}`}
              style={{ padding: '10px 14px', borderRadius: 12, textDecoration: 'none', color: '#6B7280', fontSize: 14, fontWeight: 500 }}
            >
              <item.icon className="nav-icon w-[18px] h-[18px] flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid #F0F4F0' }}>
          <button
            onClick={handleLogout}
            className="logout-btn flex items-center gap-3 w-full transition-all duration-200"
            style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ──────────────────────────────────────────── */}
      <header
        className="md:hidden sticky top-0 z-50 top-bar-glass flex items-center justify-between"
        style={{ padding: '12px 16px', borderBottom: '1px solid #EAEEEA' }}
      >
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>Portal</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#1B6A3B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{portalLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showSwitcher && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setChildMenuOpen(!childMenuOpen)}
                className="flex items-center gap-1.5"
                style={{ padding: '6px 12px', borderRadius: 50, border: '1.5px solid #D1FAE5', background: '#F0FDF4', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1B6A3B', gap: 6 }}
              >
                <ChildAvatar name={activeChild?.student_name ?? ''} size={20} active />
                <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeChild?.student_name?.split(' ')[0]}
                </span>
                <ChevronDown style={{ width: 12, height: 12, transition: 'transform 0.2s', transform: childMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>

              <AnimatePresence>
                {childMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 100, background: '#fff', border: '1px solid #EAEEEA', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: 8, minWidth: 200 }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px 8px' }}>Switch Child</div>
                    {linkedStudents.map((child) => {
                      const isActive = activeStudentId === child.student;
                      return (
                        <button
                          key={child.student}
                          onClick={() => { setActiveStudentId(child.student); setChildMenuOpen(false); }}
                          className="child-dropdown-item flex items-center gap-3 w-full text-left transition-all"
                          style={{ padding: '10px 10px', borderRadius: 10, border: 'none', background: isActive ? 'linear-gradient(135deg,#E8F5E0,#D4EDDA)' : 'transparent', cursor: 'pointer' }}
                        >
                          <ChildAvatar name={child.student_name ?? ''} size={34} active={isActive} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#1B6A3B' : '#374151' }}>{child.student_name}</div>
                            <div style={{ fontSize: 10, color: '#9CA3AF' }}>{child.student}</div>
                          </div>
                          {isActive && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#1B6A3B', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ padding: 6, borderRadius: 10, border: '1px solid #EAEEEA', background: '#fff', cursor: 'pointer', color: '#374151' }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Menu Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -280 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -280 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: '#fff', paddingTop: 72 }}
          >
            {showSwitcher && (
              <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #F0F4F0', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Viewing Child</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {linkedStudents.map((child) => {
                    const isActive = activeStudentId === child.student;
                    return (
                      <button
                        key={child.student}
                        onClick={() => { setActiveStudentId(child.student); setIsMobileMenuOpen(false); }}
                        className={`child-btn flex items-center gap-3 w-full text-left transition-all ${isActive ? 'child-btn-active' : ''}`}
                        style={{ padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: isActive ? undefined : 'transparent' }}
                      >
                        <ChildAvatar name={child.student_name ?? ''} size={36} active={isActive} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? '#fff' : '#374151' }}>{child.student_name}</div>
                          <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.65)' : '#9CA3AF' }}>{child.student}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <nav style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {visibleNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `nav-link flex items-center gap-4 transition-all duration-200 ${isActive ? 'nav-link-active' : ''}`}
                  style={{ padding: '14px 16px', borderRadius: 14, textDecoration: 'none', color: '#6B7280', fontSize: 16, fontWeight: 500 }}
                >
                  <item.icon className="nav-icon w-5 h-5" />
                  {item.name}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-4"
                style={{ padding: '14px 16px', borderRadius: 14, border: 'none', background: 'transparent', cursor: 'pointer', color: '#DC2626', fontSize: 16, fontWeight: 500, marginTop: 4 }}
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>

        <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Sparkles style={{ width: 16, height: 16, color: '#1B6A3B' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1B6A3B', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {role === 'guardian' ? "Parents Portal" : "Student Portal"}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', margin: 0 }}>
              Welcome back, {displayName} 👋
            </h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2, fontWeight: 400 }}>
              {role === 'guardian'
                ? "Here's your child's academic overview."
                : "Here's what's happening with your studies today."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div style={{ position: 'relative' }} ref={noticeDropdownRef}>
              <button
                onClick={() => setNoticeOpen((prev) => !prev)}
                className={`notification-btn transition-all duration-200 ${noticeOpen ? 'notification-btn-active' : ''}`}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  border: '1.5px solid #EAEEEA', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#6B7280', position: 'relative',
                }}
              >
                <Bell style={{ width: 18, height: 18 }} />
                <span style={{
                  position: 'absolute', top: 8, right: 8, width: 7, height: 7,
                  background: '#EF4444', borderRadius: '50%', border: '2px solid #fff',
                }} />
              </button>

              <AnimatePresence>
                {noticeOpen && (
                  <NoticeDropdown
                    onClose={() => setNoticeOpen(false)}
                    onViewAll={() => { setNoticeOpen(false); navigate('/notice-board'); }}
                  />
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => navigate('/profile')}
              className="profile-btn transition-all duration-200"
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #E8F5E0, #D4EDDA)',
                border: '2px solid #fff', overflow: 'hidden',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="View Profile"
            >
              {(user as any)?.image ? (
                <img src={(user as any).image} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontWeight: 800, fontSize: 15, color: '#1B6A3B' }}>
                  {displayName?.charAt(0)}
                </span>
              )}
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};