import mongoose from 'mongoose';

const SupplyItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 }
});

const ProcedureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  specialty: { type: String },
  isActive: { type: Boolean, default: true },
  costs: {
    suppliesAndEquipment: [SupplyItemSchema],
    adminPercentage: { type: Number, default: 0 },
    facilityPercentage: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Prevent mongoose OverwriteModelError
delete mongoose.models.Procedure;
delete mongoose.connection.models.Procedure;

export default mongoose.models.Procedure || mongoose.model('Procedure', ProcedureSchema);
