import mongoose from 'mongoose';

const VariableExpenseSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Gasto
  description: { type: String, required: true }, // descripcion
  amount: { type: Number, required: true }, // Monto
  month: { type: Number, required: true }, // Mes (1-12)
  year: { type: Number, required: true }, // Año (en curso)
  date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.VariableExpense || mongoose.model('VariableExpense', VariableExpenseSchema);
