import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  secondName: { type: String },
  surname: { type: String, required: true },
  secondSurname: { type: String },
  age: { type: Number },
  email: { type: String },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
