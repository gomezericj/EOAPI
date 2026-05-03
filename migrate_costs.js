const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

// Define minimal Procedure schema for migration
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

const Procedure = mongoose.models.Procedure || mongoose.model('Procedure', ProcedureSchema);

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const procedures = await Procedure.find({});
  console.log(`Found ${procedures.length} procedures. Updating with dummy data...`);

  const dummySupplies = [
    { name: 'Guantes de látex (par)', price: 0.5, quantity: 2 },
    { name: 'Anestesia local', price: 5, quantity: 1 },
    { name: 'Eyector de saliva', price: 0.2, quantity: 1 },
    { name: 'Babero descartable', price: 0.3, quantity: 1 },
    { name: 'Uso de turbina', price: 8, quantity: 1 }
  ];

  let updatedCount = 0;

  for (const proc of procedures) {
    const suppliesCount = Math.floor(Math.random() * 3) + 1;
    const procSupplies = [];
    const shuffled = dummySupplies.sort(() => 0.5 - Math.random());
    for (let i = 0; i < suppliesCount; i++) {
        procSupplies.push({...shuffled[i]});
    }

    const adminPercentage = Math.floor(Math.random() * 11) + 5; 
    const facilityPercentage = Math.floor(Math.random() * 11) + 10; 

    proc.costs = {
      suppliesAndEquipment: procSupplies,
      adminPercentage,
      facilityPercentage
    };

    await proc.save();
    updatedCount++;
    console.log(`Updated procedure: ${proc.name}`);
  }

  console.log(`Migration completed. ${updatedCount} procedures updated successfully.`);
  process.exit(0);
}

migrate().catch(console.error);
