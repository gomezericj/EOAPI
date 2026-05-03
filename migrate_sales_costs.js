const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

// Define minimal Schema for migration
const ProcedureSchema = new mongoose.Schema({
  name: { type: String },
  price: { type: Number },
  costs: {
    suppliesAndEquipment: [{
      name: String,
      price: Number,
      quantity: Number
    }],
    adminPercentage: Number,
    facilityPercentage: Number
  }
}, { strict: false });

const SaleSchema = new mongoose.Schema({
  procedureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procedure' },
  totalToCollect: { type: Number },
  costsSnapshot: {
    suppliesTotal: { type: Number, default: 0 },
    adminCost: { type: Number, default: 0 },
    facilityCost: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 }
  }
}, { strict: false });

const Procedure = mongoose.models.Procedure || mongoose.model('Procedure', ProcedureSchema);
const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

async function migrateSales() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to update sales.');

  const sales = await Sale.find({}).populate('procedureId');
  console.log(`Found ${sales.length} sales. Updating with cost snapshots...`);

  let updatedCount = 0;

  for (const sale of sales) {
    if (sale.procedureId && sale.procedureId.costs) {
      const procedure = sale.procedureId;
      const totalToCollect = sale.totalToCollect || 0;
      
      const suppliesTotal = (procedure.costs.suppliesAndEquipment || []).reduce((acc, s) => acc + (s.price * (s.quantity || 1)), 0);
      const adminCost = totalToCollect * ((procedure.costs.adminPercentage || 0) / 100);
      const facilityCost = totalToCollect * ((procedure.costs.facilityPercentage || 0) / 100);
      
      sale.costsSnapshot = {
        suppliesTotal,
        adminCost,
        facilityCost,
        netProfit: totalToCollect - suppliesTotal - adminCost - facilityCost
      };

      await sale.save();
      updatedCount++;
    }
  }

  console.log(`Sales migration completed. ${updatedCount} sales updated successfully.`);
  process.exit(0);
}

migrateSales().catch(console.error);
