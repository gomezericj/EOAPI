import dbConnect from './lib/mongodb.js';
import Sale from './models/Sale.js';

async function run() {
  await dbConnect();
  
  await Sale.updateOne(
    { procedureName: 'Ortodoncia Brackets Metal' },
    { $set: { 
        unitPrice: 1200000, 
        quantity: 1, 
        totalToCollect: 1200000, 
        totalCharged: 200000, 
        pendingAmount: 1000000, 
        clinicTotal: 1200000, 
        status: 'pendiente',
        isTreatmentInProgress: true,
        commissionReleaseDate: null
      } 
    }
  );
  console.log('Restored Ortodoncia sale');
  process.exit(0);
}
run();
