import { useState, useEffect } from 'react'
import { Clock, Check } from 'lucide-react'

export default function LateArrivalPage() {
  const [students, setStudents] = useState([])
  const [selectedRoll, setSelectedRoll] = useState('')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  async function fetchStudents() {
    try {
      const res = await fetch('/api/students')
      const data = await res.json()
      setStudents(data)
    } catch { /* ignore */ }
  }

  async function markLate() {
    if (!selectedRoll) return
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/sheets/update-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, rollNumber: selectedRoll, status: 'Late' })
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.errorCode === 'SHEET_INACCESSIBLE') {
          window.dispatchEvent(new Event('sheetInaccessible'))
          throw new Error('Google Sheet is inaccessible. Follow the prompt to create a new one.')
        }
        throw new Error(err.error || 'Failed to update')
      }
      const student = students.find(s => s.rollNumber === selectedRoll)
      setAlert({ type: 'success', msg: `${student?.name || selectedRoll} marked as Late 🕐 for today.` })
      setSelectedRoll('')
    } catch (err) {
      setAlert({ type: 'error', msg: err.message })
    }
    setSaving(false)
  }

  return (
    <div className="page" id="late-arrival-page">
      <h1 className="page-title">🕐 Mark Late Arrival</h1>
      <p className="page-subtitle">Update a student's attendance from "Absent" to "Late" for today.</p>

      {alert && (
        <div className={`alert alert-${alert.type}`} onClick={() => setAlert(null)}>
          {alert.msg}
        </div>
      )}

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="card-header">
          <h2 className="card-title">Select Student</h2>
          <p className="card-description">Choose the student who arrived late today.</p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="late-student-select">Student</label>
          <select
            className="form-select"
            id="late-student-select"
            value={selectedRoll}
            onChange={e => setSelectedRoll(e.target.value)}
          >
            <option value="">— Select a student —</option>
            {students.map(s => (
              <option key={s.rollNumber} value={s.rollNumber}>
                {s.name} (Roll #{s.rollNumber})
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-warning"
          onClick={markLate}
          disabled={!selectedRoll || saving}
          id="mark-late-btn"
          style={{ width: '100%' }}
        >
          <Clock size={18} />
          {saving ? 'Updating…' : 'Mark as Late'}
        </button>
      </div>
    </div>
  )
}
