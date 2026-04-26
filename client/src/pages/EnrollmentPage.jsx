import { useState, useEffect, useRef } from 'react'
import { UserPlus, Trash2, Upload, Users, Camera, X } from 'lucide-react'

export default function EnrollmentPage() {
  const [students, setStudents] = useState([])
  const [name, setName] = useState('')
  const [roll, setRoll] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [editingPhotoFor, setEditingPhotoFor] = useState(null) // rollNumber of student being edited
  const [editPhoto, setEditPhoto] = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef()
  const editFileRef = useRef()

  useEffect(() => {
    fetchStudents()
  }, [])

  async function fetchStudents() {
    try {
      const res = await fetch('/api/students')
      const data = await res.json()
      if (Array.isArray(data)) {
        setStudents(data)
      } else {
        console.error('Failed to load students:', data)
        setStudents([])
      }
    } catch (err) {
      console.error(err)
      setStudents([])
    }
  }

  // Auto-suggest next roll number when name is focused/changed
  async function autoFillRoll() {
    if (roll) return // don't overwrite if user already typed something
    try {
      const res = await fetch('/api/students/next-roll')
      const data = await res.json()
      if (data.nextRoll) setRoll(data.nextRoll)
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

  function openPhotoEdit(rollNumber) {
    setEditingPhotoFor(rollNumber)
    setEditPhoto(null)
    setEditPhotoPreview(null)
    // Trigger file picker
    setTimeout(() => editFileRef.current?.click(), 50)
  }

  function handleEditPhotoChange(e) {
    const file = e.target.files[0]
    if (file) {
      setEditPhoto(file)
      setEditPhotoPreview(URL.createObjectURL(file))
    }
  }

  async function submitPhotoEdit() {
    if (!editPhoto || !editingPhotoFor) return
    setUploadingPhoto(true)
    const formData = new FormData()
    formData.append('photo', editPhoto)
    try {
      const res = await fetch(`/api/students/${editingPhotoFor}/photo`, {
        method: 'PATCH',
        body: formData
      })
      if (res.ok) {
        setAlert({ type: 'success', msg: 'Photo updated!' })
        cancelPhotoEdit()
        fetchStudents()
      } else {
        const err = await res.json()
        setAlert({ type: 'error', msg: err.error || 'Failed to update photo.' })
      }
    } catch {
      setAlert({ type: 'error', msg: 'Server error.' })
    }
    setUploadingPhoto(false)
  }

  function cancelPhotoEdit() {
    setEditingPhotoFor(null)
    setEditPhoto(null)
    setEditPhotoPreview(null)
    if (editFileRef.current) editFileRef.current.value = ''
  }

  const editingStudent = students.find(s => s.rollNumber === editingPhotoFor)

  return (
    <div className="page" id="enrollment-page">
      <h1 className="page-title">👨‍🎓 Student Enrollment</h1>
      <p className="page-subtitle">Add students with their photos. These photos are used for face recognition.</p>

      {alert && (
        <div className={`alert alert-${alert.type}`} onClick={() => setAlert(null)}>
          {alert.msg}
        </div>
      )}

      {/* Hidden file input for editing existing student photos */}
      <input
        type="file"
        accept="image/*"
        ref={editFileRef}
        onChange={handleEditPhotoChange}
        style={{ display: 'none' }}
        id="edit-student-photo"
      />

      {/* Photo Edit Confirmation Modal */}
      {editingPhotoFor && editPhotoPreview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: 340, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Update Photo</h3>
              <button className="btn btn-ghost" onClick={cancelPhotoEdit}><X size={16} /></button>
            </div>
            {editingStudent && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginBottom: '1rem' }}>
                for <strong>{editingStudent.name}</strong> (Roll #{editingPhotoFor})
              </p>
            )}
            <img
              src={editPhotoPreview}
              alt="New photo preview"
              style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => editFileRef.current?.click()}
              >
                <Camera size={15} /> Choose Different
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submitPhotoEdit}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Uploading…' : 'Save Photo'}
              </button>
            </div>
          </div>
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
                onFocus={autoFillRoll}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="student-roll" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Roll Number
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-600)', fontWeight: 400 }}>
                  auto-filled
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                id="student-roll"
                placeholder="Auto-suggested or type manually"
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
                        {/* Photo with hover-to-edit overlay */}
                        <div
                          style={{ position: 'relative', width: 48, height: 48, cursor: 'pointer' }}
                          onClick={() => openPhotoEdit(s.rollNumber)}
                          title="Click to change photo"
                          id={`photo-edit-${s.rollNumber}`}
                        >
                          <img
                            src={s.photoUrl || `/api/students/photo/${s.rollNumber}`}
                            alt={s.name}
                            className="photo-preview"
                            style={{ width: 48, height: 48, display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 4, opacity: 0,
                            transition: 'opacity 0.15s'
                          }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                          >
                            <Camera size={18} color="white" />
                          </div>
                        </div>
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
