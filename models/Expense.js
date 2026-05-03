import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  name: { type: String, required: true }, // Quien saco el dinero
  reason: { type: String, required: true }, // Motivo
  amount: { type: Number, required: true },
  type: { type: String, enum: ['Vale Personal', 'Gasto Clinica', 'Otro'], required: true, default: 'Otro' },
}, { timestamps: true });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
