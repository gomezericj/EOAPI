import mongoose from 'mongoose';

const ClosureSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  cashTotal: { type: Number, default: 0 },
  debitTotal: { type: Number, default: 0 },
  creditTotal: { type: Number, default: 0 },
  insuranceTotal: { type: Number, default: 0 },
  transferTotal: { type: Number, default: 0 },
  
  todayTotals: {
    cash: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
  },
  pastTotals: {
    cash: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
  },

  pendingTotal: { type: Number, default: 0 },
  totalPatients: { type: Number, default: 0 },
  expensesTotal: { type: Number, default: 0 },
  expensesByType: {
    valePersonal: { type: Number, default: 0 },
    gastoClinica: { type: Number, default: 0 },
    otro: { type: Number, default: 0 },
  },
  
  clinicalSaleTotal: { type: Number, default: 0 },
  pastDebtCollected: { type: Number, default: 0 },
  totalCollectedGeneral: { type: Number, default: 0 },
  netSubtotal: { type: Number, default: 0 },
  paidBeforeTotal: { type: Number, default: 0 },
  paidAfterTotal: { type: Number, default: 0 },

  isSent: { type: Boolean, default: false },
}, { timestamps: true });

if (mongoose.models.Closure) {
  delete mongoose.models.Closure;
}
export default mongoose.model('Closure', ClosureSchema);
