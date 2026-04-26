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

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err))
} else {
  console.warn('⚠️ No MONGODB_URI found in .env, database operations will fail.')
}

// Middleware
app.use(cors())
app.use(express.json())

// Routes
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

// SERVE FRONTEND (Production Mode)
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')))

  // Any route that isn't an API route sends the index.html
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'client', 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`\n  🚀 AttendEase server running at http://localhost:${PORT}\n`)
})
