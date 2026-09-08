# Capacity Connect — Ministry of Earth Sciences (MoES)
### Problem Statement: SIH26075

A centralized Digital Capacity Building and Learning Management Portal for organizational training, scientific competency development, and structured knowledge sharing across Ministry of Earth Sciences institutes (IMD, INCOIS, IITM, NCMRWF, NIOT, NCPOR).

---

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: SQLite (local zero-config out-of-the-box operation; drop-in PostgreSQL compatible)
- **Auth**: NextAuth.js with JWT sessions, role claims, and route protection middleware
- **Charts**: Chart.js (`react-chartjs-2`, `chart.js`)
- **PDF Generation**: jsPDF (verifiable certificates)
- **AI Intelligence**: Groq API (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) with automatic fallback handling

---

## Quick Start Guide

### 1. Environment Setup
Create a `.env` file in the project root:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="moes-capacity-connect-super-secret-key-2025"
NEXTAUTH_URL="http://localhost:3000"
GROQ_API_KEY="" # Optional: paste free-tier key from console.groq.com
```

### 2. Database Sync & Seed
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts & Quick Switch (Password: `password123`)

| Role | Email | Designation / Unit |
| :--- | :--- | :--- |
| **ADMIN** | `admin@moes.gov.in` | Dr. Rajesh Kumar (Director HRD, MoES HQ) |
| **TRAINER 1** | `trainer.incois@moes.gov.in` | Dr. Ananya Roy (Chief Oceanographer, INCOIS) |
| **TRAINER 2** | `trainer.imd@moes.gov.in` | Dr. Vikram Seth (Radar Meteorologist, IMD) |
| **TRAINEE 1** | `rahul.v@imd.gov.in` | Rahul Verma (IMD Delhi) |
| **TRAINEE 2** | `priya.s@incois.gov.in` | Priya Sharma (INCOIS Hyderabad) |

> **Hackathon Tip:** The `/login` page features instant 1-click login buttons for Admin, Trainer, and Trainee roles!

---

## Role-Based Workspaces & Features

### 1. Admin Workspace (`/admin`)
- **Overview Directorate**: Real aggregated metrics across trainees, courses, certifications, and completion rates.
- **Competency Blocks & Pathways (`/admin/pathways`)**: Create and manage high-level scientific pathways across Ocean Sciences, Radar Meteorology, Tsunami Warning, and Polar Studies.
- **Scientific Personnel Directory (`/admin/users`)**: Single invite creation and **bulk CSV onboarding** with instant client-side preview.
- **Analytics & Skill-Gap Heatmap (`/admin/analytics`)**: Interactive Chart.js completion bar charts, enrollment progression over time, cross-institutional skill matrix, and real-time Groq AI operational insight summary.

### 2. Trainer Workspace (`/trainer`)
- **Curriculum Management**: View authored courses, published modules, and trainee enrollments.
- **Course Authoring (`/trainer/create-course`)**: Create new courses linked to MoES competency blocks.
- **Module & Assessment Builder (`/trainer/courses/[courseId]`)**: Add rich-text SOPs, video embeds, reference links, and attach custom quizzes.
- **AI Question Studio (`/trainer/ai-studio`)**: Paste technical manuals or SOPs and let Groq synthesize 5 editable MCQ assessment questions with plausible distractors. Trainer review required before publishing.
- **Trainee Roster (`/trainer/roster`)**: Track per-trainee progression %, scores, and completion statuses.

### 3. Trainee Workspace (`/trainee`)
- **Personal Learning Dashboard**: Progress bars per course, overall completion percentage, and active enrollments.
- **AI Course Recommendations**: Groq-powered advisor suggests high-priority competency blocks based on past progress and department.
- **Competency Catalog (`/trainee/catalog`)**: Search and filter courses by Earth science domain with one-click enrollment.
- **Module Reader & Video Player (`/trainee/courses/[courseId]`)**: Read SOP lessons, watch demonstrative videos, mark modules complete, and get on-demand AI bullet summaries.
- **Assessment Engine**: Instant scoring on module quizzes with immediate feedback.
- **Course Q&A Assistant**: Scoped in-course AI chatbot answering questions strictly based on course material.
- **Verifiable PDF Certificate (`/trainee/certificates`)**: Generates an official, print-ready MoES Certificate of Competency upon 100% course completion.
