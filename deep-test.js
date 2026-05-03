const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

async function test() {
  await mongoose.connect(MONGODB_URI);
  const Sale = mongoose.model('Sale', new mongoose.Schema({}, {strict: false}));
  
  const all = await Sale.find({});
  console.log('TOTAL SALES:', all.length);
  
  if (all.length > 0) {
    const s = all[all.length-1];
    console.log('LATEST SALE DETAILS:');
    console.log('Date:', s.date, typeof s.date);
    console.log('Payments:', JSON.stringify(s.payments, null, 2));
    
    const target = '2026-03-08';
    const start = new Date(`${target}T00:00:00.000Z`);
    const end = new Date(`${target}T23:59:59.999Z`);
    
    console.log('Comparing', s.date, 'with range', start, 'to', end);
    const inRange = s.date >= start && s.date <= end;
    console.log('Is In Range (operator)?', inRange);
  }

  process.exit(0);
}

test();
