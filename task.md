# Attendance App — Task Tracker

## 1. Project Scaffolding
- [x] Create root `package.json` with scripts
- [x] Scaffold Vite React client
- [x] Create Express server skeleton
- [x] Create `.env` template
- [x] Verify dev servers start

## 2. Design System & Shared Components
- [x] `index.css` — global tokens, fonts, base styles
- [x] `Navbar.jsx`
- [x] `StatusBadge.jsx`
- [x] `ConfidenceBar.jsx`
- [x] `Spinner.jsx`
- *Note: Button and Card components were built using semantic HTML and CSS classes (e.g., `<div className="card">`, `<button className="btn">`) rather than separate React components as this was cleaner.*

## 3. Student Enrollment
- [x] `server/routes/students.js` — CRUD + photo upload
- [x] `client/src/pages/EnrollmentPage.jsx`

## 4. Google Sheets Integration
- [x] `server/routes/sheets.js` — OAuth flow + read/write
- [x] `client/src/pages/SetupPage.jsx`

## 5. Gemini Face Recognition
- [x] `server/routes/gemini.js` — multimodal face matching
- [x] Prompt design & JSON parsing

## 6. Daily Attendance Flow
- [x] `client/src/pages/HomePage.jsx`
- [x] `client/src/pages/ReviewPage.jsx`
- [x] `client/src/pages/LateArrivalPage.jsx`

## 7. Dashboard
- [x] `client/src/pages/DashboardPage.jsx`
- [x] Date picker, attendance table, monthly %
- [x] Excel export
- [x] Google Sheet link

## 8. App Assembly & Routing
- [x] `App.jsx` with React Router
- *Note: Service helpers (`client/src/services/api.js`) were bypassed in favor of native fetch calls directly within the React components.*

## 9. Verification
- [x] Start both servers
- [ ] Walk through all screens in browser
- [ ] Test enrollment flow
- [ ] Verify design polish
