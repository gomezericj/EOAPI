import mongoose from 'mongoose';

const TargetSchema = new mongoose.Schema({
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  amount: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.models.Target || mongoose.model('Target', TargetSchema);
