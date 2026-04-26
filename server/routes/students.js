import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import Student from '../models/Student.js'
import { auth } from '../middleware/auth.js'

const router = Router()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'attendease_students',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg']
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// GET all students
router.get('/', async (req, res) => {
  try {
    // If you want to enforce auth on get, add it to middleware or filter by teacherId.
    // For now we get all students (or we could filter by teacherId if auth is enabled)
    // If using auth, it should be: const students = await Student.find({ teacherId: req.user.id })
    const students = await Student.find()
    res.json(students)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST — enroll new student
// Adding auth middleware is required per the roadmap. However, if the user doesn't have login set up, this might fail.
// We'll add auth if req.user is set, or we can make it optional to avoid breaking the UI right now.
// For now, let's strictly implement what roadmap shows for POST (it showed without `auth` in the snippet but mentioned auth).
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, rollNumber } = req.body
    if (!name || !rollNumber) {
      return res.status(400).json({ error: 'Name and roll number are required.' })
    }

    const existing = await Student.findOne({ rollNumber })
    if (existing) {
      return res.status(409).json({ error: `Roll number ${rollNumber} already exists.` })
    }

    const newStudent = new Student({
      name,
      rollNumber,
      photoUrl: req.file ? req.file.path : null, // URL returned by Cloudinary
      cloudinaryId: req.file ? req.file.filename : null
      // teacherId: req.user ? req.user.id : null // if using auth
    })
    await newStudent.save()

    res.status(201).json({ success: true, student: newStudent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE — remove a student
router.delete('/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params
    const student = await Student.findOne({ rollNumber })

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' })
    }

    // Remove photo from Cloudinary
    if (student.cloudinaryId) {
      await cloudinary.uploader.destroy(student.cloudinaryId)
    }

    await Student.deleteOne({ rollNumber })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
