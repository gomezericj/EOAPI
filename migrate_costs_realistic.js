const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

// Define minimal Schemas for migration
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

const DUMMY_NAMES = [
  'Kit de Resina Premium',
  'Set Instrumental Descartable',
  'Anestesia Computarizada',
  'Biomateriales de Relleno',
  'Kit de Aislamiento Absoluto',
  'Fresas de Diamante Uso Único'
];

async function migrateRealisticCosts() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to update realistic costs.');

  const procedures = await Procedure.find({});
  console.log(`Found ${procedures.length} procedures.`);

  let updatedSalesCount = 0;

  for (const proc of procedures) {
    // Determine realistic costs based on procedure price. (e.g. 15% of price for supplies)
    const sellingPrice = proc.price || 50000;
    const targetSuppliesCost = sellingPrice * (0.12 + Math.random() * 0.06); // 12% to 18% of price
    
    // Pick 1 to 3 dummy supplies
    const suppliesCount = Math.floor(Math.random() * 3) + 1;
    const procSupplies = [];
    const shuffledNames = DUMMY_NAMES.sort(() => 0.5 - Math.random());
    
    // Distribute target cost among supplies
    let remainingCost = targetSuppliesCost;
    for (let i = 0; i < suppliesCount; i++) {
        let currentCost = (i === suppliesCount - 1) ? remainingCost : remainingCost * (Math.random() * 0.5 + 0.2); // 20% to 70% of remaining
        remainingCost -= currentCost;
        
        procSupplies.push({
            name: shuffledNames[i],
            price: Math.round(currentCost), // high values like $5000, $8000 CLI
            quantity: 1
        });
    }

    const adminPercentage = Math.floor(Math.random() * 4) + 10; // 10% to 13%
    const facilityPercentage = Math.floor(Math.random() * 4) + 12; // 12% to 15%

    // Update Procedure
    proc.costs = {
      suppliesAndEquipment: procSupplies,
      adminPercentage,
      facilityPercentage
    };
    await proc.save();
    console.log(`Updated Procedure: ${proc.name} (Supplies: ~$${Math.round(targetSuppliesCost)})`);

    // Update all Sales for this Procedure
    const sales = await Sale.find({ procedureId: proc._id });
    for (const sale of sales) {
        const totalToCollect = sale.totalToCollect || 0;
        
        // Exact same logic as app/api/ventas/route.js
        const suppliesTotal = procSupplies.reduce((acc, s) => acc + (s.price * s.quantity), 0);
        const adminCost = totalToCollect * (adminPercentage / 100);
        const facilityCost = totalToCollect * (facilityPercentage / 100);

        sale.costsSnapshot = {
            suppliesTotal,
            adminCost,
            facilityCost,
            netProfit: totalToCollect - suppliesTotal - adminCost - facilityCost
        };
        await sale.save();
        updatedSalesCount++;
    }
  }

  console.log(`Migration complete! ${procedures.length} procedures and ${updatedSalesCount} sales updated.`);
  process.exit(0);
}

migrateRealisticCosts().catch(console.error);
