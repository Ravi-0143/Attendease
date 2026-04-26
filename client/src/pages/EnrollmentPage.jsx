import { useState, useEffect, useRef } from 'react'
import { UserPlus, Trash2, Upload, Users } from 'lucide-react'

export default function EnrollmentPage() {
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [roll, setRoll] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const fileRef = useRef()

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

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !roll.trim() || !photo) {
      setAlert({ type: 'error', msg: 'Please fill all fields and upload a photo.' })
      return
    }

    setSaving(true)
    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('rollNumber', roll.trim())
    formData.append('photo', photo)

    try {
      const res = await fetch('/api/students', { method: 'POST', body: formData })
      if (res.ok) {
        setAlert({ type: 'success', msg: `${name.trim()} enrolled successfully!` })
        setName('')
        setRoll('')
        setPhoto(null)
        setPhotoPreview(null)
        if (fileRef.current) fileRef.current.value = ''
        fetchStudents()
      } else {
        const err = await res.json()
        setAlert({ type: 'error', msg: err.error || 'Failed to enroll student.' })
      }
    } catch {
      setAlert({ type: 'error', msg: 'Server error.' })
    }
    setSaving(false)
  }

  async function handleDelete(rollNumber) {
    if (!confirm(`Remove this student? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/students/${rollNumber}`, { method: 'DELETE' })
      if (res.ok) {
        setAlert({ type: 'success', msg: 'Student removed.' })
        fetchStudents()
      }
    } catch {
      setAlert({ type: 'error', msg: 'Failed to remove student.' })
    }
  }

  return (
    <div className="page" id="enrollment-page">
      <h1 className="page-title">👨‍🎓 Student Enrollment</h1>
      <p className="page-subtitle">Add students with their photos. These photos are used for face recognition.</p>

      {alert && (
        <div className={`alert alert-${alert.type}`} onClick={() => setAlert(null)}>
          {alert.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        {/* Enrollment Form */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Add New Student</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="student-name">Full Name</label>
              <input
                type="text"
                className="form-input"
                id="student-name"
                placeholder="e.g., Priya Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="student-roll">Roll Number</label>
              <input
                type="text"
                className="form-input"
                id="student-roll"
                placeholder="e.g., 101"
                value={roll}
                onChange={e => setRoll(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Face Photo</label>
              <div
                className={`upload-zone ${photoPreview ? 'has-file' : ''}`}
                onClick={() => fileRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="photo-preview" style={{ margin: '0 auto' }} />
                ) : (
                  <>
                    <Upload size={32} className="upload-zone-icon" />
                    <p className="upload-zone-text">Click to upload photo</p>
                    <p className="upload-zone-hint">Clear, front-facing photo works best</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
                id="student-photo"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving} id="enroll-btn">
              <UserPlus size={18} />
              {saving ? 'Enrolling…' : 'Enroll Student'}
            </button>
          </form>
        </div>

        {/* Student List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Users size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Enrolled Students ({students.length})
            </h2>
          </div>

          {students.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>No students enrolled yet</p>
              <small>Use the form on the left to add your first student.</small>
            </div>
          ) : (
            <div className="table-wrapper">
              <table id="students-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Roll No.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.rollNumber}>
                      <td>
                        <img
                          src={s.photoUrl || `/api/students/photo/${s.rollNumber}`}
                          alt={s.name}
                          className="photo-preview"
                          style={{ width: 48, height: 48 }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.rollNumber}</td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleDelete(s.rollNumber)}
                          title="Remove student"
                          id={`delete-${s.rollNumber}`}
                        >
                          <Trash2 size={16} color="var(--color-danger)" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
