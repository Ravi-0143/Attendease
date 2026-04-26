import { useState, useEffect } from 'react'
import { CheckCircle, Key, Link2, ArrowRight, ExternalLink, Edit2, X } from 'lucide-react'

export default function SetupPage({ onComplete }) {
  const [status, setStatus] = useState({ geminiConfigured: false, googleConnected: false })
  const [geminiKey, setGeminiKey] = useState('')
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  // Edit-mode toggles — let users update even after configured
  const [editingGemini, setEditingGemini] = useState(false)
  const [editingGoogle, setEditingGoogle] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/setup/status')
      const data = await res.json()
      setStatus(data)
    } catch { /* ignore */ }
  }

  async function saveGeminiKey(e) {
    e.preventDefault()
    if (!geminiKey.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/setup/gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: geminiKey.trim() })
      })
      if (res.ok) {
        setStatus(prev => ({ ...prev, geminiConfigured: true }))
        setAlert({ type: 'success', msg: 'Gemini API key updated!' })
        setGeminiKey('')
        setEditingGemini(false)
      } else {
        setAlert({ type: 'error', msg: 'Failed to save key.' })
      }
    } catch {
      setAlert({ type: 'error', msg: 'Server error.' })
    }
    setSaving(false)
  }

  async function saveGoogleCreds(e) {
    e.preventDefault()
    if (!googleClientId.trim() || !googleClientSecret.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/setup/google-creds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: googleClientId.trim(), clientSecret: googleClientSecret.trim() })
      })
      if (res.ok) {
        setAlert({ type: 'success', msg: 'Google credentials saved! Now click "Connect Google Account" below.' })
        setGoogleClientId('')
        setGoogleClientSecret('')
      } else {
        setAlert({ type: 'error', msg: 'Failed to save credentials.' })
      }
    } catch {
      setAlert({ type: 'error', msg: 'Server error.' })
    }
    setSaving(false)
  }

  async function connectGoogle() {
    window.location.href = '/auth/google'
  }

  const allDone = status.geminiConfigured && status.googleConnected

  useEffect(() => {
    if (allDone && onComplete) onComplete()
  }, [allDone])

  return (
    <div className="page" id="setup-page">
      <h1 className="page-title">⚙️ Setup &amp; Credentials</h1>
      <p className="page-subtitle">
        Connect the required accounts to make the app work. You can also update credentials here at any time.
      </p>

      {alert && (
        <div className={`alert alert-${alert.type}`} onClick={() => setAlert(null)}>
          {alert.msg}
        </div>
      )}

      <div className="setup-steps">
        {/* ── Step 1: Gemini API Key ─────────────────────────────── */}
        <div className="setup-step">
          <div className={`setup-step-number ${status.geminiConfigured ? 'done' : 'active'}`}>
            {status.geminiConfigured ? <CheckCircle size={20} /> : '1'}
          </div>
          <div className="setup-step-content">
            <h3 className="setup-step-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Gemini API Key</span>
              {status.geminiConfigured && !editingGemini && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', gap: 4 }}
                  onClick={() => setEditingGemini(true)}
                  id="edit-gemini-key-btn"
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}
              {editingGemini && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', gap: 4 }}
                  onClick={() => { setEditingGemini(false); setGeminiKey('') }}
                >
                  <X size={13} /> Cancel
                </button>
              )}
            </h3>

            {/* How-to instructions — shown when not yet configured, or while editing */}
            {(!status.geminiConfigured || editingGemini) && (
              <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem', background: 'var(--color-primary-50)' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary-800)' }}>How to get your free key:</h4>
                <ol style={{ paddingLeft: '1.25rem', color: 'var(--color-gray-700)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <li>Click this link to open <strong><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio <ExternalLink size={12} /></a></strong> in a new tab.</li>
                  <li>Sign in with your Google account if asked.</li>
                  <li>Look for a big blue button that says <strong>"Create API Key"</strong> and click it.</li>
                  <li>If it asks you to choose a project, select &quot;Create API key in new project&quot;.</li>
                  <li>Once created, copy the long text code they show you.</li>
                  <li>Paste that code exactly as it is into the box below.</li>
                </ol>
              </div>
            )}

            {status.geminiConfigured && !editingGemini ? (
              <div className="alert alert-success" style={{ margin: 0 }}>
                <CheckCircle size={18} /> Gemini API key is securely saved.
              </div>
            ) : (
              <form onSubmit={saveGeminiKey} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Paste your Gemini API key here (e.g. AIzaSyB...)"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  style={{ flex: 1 }}
                  id="gemini-key-input"
                />
                <button type="submit" className="btn btn-primary" disabled={saving || !geminiKey.trim()} id="save-gemini-btn">
                  <Key size={16} />
                  Save Key
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Step 2: Google Sheets Connection ──────────────────── */}
        <div className="setup-step">
          <div className={`setup-step-number ${status.googleConnected ? 'done' : status.geminiConfigured ? 'active' : ''}`}>
            {status.googleConnected ? <CheckCircle size={20} /> : '2'}
          </div>
          <div className="setup-step-content">
            <h3 className="setup-step-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Connect Google Sheets</span>
              {status.googleConnected && !editingGoogle && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', gap: 4 }}
                  onClick={() => setEditingGoogle(true)}
                  id="edit-google-creds-btn"
                >
                  <Edit2 size={13} /> Edit Credentials
                </button>
              )}
              {editingGoogle && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px', gap: 4 }}
                  onClick={() => { setEditingGoogle(false); setGoogleClientId(''); setGoogleClientSecret('') }}
                >
                  <X size={13} /> Cancel
                </button>
              )}
            </h3>

            {/* How-to instructions — shown when not yet connected, or while editing */}
            {(!status.googleConnected || editingGoogle) && (
              <>
                <p className="setup-step-desc">
                  This allows the app to automatically create and update an attendance spreadsheet on your Google Drive.
                </p>
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--color-primary-50)' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--color-primary-800)' }}>Step-by-step Instructions:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-gray-700)', fontSize: '0.9rem' }}>
                    <div>
                      <strong>Part A: Create a Project</strong>
                      <ol style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                        <li>Open the <strong><a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console <ExternalLink size={12} /></a></strong> and sign in.</li>
                        <li>Click "Select a project" at the top left, then click <strong>"New Project"</strong>. Give it a name like "Attendance App" and click Create.</li>
                        <li>Wait a few seconds, then click "Select Project" in the notification that appears.</li>
                      </ol>
                    </div>
                    <div>
                      <strong>Part B: Enable APIs</strong>
                      <ol style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                        <li>On the left menu, click <strong>"APIs &amp; Services" &gt; "Library"</strong>.</li>
                        <li>Search for <strong>"Google Sheets API"</strong>, click it, and click <strong>Enable</strong>.</li>
                        <li>Go back to the Library, search for <strong>"Google Drive API"</strong>, and <strong>Enable</strong> it too.</li>
                      </ol>
                    </div>
                    <div>
                      <strong>Part C: Set up the Consent Screen</strong>
                      <ol style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                        <li>On the left menu, click <strong>"APIs &amp; Services" &gt; "OAuth consent screen"</strong>.</li>
                        <li>Select <strong>"External"</strong> and click Create.</li>
                        <li>Fill in: App name ("Attendance"), User support email, Developer contact. Leave everything else blank.</li>
                        <li>Click "Save and Continue" on the next few screens until you're back at the dashboard.</li>
                        <li>Click <strong>"Publish App"</strong> and confirm.</li>
                      </ol>
                    </div>
                    <div>
                      <strong>Part D: Get the Credentials</strong>
                      <ol style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                        <li>On the left menu, click <strong>"Credentials"</strong>.</li>
                        <li>Click <strong>"Create Credentials"</strong> at the top, then choose <strong>"OAuth client ID"</strong>.</li>
                        <li>Under Application Type, choose <strong>"Web application"</strong>.</li>
                        <li>Under "Authorized redirect URIs", add: <code>http://localhost:3001/auth/google/callback</code></li>
                        <li>Click <strong>Create</strong>. Copy the Client ID and Client Secret into the boxes below.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </>
            )}

            {status.googleConnected && !editingGoogle ? (
              <div className="alert alert-success" style={{ margin: 0 }}>
                <CheckCircle size={18} /> Connected to Google Sheets — attendance saves automatically.
              </div>
            ) : (
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)' }}>
                <form onSubmit={saveGoogleCreds} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Google Client ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ends in .apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={e => setGoogleClientId(e.target.value)}
                    id="google-client-id-input"
                  />
                  <label className="form-label" style={{ marginBottom: 0, marginTop: '0.5rem' }}>Google Client Secret</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Starts with GOCSPX-..."
                    value={googleClientSecret}
                    onChange={e => setGoogleClientSecret(e.target.value)}
                    id="google-client-secret-input"
                  />
                  <button
                    type="submit"
                    className="btn btn-outline"
                    disabled={saving || !googleClientId.trim() || !googleClientSecret.trim()}
                    style={{ marginTop: '0.5rem' }}
                    id="save-google-creds-btn"
                  >
                    1. Save Credentials
                  </button>
                </form>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-gray-200)', margin: '1rem 0' }} />

                <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginBottom: '0.75rem' }}>
                  After saving, click below to sign in and grant the app permission to edit spreadsheets.
                </p>
                <button onClick={connectGoogle} className="btn btn-primary" style={{ width: '100%' }} id="connect-google-btn">
                  <Link2 size={16} />
                  2. Connect Google Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {allDone && !editingGemini && !editingGoogle && (
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <a href="/" className="btn btn-success btn-large" id="go-to-app-btn">
            Everything is set! Continue to App
            <ArrowRight size={20} />
          </a>
        </div>
      )}
    </div>
  )
}
