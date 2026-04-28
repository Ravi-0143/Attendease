import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, AlertTriangle, CheckCircle } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import ConfidenceBar from '../components/ConfidenceBar.jsx'
import Spinner from '../components/Spinner.jsx'

export default function ReviewPage({ data, onDone }) {
  const [results, setResults] = useState(data.results)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const navigate = useNavigate()

  function toggleStatus(index) {
    setResults(prev => prev.map((r, i) => {
      if (i !== index) return r
      return { ...r, status: r.status === 'Present' ? 'Absent' : 'Present' }
    }))
  }

  async function saveAttendance() {
    setSaving(true)
    try {
      const res = await fetch('/api/sheets/save-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: data.date, results })
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.errorCode === 'SHEET_INACCESSIBLE') {
          window.dispatchEvent(new Event('sheetInaccessible'))
          throw new Error('Google Sheet is inaccessible. Follow the prompt to create a new one.')
        }
        throw new Error(err.error || 'Failed to save')
      }
      setAlert({ type: 'success', msg: 'Attendance saved to Google Sheets!' })
      setTimeout(() => {
        onDone()
        navigate('/')
      }, 1500)
    } catch (err) {
      setAlert({ type: 'error', msg: err.message })
    }
    setSaving(false)
  }

  const lowConfidence = results.filter(r => r.confidence < 80).length
  const presentCount = results.filter(r => r.status === 'Present').length

  return (
    <div className="page" id="review-page">
      {saving && <Spinner text="Saving to Google Sheets…" />}

      <h1 className="page-title">📝 Review Attendance</h1>
      <p className="page-subtitle">
        {data.date} — {presentCount} present, {results.length - presentCount} absent out of {results.length} students
      </p>

      {alert && (
        <div className={`alert alert-${alert.type}`} onClick={() => setAlert(null)}>
          {alert.msg}
        </div>
      )}

      {lowConfidence > 0 && (
        <div className="alert alert-warning">
          <AlertTriangle size={18} />
          {lowConfidence} student{lowConfidence > 1 ? 's' : ''} ha{lowConfidence > 1 ? 've' : 's'} low confidence ({'<'}80%). Please review the highlighted rows.
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          <table id="review-table">
            <thead>
              <tr>
                <th>Roll No.</th>
                <th>Name</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.rollNumber} className={r.confidence < 80 ? 'row-warning' : ''}>
                  <td style={{ fontWeight: 600 }}>{r.rollNumber}</td>
                  <td>{r.name}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ minWidth: 150 }}>
                    <ConfidenceBar value={r.confidence} />
                  </td>
                  <td>
                    <button
                      className={`btn ${r.confidence < 80 ? 'btn-warning' : 'btn-ghost'}`}
                      onClick={() => toggleStatus(i)}
                      id={`toggle-${r.rollNumber}`}
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      {r.status === 'Present' ? 'Mark Absent' : 'Mark Present'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
        <button
          className="btn btn-success btn-large"
          onClick={saveAttendance}
          disabled={saving}
          id="save-attendance-btn"
        >
          <Save size={22} />
          {saving ? 'Saving…' : 'Save Attendance'}
        </button>
        <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-3)' }}>
          This will write the data to your Google Sheet. You can edit it later from the Dashboard.
        </p>
      </div>
    </div>
  )
}
