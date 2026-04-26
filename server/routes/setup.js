import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH = path.join(__dirname, '..', '..', '.env')
const TOKENS_PATH = path.join(__dirname, '..', 'tokens.json')

const router = Router()

router.get('/status', (req, res) => {
  // Check if Gemini key exists
  const geminiConfigured = !!process.env.GEMINI_API_KEY

  // Check if Google tokens exist
  let googleConnected = false
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'))
      googleConnected = !!tokens.access_token
    }
  } catch { /* ignore */ }

  res.json({ geminiConfigured, googleConnected })
})

router.post('/gemini-key', (req, res) => {
  const { key } = req.body
  if (!key) return res.status(400).json({ error: 'Key is required' })

  try {
    // Read the current .env or create it
    let envContent = ''
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf-8')
    }

    // Replace or add GEMINI_API_KEY
    if (envContent.includes('GEMINI_API_KEY=')) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${key}`)
    } else {
      envContent += `\nGEMINI_API_KEY=${key}\n`
    }

    fs.writeFileSync(ENV_PATH, envContent)

    // Update process.env immediately
    process.env.GEMINI_API_KEY = key

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/google-creds', (req, res) => {
  const { clientId, clientSecret } = req.body
  if (!clientId || !clientSecret) return res.status(400).json({ error: 'Both fields required' })

  try {
    let envContent = ''
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf-8')
    }

    // Replace or add each
    for (const [envKey, val] of [['GOOGLE_CLIENT_ID', clientId], ['GOOGLE_CLIENT_SECRET', clientSecret]]) {
      if (envContent.includes(`${envKey}=`)) {
        envContent = envContent.replace(new RegExp(`${envKey}=.*`), `${envKey}=${val}`)
      } else {
        envContent += `\n${envKey}=${val}\n`
      }
    }

    fs.writeFileSync(ENV_PATH, envContent)
    process.env.GOOGLE_CLIENT_ID = clientId
    process.env.GOOGLE_CLIENT_SECRET = clientSecret

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
