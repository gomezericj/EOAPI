import mongoose from 'mongoose';

const FixedExpenseSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Gasto
  description: { type: String, required: true }, // descripcion
  amount: { type: Number, required: true }, // Monto
  date: { type: Date, default: Date.now }, // Optional for logging
}, { timestamps: true });

export default mongoose.models.FixedExpense || mongoose.model('FixedExpense', FixedExpenseSchema);
