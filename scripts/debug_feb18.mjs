import dbConnect from '../lib/mongodb.js';
import Sale from '../models/Sale.js';
import mongoose from 'mongoose';

async function checkDate() {
    await dbConnect();
    const dateStr = '2026-02-18';
    const parts = dateStr.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const sales = await Sale.find({
      $or: [
        { date: { $gte: start, $lte: end } },
        { 'payments.date': { $gte: start, $lte: end } }
      ]
    });

    console.log(`Checking Feb 18, 2026. Found ${sales.length} related sales.`);
    
    let sumTotalToCollect = 0;
    let sumTodayPayments = 0;
    let patients = new Set();

    sales.forEach(s => {
        const saleDate = new Date(s.date);
        const isToday = saleDate >= start && saleDate <= end;
        if (isToday) {
            console.log(`Sale ${s._id}: totalToCollect=${s.totalToCollect}, date=${s.date.toISOString()}`);
            sumTotalToCollect += (s.totalToCollect || 0);
            if (s.patientId) patients.add(s.patientId.toString());
        }

        (s.payments || []).forEach(p => {
            const pDate = new Date(p.date);
            if (pDate >= start && pDate <= end && isToday) {
                sumTodayPayments += (p.amount || 0);
            }
        });
    });

    console.log(`Summary for Hoy:`);
    console.log(`- totalToCollect sum: ${sumTotalToCollect}`);
    console.log(`- todayPayments sum: ${sumTodayPayments}`);
    console.log(`- Patient count: ${patients.size}`);

    mongoose.connection.close();
}

checkDate();
