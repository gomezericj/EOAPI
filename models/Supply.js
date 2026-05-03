import mongoose from 'mongoose';

const SupplySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['Laboratorio', 'Insumo', 'Otros'], default: 'Otros' },
  unitPrice: { type: Number, required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
  providerName: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Supply || mongoose.model('Supply', SupplySchema);
