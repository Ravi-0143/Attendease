import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Student from '../models/Student.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Use memory storage for class photo (we just need the buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
})

const router = Router()
let isLocked = false

// ─── Live progress state ───────────────────────────────────────────
let progressClients = []     // array of SSE res objects
let progressState = {
  active: false,
  message: '',
  batch: 0,
  totalBatches: 0,
  done: false,
  error: null
}

function broadcastProgress(update) {
  Object.assign(progressState, update)
  const payload = JSON.stringify(progressState)
  progressClients = progressClients.filter(client => {
    try {
      client.write(`data: ${payload}\n\n`)
      return true
    } catch {
      return false          // remove dead clients
    }
  })
}

// GET /api/gemini/progress  — SSE stream for live progress updates
router.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Send current state immediately
  res.write(`data: ${JSON.stringify(progressState)}\n\n`)

  progressClients.push(res)

  req.on('close', () => {
    progressClients = progressClients.filter(c => c !== res)
  })
})

// POST /api/gemini/recognize — main recognition endpoint
router.post('/recognize', upload.single('classPhoto'), async (req, res) => {
  if (isLocked) {
    console.error('⚠️ [Gemini] Blocked a concurrent request (Attempted double-fire)')
    return res.status(429).json({ error: 'Another recognition is already in progress. Please wait.' })
  }

  isLocked = true
  broadcastProgress({ active: true, message: 'Starting AI recognition…', batch: 0, totalBatches: 0, done: false, error: null })
  console.log('🤖 [Gemini] Starting recognition process (Request Lock Active)')

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured. Go to Setup.' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No class photo uploaded.' })
    }

    // Read enrolled students
    let students = []
    try {
      students = await Student.find()
    } catch { /* empty */ }

    if (students.length === 0) {
      return res.status(400).json({ error: 'No students enrolled. Add students first.' })
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const BATCH_SIZE = 5
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    let allParsedResults = []

    // Class photo stays constant
    const classPhotoBase64 = req.file.buffer.toString('base64')
    const classPhotoMime = req.file.mimetype

    const totalBatches = Math.ceil(students.length / BATCH_SIZE)
    console.log(`🤖 [Gemini] Total students: ${students.length}. Batches: ${totalBatches}`)
    broadcastProgress({ totalBatches, message: `Preparing to identify ${students.length} student(s) in ${totalBatches} batch(es)…` })

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batchStudents = students.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      console.log(`🤖 [Gemini] Processing batch ${batchNum}/${totalBatches} (${batchStudents.length} students)`)

      broadcastProgress({
        batch: batchNum,
        message: `🔍 Identifying batch ${batchNum} of ${totalBatches}: ${batchStudents.map(s => s.name).join(', ')}…`
      })

      const parts = []
      parts.push({
        text: `You are an attendance assistant for a classroom. I am providing you with:
1. A CLASS PHOTO showing multiple students sitting/standing in a classroom.
2. REFERENCE PHOTOS of ${batchStudents.length} enrolled student(s), each labeled with their name and roll number.

Your task: For EACH of the provided enrolled student(s), determine whether they appear in the class photo.

Rules:
- Compare facial features carefully between each reference photo and the faces in the class photo.
- If you are not confident about a match, set the confidence below 80.
- If a student is clearly not visible in the class photo, mark them as "Absent" with low confidence.
- Be conservative — it's better to flag uncertain matches for teacher review than to make wrong calls.

Return ONLY a valid JSON array (no markdown, no code fences) with this exact format:
[{"rollNumber": "...", "name": "...", "status": "Present" or "Absent", "confidence": 0-100}]

Here are the enrolled students and their reference photos:`
      })

      // Adding student photos for this batch
      for (const student of batchStudents) {
        if (!student.photoUrl) continue

        let photoData
        try {
          // If it's a cloudinary URL, fetch it. Otherwise check local path for backward compatibility.
          if (student.photoUrl.startsWith('http')) {
            const res = await fetch(student.photoUrl)
            const arrayBuffer = await res.arrayBuffer()
            photoData = Buffer.from(arrayBuffer)
          } else {
            const photoPath = path.join(__dirname, '..', student.photoUrl)
            if (!fs.existsSync(photoPath)) continue
            photoData = fs.readFileSync(photoPath)
          }
        } catch (e) {
          console.error(`Failed to load photo for ${student.name}:`, e)
          continue
        }

        const ext = student.photoUrl.split('.').pop().toLowerCase()
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

        parts.push({
          text: `\n--- Student: ${student.name} | Roll Number: ${student.rollNumber} ---`
        })
        parts.push({
          inlineData: {
            data: photoData.toString('base64'),
            mimeType
          }
        })
      }

      // Class photo
      parts.push({ text: '\n--- CLASS PHOTO (identify which enrolled students are present) ---' })
      parts.push({
        inlineData: {
          data: classPhotoBase64,
          mimeType: classPhotoMime
        }
      })

      // Call Gemini for this batch
      const result = await model.generateContent({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 4096
        }
      })

      const responseText = result.response.text()

      // Parse JSON from response
      let parsed
      try {
        parsed = JSON.parse(responseText)
      } catch {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0])
          } catch {
            parsed = []
          }
        } else {
          parsed = []
        }
      }

      if (Array.isArray(parsed)) {
        allParsedResults.push(...parsed)
      }

      // Wait between batches to respect rate API limits (except after the very last one)
      if (i + BATCH_SIZE < students.length) {
        broadcastProgress({
          message: `✅ Batch ${batchNum} done. Pausing briefly before batch ${batchNum + 1}…`
        })
        console.log(`🤖 [Gemini] Waiting 4 seconds to respect API rate limits...`)
        await delay(4000)
      }
    }

    broadcastProgress({ message: 'Finalising results…' })

    let parsed = allParsedResults

    // Ensure every enrolled student is in the results
    const resultRolls = new Set(parsed.map(r => r.rollNumber))
    for (const student of students) {
      if (!resultRolls.has(student.rollNumber)) {
        parsed.push({
          rollNumber: student.rollNumber,
          name: student.name,
          status: 'Absent',
          confidence: 50
        })
      }
    }

    // Sort by roll number
    parsed.sort((a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true }))

    broadcastProgress({ done: true, active: false, message: `All ${students.length} students identified! Redirecting to review…` })

    res.json({ results: parsed })
  } catch (err) {
    console.error('Gemini recognition error:', err)
    broadcastProgress({ done: true, active: false, error: err.message, message: `Error: ${err.message}` })
    res.status(500).json({ error: err.message || 'Gemini recognition failed' })
  } finally {
    isLocked = false
    console.log('🔓 [Gemini] Request Lock Released')
  }
})

export default router
