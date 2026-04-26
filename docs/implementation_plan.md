# Student Attendance Web App — Implementation Plan

## Overview

Build a full-stack attendance web app for a teacher. Upload a class photo → Gemini Vision identifies students → teacher reviews & saves → data goes to Google Sheets. Includes a dashboard, late-arrival marking, and Excel export.

## Architecture

```
attendance-app/
├── client/                    # Vite + React SPA (frontend)
│   ├── public/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level pages
│   │   ├── services/          # API call helpers
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css          # Global design tokens
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
├── server/                    # Express.js backend
│   ├── routes/
│   │   ├── gemini.js          # Gemini Vision API proxy
│   │   ├── sheets.js          # Google Sheets read/write proxy
│   │   └── students.js        # Student CRUD + photo storage
│   ├── students/              # Uploaded student face photos
│   ├── students.json          # Local student registry
│   └── index.js               # Express entry point
├── .env                       # GEMINI_API_KEY (+ Google OAuth creds)
├── package.json               # Root package.json (scripts for both)
└── README.md
```

### Why a backend?

- The **Gemini API key** must stay server-side (never exposed in the browser).
- Google Sheets OAuth token exchange needs a `client_secret`, which also must stay server-side.
- Student photos are stored on disk — the server serves them and sends them to Gemini.

---

## Proposed Changes

### 1 — Project Scaffolding

#### [NEW] `package.json` (root)
- Workspace-style root with scripts: `dev` (runs both client & server via `concurrently`), `build`, `start`.
- Dependencies: `concurrently`.

#### [NEW] `client/` (Vite React app)
- Created via `npx create-vite@latest` with React template.
- Dependencies: `react-router-dom`, `xlsx` (for Excel export), `lucide-react` (icons).

#### [NEW] `server/index.js`
- Express server on port **3001**.
- Serves `students/` photos statically.
- Loads `.env` via `dotenv`.
- Dependencies: `express`, `dotenv`, `multer` (file upload), `cors`, `googleapis`, `@google/generative-ai`.

---

### 2 — Student Enrollment (Screen 1)

#### [NEW] `server/routes/students.js`
- `GET /api/students` — returns `students.json` list.
- `POST /api/students` — accepts `{ name, rollNumber }` + multipart photo upload via multer. Saves photo to `server/students/{rollNumber}.jpg`. Appends to `students.json`.
- `DELETE /api/students/:rollNumber` — removes student and their photo.

#### [NEW] `client/src/pages/EnrollmentPage.jsx`
- Form: Full Name, Roll Number, Photo upload (with preview).
- Table of enrolled students with a "Remove" button per row.
- Calls backend API.

---

### 3 — Google Sheets Connection (Screen on first use)

> [!IMPORTANT]
> **The teacher must create a Google Cloud project and provide OAuth credentials.** This is unavoidable for writing to *their own* Google Sheet. The app will guide them step-by-step through this on first launch.

#### Approach: Server-side OAuth2 flow

1. Teacher clicks "Connect Google Account" → frontend redirects to Google's OAuth consent screen.
2. Google redirects back to `http://localhost:3001/auth/google/callback` with an auth code.
3. Server exchanges code for `access_token` + `refresh_token`, stores them in a local `tokens.json`.
4. Server uses the refresh token for all subsequent Sheets API calls — no re-login needed.

#### [NEW] `server/routes/sheets.js`
- `GET /auth/google` — redirects to Google OAuth consent URL.
- `GET /auth/google/callback` — exchanges code, saves tokens.
- `GET /api/sheets/status` — checks if tokens exist (connected or not).
- `POST /api/sheets/save-attendance` — writes a day's attendance to the sheet.
- `POST /api/sheets/update-cell` — updates a single student's status (for late arrival).
- `GET /api/sheets/attendance?date=YYYY-MM-DD` — reads attendance for a date.
- `GET /api/sheets/attendance-range?from=...&to=...` — reads a date range (for dashboard).
- `GET /api/sheets/link` — returns the Google Sheet URL.
- Creates a "Class Attendance" spreadsheet if one doesn't exist (stores ID in `sheet-id.json`).

#### [NEW] `client/src/pages/SetupPage.jsx`
- Step 1: "Connect Google Account" button (checks `/api/sheets/status` on load).
- Step 2: "Enter Gemini API Key" field → saves to server → server writes to `.env`.
- Both steps show ✅ when done. "Continue to App" button appears.

---

### 4 — Gemini Face Recognition

#### Strategy

We will use the **Gemini 2.0 Flash** model's multimodal capabilities. The prompt will:
1. Receive the **class photo** + all **individual student reference photos** (as inline images with names/roll numbers labeled).
2. Ask Gemini to identify which enrolled students appear in the class photo.
3. Request structured JSON output with `{ rollNumber, status, confidence }` for each student.

> [!WARNING]
> Gemini is a generative AI model, not a biometric system. Accuracy depends on photo quality, angles, and lighting. The **review screen** lets the teacher override any mistakes — this is by design.

#### [NEW] `server/routes/gemini.js`
- `POST /api/gemini/recognize` — accepts the class photo (multipart). Server:
  1. Reads all student photos from `students/`.
  2. Builds a multimodal prompt with the class photo + each reference photo labeled with name/roll.
  3. Calls `@google/generative-ai` with `gemini-2.0-flash` model.
  4. Parses the JSON result and returns it to the frontend.

#### Prompt design (example)
```
You are an attendance assistant. I will give you:
1. A CLASS PHOTO containing multiple students.
2. REFERENCE PHOTOS of each enrolled student, labeled with their name and roll number.

For each enrolled student, determine if they appear in the class photo.
Return a JSON array: [{ "rollNumber": "...", "name": "...", "status": "Present" | "Absent", "confidence": 0-100 }]
Be conservative — if you are not sure, set confidence below 80.
```

---

### 5 — Daily Attendance Flow (Screens 2–3)

#### [NEW] `client/src/pages/HomePage.jsx`
- Large "Take Today's Attendance" button.
- File picker for class photo (with image preview).
- "Process" button → calls `/api/gemini/recognize` → navigates to Review page.
- After attendance saved: shows "Mark Late Arrival" button.

#### [NEW] `client/src/pages/ReviewPage.jsx`
- Receives Gemini's results via React state/context.
- For each student:
  - Name + Roll Number.
  - Status badge: ✅ Present / ❌ Absent.
  - Confidence % bar.
  - If confidence < 80%: row highlighted yellow, toggle button to override.
- "Save Attendance" button at bottom → calls `/api/sheets/save-attendance`.
- Success → navigates back to Home.

#### [NEW] `client/src/pages/LateArrivalPage.jsx`
- Dropdown of all students.
- "Mark Late" button → calls `/api/sheets/update-cell` to change today's status to "Late 🕐".

---

### 6 — Dashboard (Screen 4)

#### [NEW] `client/src/pages/DashboardPage.jsx`
- Date picker / mini calendar to select a date.
- Table: Student name, roll, status on selected date.
- Monthly attendance % column. Students < 75% highlighted in red.
- "Download as Excel" button → generates `.xlsx` via the `xlsx` library.
- "Open Google Sheet" link → opens the sheet URL in a new tab.

---

### 7 — Design System & Shared Components

#### [NEW] `client/src/index.css`
- CSS custom properties: calm blue palette (`#1e3a5f` dark navy, `#3b82f6` primary blue, `#eff6ff` light blue bg), whites, grays.
- Font: **Inter** from Google Fonts.
- Glassmorphism card style, smooth transitions, responsive grid.

#### [NEW] `client/src/components/`
- `Navbar.jsx` — top nav with links: Home, Enrollment, Dashboard, Setup.
- `Button.jsx` — reusable styled button (variants: primary, danger, outline).
- `Card.jsx` — glass-style card container.
- `StatusBadge.jsx` — Present ✅ / Absent ❌ / Late 🕐 pill badges.
- `ConfidenceBar.jsx` — animated horizontal bar showing confidence %.
- `Spinner.jsx` — loading spinner for API calls.

---

## User Review Required

> [!IMPORTANT]
> **Google Cloud Setup Required**: To write to Google Sheets, you'll need to:
> 1. Create a free Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com).
> 2. Enable the **Google Sheets API** and **Google Drive API**.
> 3. Create an **OAuth 2.0 Client ID** (Web application type).
> 4. Copy the Client ID and Client Secret into the app's setup screen.
>
> The app will walk you through this step-by-step when you first open it.

> [!IMPORTANT]
> **Gemini API Key Required**: You'll need a Gemini API key from [aistudio.google.com](https://aistudio.google.com). The app will prompt you for it during setup and store it securely in `.env`.

> [!WARNING]
> **Face Recognition Accuracy**: Gemini is a general-purpose AI, not a dedicated biometric system. Recognition accuracy will vary with photo quality, lighting, and angles. The review screen exists specifically so you can catch and correct any mistakes before saving. For best results, use clear, well-lit class photos.

---

## Open Questions

1. **Do you already have a Google Cloud project**, or should the app guide include creating one from scratch?
2. **Do you already have a Gemini API key**, or do you need instructions on getting one?
3. **How many students** are typically in your class? (Gemini has token limits — if > 50 students, we may need to batch reference photos.)

---

## Verification Plan

### Automated Tests
- Start dev servers (`npm run dev`) and verify both client (port 5173) and server (port 3001) launch.
- Test student CRUD via the Enrollment page.
- Test the full attendance flow end-to-end in the browser.

### Manual Verification
- Upload a sample class photo and verify Gemini returns reasonable results.
- Verify attendance data appears in Google Sheets.
- Verify Excel download works from the Dashboard.
- Test late arrival marking updates the Sheet.
- Check responsive layout and design polish.
