# Attendance App — Project Rules

## Who I Am
I am a teacher in India. I am not a developer. I do not understand code.
Always explain what you are doing in simple, plain English before you do it.
Never assume I know technical terms — explain them like I am hearing them for the first time.

## What This App Is
A student attendance web app for a classroom teacher.
- I take one photo of my entire class each day
- The app detects all faces using the Gemini AI Vision API
- It matches each face against saved reference photos of my students
- It shows me a review screen before saving anything — I must approve
- It saves attendance permanently to Google Sheets (not locally)
- It tracks: Present, Absent, and Late
- It shows a dashboard with history and per-student attendance percentage
- It lets me manually mark latecomers after attendance is saved
- It lets me download attendance as Excel

## Tech Decisions (Do Not Change These)
- Language: Python (Flask for the web app)
- Face recognition: Gemini Vision API only (google-generativeai library)
- Database: Google Sheets via Google Sheets API (gspread library)
- Frontend: Simple HTML + CSS — nothing fancy, must work on a laptop browser
- All libraries must be free and open source
- API key must always be stored in a .env file, never hardcoded

## Student Management
- Students are enrolled with: Full Name, Roll Number, and one Reference Photo
- Reference photos are stored in a folder called `students/` inside the project
- Each photo filename must match the student's name exactly (e.g., rahul_sharma.jpg)
- Students can be added or removed from inside the app — no manual file management

## Confidence and Accuracy
- If Gemini is less than 80% confident about a face match, flag it for manual review
- Always show confidence percentage next to each student on the review screen
- Never auto-save without showing me the review screen first

## Always Do This
- After completing any major feature, open the browser and show me it working
- Create a walkthrough artifact with screenshots after testing
- If you need my Gemini API key or Google Sheets credentials, pause and ask me clearly
- Keep all file and folder names simple and lowercase with underscores
