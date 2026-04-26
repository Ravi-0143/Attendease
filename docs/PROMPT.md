# YOUR FIRST MESSAGE TO ANTIGRAVITY
# Copy everything below this line and paste it into the Antigravity chat box

---

Build me a complete student attendance web app from scratch. I am a teacher, not a developer, so please explain every step in simple English before you do it.

Here is exactly what the app must do:

**1. STUDENT ENROLLMENT SCREEN**
When I open the app for the first time, show me a setup screen where I can add my students one by one. For each student I need to enter their Full Name, Roll Number, and upload one clear photo of their face. This photo will be used later to recognise them in the class photo. Store these photos in a folder called `students/` inside the project. I should also be able to remove a student if they leave the class.

**2. GOOGLE SHEETS CONNECTION**
The app must save all attendance data to a Google Sheet — not on my laptop. When I first open the app, ask me to connect my Google account so it can write to Google Sheets. Create a new sheet called "Class Attendance" if one doesn't exist.

**3. GEMINI API KEY**
The app needs a Gemini API key to do face recognition. When it is needed, pause and ask me to paste it. Store it in a file called `.env` — never put it directly in the code.

**4. DAILY ATTENDANCE — UPLOAD CLASS PHOTO**
On the home screen, show a big "Take Today's Attendance" button. When I click it, I can upload a photo of my whole class. The app must then:
- Use Gemini Vision API to detect every face in the photo
- Compare each detected face against all the photos in the `students/` folder
- Show me a REVIEW SCREEN before saving anything

**5. REVIEW SCREEN**
After Gemini processes the photo, show me a screen like this for every student:
- Student name + roll number
- Their status: Present ✅ or Absent ❌
- A confidence percentage (how sure Gemini is)
- If confidence is below 80%, highlight that student in yellow and let me manually choose Present or Absent
- I must click a "Save Attendance" button at the bottom — nothing saves automatically

**6. LATE ARRIVAL**
After attendance is saved, show a "Mark Late Arrival" button on the home screen. When I click it, show a dropdown of all students. I select the student and click "Mark Late". This updates today's record in Google Sheets with status "Late 🕐" instead of Absent.

**7. DASHBOARD**
Build a separate Dashboard screen that shows:
- A calendar or date picker to view attendance for any past date
- A table showing each student, their status on that date
- Each student's overall attendance percentage for the current month
- Students below 75% attendance highlighted in red ⚠️

**8. EXPORT**
On the Dashboard, add a "Download as Excel" button that downloads the full attendance history as a .xlsx file. Also show a link to open the Google Sheet directly.

**9. DESIGN**
Keep the design clean and simple. Large buttons, easy to read on a laptop. The app should feel like a proper tool, not a rough prototype. Use a calm color scheme — blues and whites.

Once you have built and tested the app, ask me if I am happy with it. After I confirm, wait for me to type /push-to-github to upload everything to GitHub.
