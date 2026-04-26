import { useState, useEffect } from 'react'
import { Download, ExternalLink, Calendar, AlertTriangle } from 'lucide-react'
import StatusBadge from '../components/StatusBadge.jsx'
import * as XLSX from 'xlsx'

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState([])
  const [monthlyStats, setMonthlyStats] = useState([])
  const [sheetUrl, setSheetUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAttendance(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    fetchMonthlyStats()
    fetchSheetLink()
  }, [])

  async function fetchAttendance(date) {
    setLoading(true)
    try {
      const res = await fetch(`/api/sheets/attendance?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setAttendance(data.attendance || [])
      } else {
        setAttendance([])
      }
    } catch {
      setAttendance([])
    }
    setLoading(false)
  }

  async function fetchMonthlyStats() {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const from = `${year}-${month}-01`
      const to = now.toISOString().split('T')[0]
      const res = await fetch(`/api/sheets/attendance-range?from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setMonthlyStats(data.stats || [])
      }
    } catch { /* ignore */ }
  }

  async function fetchSheetLink() {
    try {
      const res = await fetch('/api/sheets/link')
      if (res.ok) {
        const data = await res.json()
        setSheetUrl(data.url || '')
      }
    } catch { /* ignore */ }
  }

  function exportExcel() {
    if (monthlyStats.length === 0) return
    const wsData = [
      ['Roll No.', 'Name', 'Present Days', 'Total Days', 'Attendance %'],
      ...monthlyStats.map(s => [s.rollNumber, s.name, s.presentDays, s.totalDays, `${s.percentage}%`])
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `attendance_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const now = new Date()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="page" id="dashboard-page">
      <h1 className="page-title">📊 Dashboard</h1>
      <p className="page-subtitle">View and export attendance records</p>

      {/* Date-specific view */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="card-title">
            <Calendar size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Daily Attendance
          </h2>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            id="date-picker"
          />
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-gray-400)', textAlign: 'center', padding: '2rem' }}>Loading…</p>
        ) : attendance.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <Calendar size={40} />
            <p>No attendance data for this date</p>
            <small>Either no class was held or attendance wasn't taken.</small>
          </div>
        ) : (
          <div className="table-wrapper">
            <table id="daily-attendance-table">
              <thead>
                <tr>
                  <th>Roll No.</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.rollNumber}>
                    <td style={{ fontWeight: 600 }}>{a.rollNumber}</td>
                    <td>{a.name}</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Stats */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">Monthly Overview — {monthName}</h2>
            <p className="card-description">Students below 75% attendance are highlighted in red.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={exportExcel} id="export-excel-btn">
              <Download size={16} />
              Download Excel
            </button>
            {sheetUrl && (
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" id="open-sheet-btn">
                <ExternalLink size={16} />
                Open Google Sheet
              </a>
            )}
          </div>
        </div>

        {monthlyStats.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>No monthly data yet</p>
            <small>Take attendance and data will appear here.</small>
          </div>
        ) : (
          <div className="table-wrapper">
            <table id="monthly-stats-table">
              <thead>
                <tr>
                  <th>Roll No.</th>
                  <th>Name</th>
                  <th>Present Days</th>
                  <th>Total Days</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map(s => (
                  <tr key={s.rollNumber} className={s.percentage < 75 ? 'row-danger' : ''}>
                    <td style={{ fontWeight: 600 }}>{s.rollNumber}</td>
                    <td>
                      {s.name}
                      {s.percentage < 75 && (
                        <AlertTriangle size={14} color="var(--color-danger)" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
                      )}
                    </td>
                    <td>{s.presentDays}</td>
                    <td>{s.totalDays}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: s.percentage >= 75 ? 'var(--color-success)' : 'var(--color-danger)'
                      }}>
                        {s.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
