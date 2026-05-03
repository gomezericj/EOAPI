import dbConnect from '../lib/mongodb.js';
import Sale from '../models/Sale.js';
import Closure from '../models/Closure.js';
import Expense from '../models/Expense.js';
import mongoose from 'mongoose';

async function recalculate() {
    try {
        console.log("Connecting to DB...");
        await dbConnect();

        const closures = await Closure.find({});
        console.log(`Found ${closures.length} closures to recalculate.`);

        for (const closure of closures) {
            const date = closure.date;
            const start = new Date(date);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setUTCHours(23, 59, 59, 999);

            console.log(`Processing closure for ${start.toISOString().split('T')[0]}...`);

            const sales = await Sale.find({
                $or: [
                    { date: { $gte: start, $lte: end } },
                    { 'payments.date': { $gte: start, $lte: end } }
                ]
            });

            let totals = {
                efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0,
                todayTotals: { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 },
                pastTotals: { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 },
                pending: 0,
                patients: new Set(),
                clinicalSalesSum: 0,
                paidBeforeSum: 0,
                paidAfterSum: 0
            };

            sales.forEach(s => {
                const saleDate = new Date(s.date);
                if (saleDate >= start && saleDate <= end) {
                    if (s.patientId) totals.patients.add(String(s.patientId));
                    totals.pending += (Number(s.pendingAmount) || 0);
                    totals.clinicalSalesSum += (Number(s.totalToCollect) || 0);

                    if (s.payments && Array.isArray(s.payments)) {
                        s.payments.forEach(p => {
                            if (!p.date || !p.amount) return;
                            const pDate = new Date(p.date);
                            const amt = Number(p.amount) || 0;
                            if (pDate < start) totals.paidBeforeSum += amt;
                            if (pDate > end) totals.paidAfterSum += amt;
                        });
                    }
                }

                if (s.payments && Array.isArray(s.payments)) {
                    s.payments.forEach(p => {
                        if (!p.date || !p.amount) return;
                        const pDate = new Date(p.date);
                        if (pDate >= start && pDate <= end) {
                            const method = p.method?.toLowerCase()?.trim();
                            const amount = Number(p.amount) || 0;
                            const isTodaySale = (saleDate >= start && saleDate <= end);
                            const targetObj = isTodaySale ? totals.todayTotals : totals.pastTotals;

                            if (method === 'efectivo' || method === 'efecitvo') { totals.efectivo += amount; targetObj.efectivo += amount; }
                            else if (method === 'debito') { totals.debito += amount; targetObj.debito += amount; }
                            else if (method === 'credito') { totals.credito += amount; targetObj.credito += amount; }
                            else if (method === 'seguro') { totals.seguro += amount; targetObj.seguro += amount; }
                            else if (method === 'transferencia') { totals.transferencia += amount; targetObj.transferencia += amount; }
                        }
                    });
                }
            });

            const expenses = await Expense.find({ date: { $gte: start, $lte: end } });
            const expensesTotal = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
            
            const genSum = totals.efectivo + totals.debito + totals.credito + totals.seguro + totals.transferencia;
            const pastSum = totals.pastTotals.efectivo + totals.pastTotals.debito + totals.pastTotals.credito + totals.pastTotals.seguro + totals.pastTotals.transferencia;

            // Mapping to model fields
            closure.cashTotal = totals.efectivo;
            closure.debitTotal = totals.debito;
            closure.creditTotal = totals.credito;
            closure.insuranceTotal = totals.seguro;
            closure.transferTotal = totals.transferencia;
            
            closure.todayTotals = {
                cash: totals.todayTotals.efectivo,
                debit: totals.todayTotals.debito,
                credit: totals.todayTotals.credito,
                insurance: totals.todayTotals.seguro,
                transfer: totals.todayTotals.transferencia
            };
            
            closure.pastTotals = {
                cash: totals.pastTotals.efectivo,
                debit: totals.pastTotals.debito,
                credit: totals.pastTotals.credito,
                insurance: totals.pastTotals.seguro,
                transfer: totals.pastTotals.transferencia
            };

            closure.pendingTotal = totals.pending;
            closure.totalPatients = totals.patients.size;
            closure.expensesTotal = expensesTotal;
            closure.clinicalSaleTotal = totals.clinicalSalesSum;
            closure.pastDebtCollected = pastSum;
            closure.totalCollectedGeneral = genSum;
            closure.netSubtotal = (totals.efectivo + totals.debito + totals.credito + totals.transferencia) - expensesTotal;
            
            // Add other fields if they exist in schema
            closure.paidBeforeTotal = totals.paidBeforeSum;
            closure.paidAfterTotal = totals.paidAfterSum;

            await closure.save();
        }

        console.log("Recalculation finished successfully.");
    } catch (err) {
        console.error("Error during recalculation:", err);
    } finally {
        mongoose.connection.close();
    }
}

recalculate();
