import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = "mongodb+srv://estetica2l:140313se@cluster0.miuvcrk.mongodb.net/eo2l_db?appName=Cluster0";

const runMigration = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB for migration...");

    // We use strict: false so we can read the old commissionPercentage field even if it's removed from schema
    const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', new mongoose.Schema({}, { strict: false }));
    const Sale = mongoose.models.Sale || mongoose.model('Sale', new mongoose.Schema({}, { strict: false }));

    const doctors = await Doctor.find({}).lean();
    console.log(`Found ${doctors.length} doctors. Migrating them...`);
    
    let doctorsUpdated = 0;
    let salesUpdated = 0;

    for (const doc of doctors) {
      const oldCommission = doc.commissionPercentage || 0;
      
      const newSpecialtyCommissions = [];
      if (doc.specialty1) {
        newSpecialtyCommissions.push({ specialty: doc.specialty1, percentage: oldCommission });
      }
      if (doc.specialty2) {
        newSpecialtyCommissions.push({ specialty: doc.specialty2, percentage: oldCommission });
      }

      await Doctor.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            defaultCommissionPercentage: oldCommission,
            specialtyCommissions: newSpecialtyCommissions
          },
          $unset: {
            commissionPercentage: "",
            specialty1: "",
            specialty2: ""
          }
        }
      );
      doctorsUpdated++;
    }
    console.log(`Successfully migrated ${doctorsUpdated} doctors.`);

    const sales = await Sale.find({}).lean();
    console.log(`Found ${sales.length} sales. Migrating them...`);

    // Map doctor ID to their old commission percentage for fast lookup
    const doctorCommissionsMap = {};
    for (const doc of doctors) {
      doctorCommissionsMap[doc._id.toString()] = doc.commissionPercentage || 0;
    }

    for (const sale of sales) {
      if (sale.doctorId) {
        const docIdStr = sale.doctorId.toString();
        const docComm = doctorCommissionsMap[docIdStr] || 0;
        
        await Sale.updateOne(
          { _id: sale._id },
          { 
            $set: { doctorCommissionPercentage: docComm }
          }
        );
        salesUpdated++;
      }
    }

    console.log(`Successfully migrated ${salesUpdated} sales.`);
    console.log("Migration complete!");
    process.exit(0);

  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

runMigration();
