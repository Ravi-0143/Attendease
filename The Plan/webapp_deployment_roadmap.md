# Roadmap: Migrating AttendEase from Local to Cloud Web App

This document serves as an exhaustive technical guide for the transformation of **AttendEase** from a local Node.js/React tool into a professional, scalable, and secure cloud-hosted web application.

---

## 1. The Persistence Problem: Filesystem vs. Cloud Database

### The Problem
Currently, AttendEase relies on a **local filesystem** for data storage. 
- **JSON storage**: `students.json` holds metadata.
- **Image storage**: `/server/students/` holds student photos.

On cloud hosting platforms (like Render, Heroku, or Vercel), the filesystem is **ephemeral**. Every time the server restarts or the code is redeployed, your `students.json` and photo folder are **wiped clean**.

#### [CURRENT LOCAL CODE] logic from `server/routes/students.js`:
```javascript
// Local file-based persistence logic
const STUDENTS_DIR = path.join(__dirname, '..', 'students')
const STUDENTS_JSON = path.join(__dirname, '..', 'students.json')

function readStudents() {
  return JSON.parse(fs.readFileSync(STUDENTS_JSON, 'utf-8'))
}

function writeStudents(data) {
  fs.writeFileSync(STUDENTS_JSON, JSON.stringify(data, null, 2))
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STUDENTS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${req.body.rollNumber}${ext}`)
  }
})
```

### The Proposed Fix
1.  **Metadata**: Migrate from `students.json` to **MongoDB Atlas** or **PostgreSQL**.
2.  **Photos**: Migrate from disk storage to **Cloudinary** or **AWS S3**.

#### [PROPOSED WEB APP CODE] using MongoDB & Cloudinary:
```javascript
// Cloud-ready persistence logic
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

// 1. Connect to MongoDB Atlas (Persistent metadata)
mongoose.connect(process.env.MONGODB_URI)

const StudentSchema = new mongoose.Schema({
  name: String,
  rollNumber: { type: String, unique: true },
  photoUrl: String, // Public Cloudinary URL
  cloudinaryId: String
})
const Student = mongoose.model('Student', StudentSchema)

// 2. Configure Cloudinary (Persistent media storage)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'attendease_students',
    allowed_formats: ['jpg', 'png']
  }
})
const upload = multer({ storage })

// Updated Enrollment Route
router.post('/', upload.single('photo'), async (req, res) => {
  const { name, rollNumber } = req.body
  const newStudent = new Student({
    name,
    rollNumber,
    photoUrl: req.file.path, // URL returned by Cloudinary
    cloudinaryId: req.file.filename
  })
  await newStudent.save()
  res.status(201).json({ success: true, student: newStudent })
})
```

---

## 2. Authentication & Multi-Tenancy

### The Problem
The current app has **no identity layer**. Anyone who visits the URL can delete students, take attendance as "Admin", or access your Google Sheets. In a web app, we need to protect your specific teacher data from others.

### The Proposed Fix
Implement **JWT (JSON Web Token)** authentication or use an identity provider like **Supabase Auth**.

#### [PROPOSED WEB APP CODE] for Security:
```javascript
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Middleware to protect routes
const auth = (req, res, next) => {
  const token = req.header('x-auth-token')
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded.user
    next()
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' })
  }
}

// In the database, we link data to a user
const StudentSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  rollNumber: String
  // ...
})
```

---

## 3. The OAuth Redirect URI Challenge

### The Problem
Google OAuth is extremely strict. Currently, AttendEase is hardcoded to redirect to `localhost:3001`. In a web app, this must change dynamically based on where the app is hosted.

#### [CURRENT LOCAL CODE] from `server/routes/sheets.js`:
```javascript
// Hardcoded local redirect
const REDIRECT_URI = 'http://localhost:3001/auth/google/callback'
```

### The Proposed Fix
Use environment variables to detect the hosting environment.

#### [PROPOSED WEB APP CODE]:
```javascript
// Dynamic Redirect URI
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://your-app-name.render.com/auth/google/callback'
  : 'http://localhost:3001/auth/google/callback'
```

---

## 4. Production Build & Serving

### The Problem
Right now you run `npm run dev` which starts two separate processes. On a cloud server, you usually only have **one** web process. The backend must "serve" the frontend.

### The Proposed Fix
Build the React app once and have Express serve the resulting static folder.

#### [PROPOSED WEB APP CODE] for `server/index.js`:
```javascript
import express from 'express'
import path from 'path'
const __dirname = path.resolve()
const app = express()

// ... Existing API routes go here ...

// SERVE FRONTEND (Production Mode)
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, 'client', 'dist')))

  // Any route that isn't an API route sends the index.html
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'))
  })
}
```

---

## 5. Heavy Processing & Timeouts (The Gemini Problem)

### The Problem
Batching face recognition for 50+ students takes time (often >30 seconds). Typical web app servers (like Vercel or Heroku) will **terminate the connection** after 30 seconds if there is no response, causing the recognition to fail mid-process.

### The Proposed Fix
1.  **Webhooks/Queues**: Instead of waiting for the request to finish, send a "Task Started" ID immediately.
2.  **Background Processing**: Use a background worker (like **Redis + BullMQ**) to process the batches.
3.  **Polling/WebSockets**: The frontend stays on the page and polls the status using the `/progress` endpoint implemented earlier.

#### [PROPOSED WEB APP ARCHITECTURE]:
1.  **Client** POSTs photo to `/api/gemini/recognize`.
2.  **Server** responds instantly with `{ taskId: "xyz" }`.
3.  **Client** starts polling `/api/gemini/status/xyz`.
4.  **Worker** process handles the Gemini batches and updates the status in the database.
5.  **Client** transitions to Review once the Worker marks the task as `completed`.

---

## Summary Checklist for Deployment

| Category | Local Solution | Web App (Cloud) Solution |
| :--- | :--- | :--- |
| **Database** | JSON Files | MongoDB Atlas / PostgreSQL |
| **Media** | `server/students` folder | Cloudinary / AWS S3 |
| **Auth** | None (Public) | JWT / Auth0 / Supabase |
| **Hosting** | Local Machine | Render / Heroku / DigitalOcean |
| **Build** | `vite` dev server | `npm run build` + Express static serving |
| **Secrets** | `.env` file | Environment Variables in Hosting Panel |

---

> [!IMPORTANT]
> **Conclusion**: Transforming AttendEase into a web app is less about changing the *logic* (which is already solid) and more about changing the **plumbing**—moving data and media to persistent cloud services and securing access with an identity layer.
