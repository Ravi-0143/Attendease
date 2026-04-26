import { Router } from 'express'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import Student from '../models/Student.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENS_PATH = path.join(__dirname, '..', 'tokens.json')
const SHEET_ID_PATH = path.join(__dirname, '..', 'sheet-id.json')
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? process.env.REDIRECT_URI // Could be passed in, or default to render URL if known
  : 'http://localhost:3001/auth/google/callback'

// ─── Helpers ──────────────────────────────────────────────────────

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

  // Load saved tokens if they exist
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'))
      oauth2.setCredentials(tokens)
    }
  } catch { /* ignore */ }

  return oauth2
}

export function getAuthUrl() {
  const client = getOAuth2Client()
  if (!client) return null

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ]
  })
}

export async function handleCallback(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).send('Missing authorization code')

  try {
    const client = getOAuth2Client()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    // Save tokens
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2))

    // Redirect back to the frontend setup page — works in both dev and production
    const frontendBase = process.env.NODE_ENV === 'production'
      ? (process.env.RENDER_EXTERNAL_URL || '')
      : 'http://localhost:5173'
    res.redirect(`${frontendBase}/setup?googleConnected=true`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).send('OAuth authentication failed: ' + err.message)
  }
}

async function getSheetsClient() {
  const auth = getOAuth2Client()
  if (!auth) throw new Error('Google credentials not configured')

  const tokens = loadTokens()
  if (!tokens) throw new Error('Google account not connected. Go to Setup.')
  auth.setCredentials(tokens)

  // Handle token refresh
  auth.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens }
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(merged, null, 2))
  })

  return google.sheets({ version: 'v4', auth })
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return null
}

async function readStudents() {
  try {
    return await Student.find()
  } catch {
    return []
  }
}

async function getOrCreateSheet() {
  // Return saved sheet ID if exists
  try {
    if (fs.existsSync(SHEET_ID_PATH)) {
      const data = JSON.parse(fs.readFileSync(SHEET_ID_PATH, 'utf-8'))
      if (data.spreadsheetId) return data.spreadsheetId
    }
  } catch { /* ignore */ }

  // Create new spreadsheet
  const sheets = await getSheetsClient()
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'Class Attendance' },
      sheets: [{ properties: { title: 'Attendance' } }]
    }
  })

  const spreadsheetId = response.data.spreadsheetId
  const url = response.data.spreadsheetUrl

  // Save for future use
  fs.writeFileSync(SHEET_ID_PATH, JSON.stringify({ spreadsheetId, url }, null, 2))

  // Write header row
  const students = await readStudents()
  const headers = ['Date', ...students.map(s => `${s.name} (${s.rollNumber})`)]
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Attendance!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [headers] }
  })

  return spreadsheetId
}

// ─── Routes ──────────────────────────────────────────────────────

const router = Router()

router.get('/status', (req, res) => {
  const tokens = loadTokens()
  res.json({ connected: !!tokens?.access_token })
})

router.post('/save-attendance', async (req, res) => {
  try {
    const { date, results } = req.body
    if (!date || !results) return res.status(400).json({ error: 'Missing date or results' })

    const sheets = await getSheetsClient()
    const spreadsheetId = await getOrCreateSheet()
    const students = await readStudents()

    // Build the row: Date, then status for each student (in enrollment order)
    const statusMap = {}
    for (const r of results) {
      const emoji = r.status === 'Present' ? '✅ Present' : '❌ Absent'
      statusMap[r.rollNumber] = emoji
    }

    const row = [date, ...students.map(s => statusMap[s.rollNumber] || '❌ Absent')]

    // Check if there's already a row for this date — update it
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Attendance!A:A'
    })

    let rowIndex = -1
    if (existing.data.values) {
      rowIndex = existing.data.values.findIndex(r => r[0] === date)
    }

    if (rowIndex >= 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Attendance!A${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
      })
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Attendance!A:A',
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Save attendance error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/update-cell', async (req, res) => {
  try {
    const { date, rollNumber, status } = req.body
    if (!date || !rollNumber || !status) return res.status(400).json({ error: 'Missing fields' })

    const sheets = await getSheetsClient()
    const spreadsheetId = await getOrCreateSheet()
    const students = await readStudents()

    // Find the column index for this student
    const studentIndex = students.findIndex(s => s.rollNumber === rollNumber)
    if (studentIndex === -1) return res.status(404).json({ error: 'Student not found' })

    // Find the row for this date
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Attendance!A:A'
    })

    let rowIndex = -1
    if (existing.data.values) {
      rowIndex = existing.data.values.findIndex(r => r[0] === date)
    }

    if (rowIndex < 0) return res.status(404).json({ error: 'No attendance record for this date' })

    // Column: A is date (index 0), B is first student (index 1) …
    // Use a helper that handles AA, AB, … for large classes (>25 students)
    function colIndexToLetter(idx) {
      let result = ''
      idx++ // 1-based
      while (idx > 0) {
        const rem = (idx - 1) % 26
        result = String.fromCharCode(65 + rem) + result
        idx = Math.floor((idx - 1) / 26)
      }
      return result
    }
    const colLetter = colIndexToLetter(studentIndex + 1) // +1 because col 0 = Date

    const statusText = status === 'Late' ? '🕐 Late' : status === 'Present' ? '✅ Present' : '❌ Absent'

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Attendance!${colLetter}${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[statusText]] }
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Update cell error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/attendance', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'Missing date' })

    const sheets = await getSheetsClient()
    const spreadsheetId = await getOrCreateSheet()
    const students = await readStudents()

    // Get all data
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Attendance!A:ZZ'
    })

    if (!data.data.values || data.data.values.length < 2) {
      return res.json({ attendance: [] })
    }

    // Find the row for this date
    const row = data.data.values.find(r => r[0] === date)
    if (!row) return res.json({ attendance: [] })

    const attendance = students.map((s, i) => {
      const cellValue = row[i + 1] || '❌ Absent'
      let status = 'Absent'
      if (cellValue.includes('Present')) status = 'Present'
      else if (cellValue.includes('Late')) status = 'Late'

      return { rollNumber: s.rollNumber, name: s.name, status }
    })

    res.json({ attendance })
  } catch (err) {
    console.error('Get attendance error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/attendance-range', async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ error: 'Missing from/to dates' })

    const sheets = await getSheetsClient()
    const spreadsheetId = await getOrCreateSheet()
    const students = await readStudents()

    const data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Attendance!A:ZZ'
    })

    if (!data.data.values || data.data.values.length < 2) {
      return res.json({ stats: [] })
    }

    // Filter rows within date range (skip header)
    const rows = data.data.values.slice(1).filter(r => r[0] >= from && r[0] <= to)
    const totalDays = rows.length

    const stats = students.map((s, i) => {
      let presentDays = 0
      for (const row of rows) {
        const cell = row[i + 1] || ''
        if (cell.includes('Present') || cell.includes('Late')) {
          presentDays++
        }
      }
      const percentage = totalDays === 0 ? 100 : Math.round((presentDays / totalDays) * 100)
      return {
        rollNumber: s.rollNumber,
        name: s.name,
        presentDays,
        totalDays,
        percentage
      }
    })

    res.json({ stats })
  } catch (err) {
    console.error('Attendance range error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/link', (req, res) => {
  try {
    if (fs.existsSync(SHEET_ID_PATH)) {
      const data = JSON.parse(fs.readFileSync(SHEET_ID_PATH, 'utf-8'))
      res.json({ url: data.url || '' })
    } else {
      res.json({ url: '' })
    }
  } catch {
    res.json({ url: '' })
  }
})

export default router
