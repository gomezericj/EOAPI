import mongoose from 'mongoose';

const ProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rut: { type: String, required: true, unique: true },
  address: { type: String },
  rubro: { type: String },
  credit: { type: Boolean, default: false },
  creditDays: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Provider || mongoose.model('Provider', ProviderSchema);
