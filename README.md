<div align="center">

<img src="https://img.shields.io/badge/Learn_School-Student_%26_Parent_Portal-1B6A3B?style=for-the-badge&logo=react&logoColor=white" alt="Learn School Portal" />

# 🎓 Learn School — Student & Parent Portal

**A modern, feature-rich Student & Parent Portal for Learn School**  
*Built with React + TypeScript + Vite + Tailwind CSS, fully integrated with ERPNext (Frappe Framework)*

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![ERPNext](https://img.shields.io/badge/ERPNext-Frappe-0089FF?style=flat-square&logo=frappe&logoColor=white)](https://erpnext.com)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](http://makeapullrequest.com)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [ID Card Flow](#-id-card-request-flow) • [Structure](#-project-structure) • [Contributing](#-contributing)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 Academic
- **Dashboard** — Overview of student's academic life
- **Attendance** — Daily & summary view with animated rings
- **Results** — Assessment results with grades
- **Report Cards** — View & download with PSD tracking
- **Schedule** — Weekly & daily class schedules
- **Classroom** — Course details & materials

</td>
<td width="50%">

### 💳 Student Services
- **ID Card Request** — Photo submission with admin approval
- **Fees** — Invoices & payment tracking
- **Notice Board** — News, streams & circulars
- **Screen Time** — Device usage monitoring
- **Login Activity** — Account security log
- **Profile** — Personal info & guardian details

</td>
</tr>
</table>

### 🎯 Key Highlights

- ✅ **Dual Portal** — Student & Guardian (Parent) views with child switcher
- ✅ **AI Face Detection** — MediaPipe-powered smart avatar upload with auto-crop to passport size (413×531)
- ✅ **ID Card Photo Cropper** — Manual square (1:1) cropper with zoom, rotate & drag
- ✅ **Modern UI** — Glassmorphism, smooth animations, gradient accents
- ✅ **Status-Based Access** — Only approved requests can print ID cards
- ✅ **ERPNext Integration** — Full CRUD via REST API
- ✅ **Role-Based Security** — Enforced at backend (Frappe roles)
- ✅ **CSRF Protection** — Token-based request security
- ✅ **Responsive Design** — Mobile-first with desktop optimization

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|:------|:-----------|
| **Frontend Framework** | ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| **Build Tool** | ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) |
| **Styling** | ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) |
| **Animations** | ![Framer](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white) |
| **Icons** | ![Lucide](https://img.shields.io/badge/Lucide_React-F56565?style=flat-square&logo=lucide&logoColor=white) |
| **Routing** | ![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=reactrouter&logoColor=white) |
| **HTTP Client** | ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white) |
| **Face Detection** | ![MediaPipe](https://img.shields.io/badge/MediaPipe_Tasks_Vision-0097A7?style=flat-square&logo=google&logoColor=white) |
| **Backend** | ![ERPNext](https://img.shields.io/badge/ERPNext-Frappe-0089FF?style=flat-square&logo=frappe&logoColor=white) |
| **Fonts** | ![Plus Jakarta Sans](https://img.shields.io/badge/Plus_Jakarta_Sans-000000?style=flat-square&logo=googlefonts&logoColor=white) |

</div>

---

## 🚀 Getting Started

### 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** `v18.0.0` or higher — [Download](https://nodejs.org)
- **npm** `v9.0.0` or higher (comes with Node.js)
- **Git** — [Download](https://git-scm.com)
- **Access** to an **ERPNext** instance (backend)

### 📦 Installation

```bash
# 1. Clone the repository
git clone https://github.com/QADEER-AHMED-cs/learn-school-student-portal.git

# 2. Navigate into the project
cd learn-school-student-portal

# 3. Install dependencies
npm install

# 4. Copy environment template
cp .env.example .env

# 5. Edit .env with your ERPNext credentials
```

### 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# ERPNext Configuration
VITE_ERP_BASE_URL=https://your-erpnext-instance.com
VITE_ERP_API_KEY=your_api_key_here
VITE_ERP_API_SECRET=your_api_secret_here
```

> 

### 🎬 Run Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 🏗️ Build for Production

```bash
npm run build
npm run preview
```

The production build will be in the `dist/` folder.

---

## 🎯 ID Card Request Flow

The **ID Card Request** feature allows students to submit a photograph, which admins review before students can print their official ID card.

### 📊 Flow Diagram

```
┌─────────────────────────────────────┐
│        🌐  LOGIN                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     🔐  AUTHENTICATION              │
│     (ERPNext Session + CSRF)        │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│  👨‍🎓 STUDENT│  │👨‍👩‍👧 GUARDIAN │
└──────┬──────┘  └──────┬──────┘
       │                │
       │                ▼
       │         ┌─────────────┐
       │         │ Child Switch│
       │         └──────┬──────┘
       │                │
       └────────┬───────┘
                │
                ▼
┌─────────────────────────────────────┐
│       📊  DASHBOARD                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       📚  MODULES                   │
│                                     │
│  • Attendance  • Results            │
│  • Report Card • Schedule           │
│  • Classroom   • Fees               │
│  • Notice Board • Screen Time       │
│  • Login Activity • ID Card         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    🆕  ID CARD REQUEST              │
│                                     │
│    1. Upload Photo                  │
│         │                           │
│         ▼                           │
│    2. Crop (1:1)                    │
│         │                           │
│         ▼                           │
│    3. Submit → PENDING              │
│         │                           │
│         ▼                           │
│    4. Admin Reviews                 │
│         │                           │
│    ┌────┼────┬──────┐               │
│    ▼    ▼    ▼      ▼               │
│    ✅   ❌   🗑️     ⏳               │
│                                     │
│         │                           │
│         ▼                           │
│    5. If APPROVED:                  │
│       → Profile Page                │
│       → Click "Print ID Card"       │
│       → Download PDF 🖨️             │
│                                     │
└─────────────────────────────────────┘
```

### 📝 Status Management

| Status | Icon | Student Can Print? | Admin Action |
|:-------|:----:|:------------------:|:-------------|
| **Pending** | ⏳ | ❌ No | Review & approve/reject |
| **Approved** | ✅ | ✅ **Yes** | Already processed |
| **Rejected** | ❌ | ❌ No | Student can re-submit |
| **Cancelled** | 🗑️ | ❌ No | Deleted by admin |

### 🎭 Two Photo Workflows

<table>
<tr>
<td width="50%">

#### 🖼️ Profile Avatar (Face Detection)
**File:** `Profilepage.tsx`  
**Technology:** MediaPipe Tasks Vision

- ✅ Automatic face detection
- ✅ Auto-crop to passport size (413×531)
- ✅ Face-centered crop with padding
- ✅ Rejects photos without a face
- ✅ GPU-accelerated detection

**Flow:** Upload → Auto-detect → Auto-crop → Done

</td>
<td width="50%">

#### 📸 ID Card Photo (Manual Crop)
**File:** `StudentCardPhotoCropper.tsx`  
**Technology:** Canvas API

- ✅ Manual square crop (600×600)
- ✅ Zoom control (1x - 3x)
- ✅ Rotate (90° steps)
- ✅ Drag to reposition
- ✅ Rule-of-thirds grid overlay

**Flow:** Upload → Crop → Zoom/Rotate → Confirm

</td>
</tr>
</table>

### 🗂️ ERPNext Doctype Configuration

**Doctype Name:** `ID Card Request` (Education module)

| Field Name | Type | Description |
|:-----------|:-----|:------------|
| `studentid` | Link → Student | Reference to student |
| `photo` | Attach Image | Student photograph |
| `status` | Select | `Pending` / `Approved` / `Rejected` |
| `remarks_by_office` | Data | Admin notes (optional) |

**Role Permissions:**

| Role | Read | Write | Create | Cancel | Delete |
|:-----|:----:|:-----:|:------:|:------:|:------:|
| `Student` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `Guardian` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `System Manager` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📁 Project Structure

```
learn-school-student-portal/
│
├── 📁 public/                            # Static assets
│
├── 📁 src/
│   │
│   ├── 📁 components/                    # Reusable UI components
│   │   ├── Layout.tsx                    # Main layout with sidebar
│   │   ├── Studentidcardmodal.tsx        # ID card print modal
│   │   ├── StudentCardPhotoCropper.tsx   # Manual square photo cropper
│   │   ├── Schedulecard.tsx              # Schedule card
│   │   ├── Feevouchermodal.tsx           # Fee voucher
│   │   └── AssignmentSubmissionModal.tsx
│   │
│   ├── 📁 context/                       # React Context
│   │   └── UserContext.tsx               # Auth & user state
│   │
│   ├── 📁 Hooks/                         # Custom hooks
│   │   ├── useStudentProfile.ts
│   │   ├── useAttendance.ts
│   │   ├── useQuizzes.ts
│   │   ├── Usenoticeboard.ts
│   │   ├── useLoginActivity.ts
│   │   └── ...
│   │
│   ├── 📁 lib/                           # Utilities & configs
│   │   ├── utils.ts                      # Helper functions
│   │   ├── timezone.ts                   # Timezone utilities
│   │   └── studentCardRequestConfig.ts   # ID card constants
│   │
│   ├── 📁 pages/                         # Route pages
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Attendance.tsx
│   │   ├── Results.tsx
│   │   ├── Reportcardpage.tsx
│   │   ├── Schedulepage.tsx
│   │   ├── Feespage.tsx
│   │   ├── Noticeboardpage.tsx
│   │   ├── Classroom.tsx
│   │   ├── ClassroomCourseDetail.tsx
│   │   ├── StudentCardRequestPage.tsx    # 🆕 ID Card Request
│   │   ├── Profilepage.tsx               # Profile + Face Detection
│   │   ├── ScreenTimePage.tsx
│   │   ├── LoginActivityPage.tsx
│   │   └── ParentLoginActivityPage.tsx
│   │
│   ├── 📁 services/                      # API services
│   │   ├── erpService.ts                 # ERPNext API client
│   │   └── classroomService.ts           # Classroom API
│   │
│   ├── 📁 types/                         # TypeScript types
│   │   └── classroom.ts
│   │
│   ├── App.tsx                           # Main app & routes
│   ├── main.tsx                          # Entry point
│   ├── index.css                         # Global styles
│   └── types.ts                          # Shared types
│
├── 📄 .env.example                       # Environment template
├── 📄 .gitignore                         # Git ignore rules
├── 📄 index.html                         # HTML entry
├── 📄 package.json                       # Dependencies
├── 📄 tsconfig.json                      # TS config
├── 📄 vite.config.ts                     # Vite config
└── 📄 README.md                          # You're here!
```

---

## 🔐 Security

This project follows security best practices:

| Layer | Protection |
|:------|:-----------|
| **Authentication** | ERPNext session-based auth |
| **CSRF** | Token-based request signing |
| **Roles** | Student / Guardian role enforcement |
| **Backend** | Field-level permissions in ERPNext |
| **ID Card** | Only `Approved` status can print |
| **Uploads** | File type & size validation (max 10 MB, JPG/PNG/WebP) |
| **Environment** | Secrets in `.env` (gitignored) |

---

## 🎨 Design System

### 🎨 Color Palette

| Purpose | Color | Hex |
|:--------|:------|:----|
| Primary Brand | ![](https://via.placeholder.com/15/1B6A3B/1B6A3B) Green | `#1B6A3B` |
| Secondary | ![](https://via.placeholder.com/15/16A34A/16A34A) Emerald | `#16A34A` |
| Success | ![](https://via.placeholder.com/15/22C55E/22C55E) Green | `#22C55E` |
| Warning | ![](https://via.placeholder.com/15/F59E0B/F59E0B) Amber | `#F59E0B` |
| Error | ![](https://via.placeholder.com/15/EF4444/EF4444) Red | `#EF4444` |
| Neutral | ![](https://via.placeholder.com/15/6B7280/6B7280) Gray | `#6B7280` |

### 🖋️ Typography

- **Font Family:** `Plus Jakarta Sans`
- **Weights:** 400, 500, 600, 700, 800

### 🎭 Components

- **Glassmorphism** cards with backdrop blur
- **Gradient accents** on interactive elements
- **Smooth animations** with Framer Motion
- **Consistent 8px spacing** grid

---

## 🧪 Testing Checklist

- [x] Login as Student
- [x] Login as Guardian (with child switcher)
- [x] Submit ID Card Request with photo
- [x] Manual square crop with zoom/rotate
- [x] Admin approves request in ERPNext
- [x] Student sees "Print ID Card" button
- [x] ID Card PDF generates correctly
- [x] Pending status shows blocked screen
- [x] Rejected status allows re-submit
- [x] Face detection on avatar upload

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

---

## 📞 Contact & Support

<div align="center">

**Qadeer Ahmed**

[![GitHub](https://img.shields.io/badge/GitHub-QADEER--AHMED--cs-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/QADEER-AHMED-cs)
[![Repository](https://img.shields.io/badge/Repository-learn--school--portal-1B6A3B?style=for-the-badge&logo=github&logoColor=white)](https://github.com/QADEER-AHMED-cs/learn-school-student-portal)

</div>

---

---

<div align="center">


**Built with ❤️ for Learn School**

[![Made with React](https://img.shields.io/badge/Made_with-React-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Made in Pakistan](https://img.shields.io/badge/Made_in-Pakistan_🇵🇰-22C55E?style=for-the-badge)](https://en.wikipedia.org/wiki/Pakistan)
[![Powered by ERPNext](https://img.shields.io/badge/Powered_by-ERPNext-0089FF?style=for-the-badge&logo=frappe&logoColor=white)](https://erpnext.com)

</div>
