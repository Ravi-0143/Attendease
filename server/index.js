console.log('🚀 Server process started, loading imports...')
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import mongoose from 'mongoose'

// Load .env from project root (one level above server/)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

import express from 'express'
import cors from 'cors'
import studentsRouter from './routes/students.js'
import sheetsRouter from './routes/sheets.js'
import geminiRouter from './routes/gemini.js'
import setupRouter from './routes/setup.js'
import { getAuthUrl, handleCallback } from './routes/sheets.js'

const app = express()
const PORT = process.env.PORT || 3001

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In production, Render exposes the public URL as RENDER_EXTERNAL_URL.
// We also accept any localhost origin for local development.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.RENDER_EXTERNAL_URL, process.env.CLIENT_URL].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3001']

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps) or matching origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  credentials: true
}))

// ─── MongoDB ──────────────────────────────────────────────────────────────────
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err))
} else {
  console.warn('⚠️ No MONGODB_URI found in .env, database operations will fail.')
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json())

// ─── Health Check Endpoint ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const services = {
    mongodb: {
      configured: !!process.env.MONGODB_URI,
      connected: mongoose.connection.readyState === 1,
      label: 'Database (MongoDB)',
      envVar: 'MONGODB_URI'
    },
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      label: 'Photo Storage (Cloudinary)',
      envVar: 'CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      label: 'AI Recognition (Gemini)',
      envVar: 'GEMINI_API_KEY'
    },
    google: {
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      label: 'Google Sheets (OAuth)',
      envVar: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET'
    }
  }

  const allOk = Object.values(services).every(s => s.configured)
  res.json({ ok: allOk, services })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/students', studentsRouter)
app.use('/api/sheets', sheetsRouter)
app.use('/api/gemini', geminiRouter)
app.use('/api/setup', setupRouter)

// Google OAuth redirect (must be top-level, not under /api)
app.get('/auth/google', (req, res) => {
  const url = getAuthUrl()
  if (url) {
    res.redirect(url)
  } else {
    res.status(400).json({ error: 'Google credentials not configured. Please set them up first.' })
  }
})
app.get('/auth/google/callback', handleCallback)

// ─── Serve Frontend in Production ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist')
  app.use(express.static(clientDist))

  // All non-API routes return the React app
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.resolve(clientDist, 'index.html'))
  })
}

// ─── Global Error Handlers (for debugging silent crashes) ───────────────────
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason)
})

console.log('⏳ Server is starting to bind to port:', PORT)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 AttendEase server running at http://0.0.0.0:${PORT}\n`)
})
