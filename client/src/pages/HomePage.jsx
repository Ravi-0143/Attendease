import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Scan, Clock, LayoutDashboard } from 'lucide-react'

export default function HomePage({ setReviewData }) {
  const [classPhoto, setClassPhoto] = useState(null)
  const [classPhotoPreview, setClassPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const [progress, setProgress] = useState(null) // live progress from SSE
  const fileRef = useRef()
  const isProcessingRef = useRef(false)
  const eventSourceRef = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  const [attendanceDate, setAttendanceDate] = useState(today)
  const navigate = useNavigate()

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      setClassPhoto(file)
      setClassPhotoPreview(URL.createObjectURL(file))
    }
  }

  function startProgressStream() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    const es = new EventSource('/api/gemini/progress')
    eventSourceRef.current = es
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setProgress(data)
        if (data.done) {
          es.close()
          eventSourceRef.current = null
        }
      } catch { /* ignore parse errors */ }
    }
    es.onerror = () => es.close()
  }

  async function handleProcess(e) {
    if (e) e.preventDefault()
    if (isProcessingRef.current) return

    if (!classPhoto) {
      setAlert({ type: 'error', msg: 'Please upload a class photo first.' })
      return
    }

    isProcessingRef.current = true
    setLoading(true)
    setAlert(null)
    setProgress(null)

    // Start listening to progress SSE before sending request
    startProgressStream()

    const formData = new FormData()
    formData.append('classPhoto', classPhoto)

    try {
      const res = await fetch('/api/gemini/recognize', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Recognition failed')
      }
      const data = await res.json()
      setReviewData({
        results: data.results,
        date: attendanceDate,
        classPhotoUrl: classPhotoPreview
      })
      navigate('/review')
    } catch (err) {
      setAlert({ type: 'error', msg: err.message })
      isProcessingRef.current = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
    setLoading(false)
  }

  return (
    <div className="page" id="home-page">
      {/* Live progress toast — shows in corner during processing */}
      {loading && progress && (
        <div className="progress-toast" id="progress-toast">
          <div className="progress-toast-spinner"></div>
          <div className="progress-toast-content">
            <p className="progress-toast-title">
              {progress.totalBatches > 0
                ? `Batch ${progress.batch} of ${progress.totalBatches}`
                : 'Initialising…'}
            </p>
            <p className="progress-toast-msg">{progress.message}</p>
            {progress.totalBatches > 1 && (
              <div className="progress-toast-bar-wrap">
                <div
                  className="progress-toast-bar"
                  style={{ width: `${Math.min(100, (progress.batch / progress.totalBatches) * 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}

      <h1 className="page-title">📋 Attendance</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-6)' }}>
        <input 
          type="date" 
          className="form-input" 
          value={attendanceDate}
          onChange={(e) => setAttendanceDate(e.target.value)}
          max={today}
          style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
          title="Select attendance date"
        />
        <span style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
          {new Date(attendanceDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} onClick={() => setAlert(null)}>
          {alert.msg}
        </div>
      )}

      {/* Main CTA Card */}
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <Camera size={56} color="var(--color-primary-400)" style={{ margin: '0 auto var(--space-4)' }} />
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          Take Today's Attendance
        </h2>
        <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', maxWidth: 500, margin: '0 auto var(--space-6)' }}>
          Upload a photo of your class. Gemini AI will identify <strong>every</strong> student and mark their attendance automatically.
        </p>

        {/* Upload zone */}
        <div
          className={`upload-zone ${classPhotoPreview ? 'has-file' : ''}`}
          onClick={() => fileRef.current?.click()}
          style={{ maxWidth: 500, margin: '0 auto var(--space-6)' }}
        >
          {classPhotoPreview ? (
            <img src={classPhotoPreview} alt="Class photo" className="photo-preview-large" />
          ) : (
            <>
              <Upload size={40} className="upload-zone-icon" />
              <p className="upload-zone-text">Click to upload class photo</p>
              <p className="upload-zone-hint">JPG, PNG — a clear group photo works best</p>
            </>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="class-photo-input"
        />

        <button
          className="btn btn-primary btn-large"
          onClick={handleProcess}
          disabled={!classPhoto || loading}
          id="process-attendance-btn"
        >
          <Scan size={22} />
          {loading ? 'Processing all students…' : 'Process with Gemini AI'}
        </button>

        {loading && !progress && (
          <p style={{ marginTop: '1rem', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
            Connecting to Gemini AI…
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          className="card"
          onClick={() => navigate('/late')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', border: 'none' }}
          id="late-arrival-btn"
        >
          <Clock size={28} color="var(--color-warning)" />
          <div>
            <strong style={{ display: 'block' }}>Mark Late Arrival</strong>
            <small style={{ color: 'var(--color-gray-500)' }}>Update a student's status to Late</small>
          </div>
        </button>

        <button
          className="card"
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', border: 'none' }}
          id="view-dashboard-btn"
        >
          <LayoutDashboard size={28} color="var(--color-primary-500)" />
          <div>
            <strong style={{ display: 'block' }}>View Dashboard</strong>
            <small style={{ color: 'var(--color-gray-500)' }}>Attendance history &amp; analytics</small>
          </div>
        </button>
      </div>
    </div>
  )
}
