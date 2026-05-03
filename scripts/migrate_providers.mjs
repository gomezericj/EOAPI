import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_system';

// Define Schemas inline to avoid import issues in script
const ProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rut: { type: String, required: true, unique: true },
  address: { type: String },
  rubro: { type: String },
  credit: { type: Boolean, default: false },
  creditDays: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const SupplySchema = new mongoose.Schema({
  name: { type: String, required: true },
  provider: { type: String }, // Old field
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
  providerName: { type: String },
}, { timestamps: true });

const Provider = mongoose.models.Provider || mongoose.model('Provider', ProviderSchema);
const Supply = mongoose.models.Supply || mongoose.model('Supply', SupplySchema);

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Get unique existing providers from Supply
    const existingProviderNames = await Supply.distinct('provider');
    console.log(`Found existing provider names in Insumos: ${existingProviderNames}`);

    // Fictional providers to add
    const fictionalProviders = [
      { name: 'Dental Chile', rut: '76.123.456-7', address: 'Av. Providencia 1234, Santiago', rubro: 'Insumos Dentales', credit: true, creditDays: 30 },
      { name: 'Dental Chile Proveedores', rut: '77.987.654-3', address: 'Alameda 456, Santiago', rubro: 'Logística Dental', credit: false, creditDays: 0 },
      { name: 'Medica Sur', rut: '78.555.444-2', address: 'Vitacura 999, Santiago', rubro: 'Insumos Médicos', credit: true, creditDays: 15 },
      { name: 'Distribuidora Global', rut: '79.111.222-1', address: 'Independencia 333, Santiago', rubro: 'Otros', credit: true, creditDays: 45 }
    ];

    // 2. Create Providers
    for (const pData of fictionalProviders) {
      const exists = await Provider.findOne({ rut: pData.rut });
      if (!exists) {
        await Provider.create(pData);
        console.log(`Created provider: ${pData.name}`);
      } else {
        console.log(`Provider already exists: ${pData.name}`);
      }
    }

    // 3. Update existing Supplies
    const providers = await Provider.find({});
    const providerMap = {};
    providers.forEach(p => {
      providerMap[p.name] = p;
    });

    const supplies = await Supply.find({});
    let updatedCount = 0;

    for (const s of supplies) {
      const pName = s.provider; // The old text field
      if (pName && providerMap[pName]) {
        const pObj = providerMap[pName];
        await Supply.updateOne(
          { _id: s._id },
          { 
            $set: { 
              providerId: pObj._id, 
              providerName: pObj.name 
            } 
          }
        );
        updatedCount++;
      } else if (pName) {
         // If provider name doesn't match exactly, maybe use a default or first one
         console.log(`Provider name [${pName}] did not match exactly any created provider.`);
      }
    }

    console.log(`Updated ${updatedCount} supplies with new provider references.`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
