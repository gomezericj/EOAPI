import mongoose from 'mongoose';

const SpecialtySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Specialty || mongoose.model('Specialty', SpecialtySchema);
