const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

const SaleSchema = new mongoose.Schema({
  payments: []
}, { strict: false });

const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

async function fixPayment() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  const sales = await Sale.find({});
  let fixedCount = 0;

  for (const sale of sales) {
    let modified = false;
    if (sale.payments && Array.isArray(sale.payments)) {
      for (const p of sale.payments) {
        if (p.amount === 3) {
          console.log(`Found $3 payment in sale ${sale._id}! Current date value:`, p.date, typeof p.date);
          // Force update
          p.date = new Date('2026-03-25T12:00:00Z');
          modified = true;
          fixedCount++;
        }
      }
    }
    if (modified) {
      sale.markModified('payments');
      await sale.save();
      console.log('Saved sale.');
    }
  }

  console.log(`Fixed ${fixedCount} payments in total.`);
  process.exit(0);
}

fixPayment().catch(console.error);
