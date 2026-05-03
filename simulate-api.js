const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

async function simulateAPI() {
  await mongoose.connect(MONGODB_URI);
  
  // Minimal schemas to match models/Sale.js, models/Expense.js, models/Closure.js
  const Sale = mongoose.model('Sale', new mongoose.Schema({
    date: Date,
    payments: Array,
    patientId: mongoose.Schema.Types.ObjectId,
    pendingAmount: Number
  }, { strict: false }));

  const Expense = mongoose.model('Expense', new mongoose.Schema({
    date: Date,
    amount: Number
  }, { strict: false }));

  const Closure = mongoose.model('Closure', new mongoose.Schema({
    date: Date
  }, { strict: false }));

  const date = '2026-03-08';
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  console.log(`RANGE: ${start.toISOString()} to ${end.toISOString()}`);

  const sales = await Sale.find({
    $or: [
      { date: { $gte: start, $lte: end } },
      { 'payments.date': { $gte: start, $lte: end } }
    ]
  });

  console.log(`SALES FOUND: ${sales.length}`);

  let totals = {
    efectivo: 0,
    debito: 0,
    credito: 0,
    seguro: 0,
    pending: 0,
    patients: new Set()
  };

  sales.forEach((s, idx) => {
    const saleDate = new Date(s.date);
    console.log(`Sale ${idx}: date=${saleDate.toISOString()} isMatch=${saleDate >= start && saleDate <= end}`);
    
    if (saleDate >= start && saleDate <= end) {
      if (s.patientId) totals.patients.add(s.patientId.toString());
      totals.pending += (s.pendingAmount || 0);
    }

    if (s.payments && Array.isArray(s.payments)) {
      console.log(`  Payments count: ${s.payments.length}`);
      s.payments.forEach((p, pIdx) => {
        const pDate = new Date(p.date);
        const inRange = pDate >= start && pDate <= end;
        console.log(`    P ${pIdx}: date=${pDate.toISOString()} amount=${p.amount} method=${p.method} inRange=${inRange}`);
        if (inRange) {
          const method = p.method?.toLowerCase()?.trim();
          if (method === 'efectivo' || method === 'efecitvo') totals.efectivo += Number(p.amount || 0);
          else if (method === 'debito') totals.debito += Number(p.amount || 0);
          else if (method === 'credito') totals.credito += Number(p.amount || 0);
          else if (method === 'seguro') totals.seguro += Number(p.amount || 0);
        }
      });
    }
  });

  console.log('FINAL TOTALS:', {
    ...totals,
    patients: totals.patients.size
  });

  process.exit(0);
}

simulateAPI();
