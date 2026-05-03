import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  method: { type: String, enum: ['credito', 'debito', 'efectivo', 'seguro', 'transferencia'], required: true },
  amount: { type: Number, required: true },
});

const SaleSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  procedureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procedure' },
  procedureName: { type: String }, // Cache name in case procedure is deleted
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctorName: { type: String }, // Cache in case doctor is deleted
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName: { type: String }, // Cache in case patient is deleted
  
  // Discounts
  discountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supply' },
  discountName: { type: String },
  discountQuantity: { type: Number, default: 0 },
  discountPrice: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 }, // Calc: Qty * Price
  
  // Totals
  totalToCollect: { type: Number, required: true }, // unitPrice * quantity
  totalCharged: { type: Number, default: 0 }, // Sum of payments
  pendingAmount: { type: Number, default: 0 }, // totalToCollect - totalCharged
  clinicTotal: { type: Number, required: true }, // totalToCollect - discountTotal (for commissions)
  
  // Financial analysis snapshot
  costsSnapshot: {
    suppliesTotal: { type: Number, default: 0 },
    adminCost: { type: Number, default: 0 },
    facilityCost: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 } // Computed
  },
  
  payments: [PaymentSchema],
  status: { type: String, enum: ['pagada', 'pendiente'], default: 'pendiente' },
  isTreatmentInProgress: { type: Boolean, default: false }, // If true, commission is not yet calculated
  commissionReleaseDate: { type: Date }, // Date when the treatment was finalized and commission should be paid
  
  // Partial releases for commissions
  commissionReleases: [{
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true } // The base amount released on which commission is calculated
  }],
  commissionReleasedTotal: { type: Number, default: 0 }
}, { timestamps: true });

delete mongoose.models.Sale;
delete mongoose.connection.models.Sale;
export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
