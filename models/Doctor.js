import mongoose from 'mongoose';

const DoctorSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  secondName: { type: String },
  surname: { type: String, required: true },
  secondSurname: { type: String },
  age: { type: Number },
  email: { type: String },
  phone: { type: String },
  specialty1: { type: String },
  specialty2: { type: String },
  commissionPercentage: { type: Number, default: 0 },
  hasInvoice: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
