import mongoose from 'mongoose'

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  photoUrl: { type: String }, // Public Cloudinary URL
  cloudinaryId: { type: String },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

export default mongoose.model('Student', StudentSchema)
