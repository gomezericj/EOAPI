import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && val) process.env[key] = val;
    }
  });
}

const mongodbUri = process.env.MONGODB_URI || "mongodb://localhost:27017/clinic_system";

async function recalculateCommissions() {
  console.log(`\n======================================================`);
  console.log(`Starting Commission Recalculation Utility`);
  console.log(`Connecting to: ${mongodbUri}`);
  console.log(`======================================================\n`);

  await mongoose.connect(mongodbUri);

  const DoctorSchema = new mongoose.Schema({}, { strict: false });
  const PatientSchema = new mongoose.Schema({}, { strict: false });
  const ProcedureSchema = new mongoose.Schema({}, { strict: false });
  const SaleSchema = new mongoose.Schema({}, { strict: false });

  const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
  const Patient = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
  const Procedure = mongoose.models.Procedure || mongoose.model('Procedure', ProcedureSchema);
  const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

  const sales = await Sale.find({});
  console.log(`Total Sales found in database: ${sales.length}\n`);

  let updatedCount = 0;
  let unchangedCount = 0;

  for (const s of sales) {
    const doctor = s.doctorId ? await Doctor.findById(s.doctorId) : null;
    const patient = s.patientId ? await Patient.findById(s.patientId) : null;
    const procedure = s.procedureId ? await Procedure.findById(s.procedureId) : null;

    let doctorCommissionPercentage = doctor?.defaultCommissionPercentage || 0;

    if (procedure && procedure.specialty && doctor && doctor.specialtyCommissions && doctor.specialtyCommissions.length > 0) {
      const specComm = doctor.specialtyCommissions.find(sc => sc.specialty && sc.specialty.trim().toLowerCase() === procedure.specialty.trim().toLowerCase());
      if (specComm && specComm.percentage !== undefined && specComm.percentage !== null) {
        doctorCommissionPercentage = specComm.percentage;
      }
    }

    if (patient && patient.referredByDoctorId && doctor && patient.referredByDoctorId.toString() === doctor._id.toString()) {
      if (doctor.referredPatientCommissionPercentage !== undefined && doctor.referredPatientCommissionPercentage !== null && doctor.referredPatientCommissionPercentage > 0) {
        doctorCommissionPercentage = doctor.referredPatientCommissionPercentage;
      }
    }

    if (s.doctorCommissionPercentage !== doctorCommissionPercentage) {
      console.log(`[UPDATE] Sale ${s._id} | Date: ${new Date(s.date).toLocaleDateString('es-CL')} | Patient: ${s.patientName || patient?.name} | Proc: ${s.procedureName || procedure?.name}`);
      console.log(`         Old Commission: ${s.doctorCommissionPercentage}% => New Commission: ${doctorCommissionPercentage}%\n`);

      await Sale.updateOne(
        { _id: s._id },
        { $set: { doctorCommissionPercentage } }
      );
      updatedCount++;
    } else {
      unchangedCount++;
    }
  }

  console.log(`======================================================`);
  console.log(`Recalculation Complete!`);
  console.log(`Updated Sales: ${updatedCount}`);
  console.log(`Unchanged Sales: ${unchangedCount}`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
}

recalculateCommissions().catch(err => {
  console.error("Error executing recalculation:", err);
  process.exit(1);
});
