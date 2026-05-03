const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

async function debug() {
  await mongoose.connect(MONGODB_URI);
  const Sale = mongoose.model('Sale', new mongoose.Schema({}, {strict: false}));
  const Expense = mongoose.model('Expense', new mongoose.Schema({}, {strict: false}));
  
  const targetDate = '2026-03-08';
  const start = new Date(`${targetDate}T00:00:00.000Z`);
  const end = new Date(`${targetDate}T23:59:59.999Z`);

  console.log('--- DEBUG INFO ---');
  console.log('Range:', start.toISOString(), 'to', end.toISOString());

  const salesDay = await Sale.find({ date: { $gte: start, $lte: end } });
  console.log('Sales created today:', salesDay.length);
  
  const salesPayments = await Sale.find({ 'payments.date': { $gte: start, $lte: end } });
  console.log('Sales with payments today:', salesPayments.length);

  const allSales = await Sale.find({});
  console.log('Total sales in system:', allSales.length);
  
  if (allSales.length > 0) {
    console.log('Sample Sale Date:', allSales[0].date);
    console.log('Sample Sale Payment Date:', allSales[0].payments?.[0]?.date);
  }

  const expenses = await Expense.find({ date: { $gte: start, $lte: end } });
  console.log('Expenses today:', expenses.length);

  process.exit(0);
}

debug();
