import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Expense from '@/models/Expense';
import Closure from '@/models/Closure';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const { date } = await params; // Await params for Next.js 15+
  await dbConnect();
  
  try {
    if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

    // Normalize date to avoid timezone shifts
    const parts = date.split('-');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Find ALL sales related to today
    const sales = await Sale.find({
      $or: [
        { date: { $gte: start, $lte: end } },
        { 'payments.date': { $gte: start, $lte: end } }
      ]
    });

    let totals = {
      efectivo: 0,
      debito: 0,
      credito: 0,
      seguro: 0,
      transferencia: 0,
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
      // Patient count from sales actually belonging to this day
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

      // Sum payments that occurred strictly on this day
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

    // Expenses
    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    });
    let expensesByType = { valePersonal: 0, gastoClinica: 0, otro: 0 };
    let expensesTotal = 0;
    expenses.forEach(e => {
      const amount = Number(e.amount) || 0;
      expensesTotal += amount;
      if (e.type === 'Vale Personal') expensesByType.valePersonal += amount;
      else if (e.type === 'Gasto Clinica') expensesByType.gastoClinica += amount;
      else expensesByType.otro += amount;
    });
    
    // Default sums if no saved closure
    const todaySum = (totals.todayTotals.efectivo || 0) + (totals.todayTotals.debito || 0) + (totals.todayTotals.credito || 0) + (totals.todayTotals.seguro || 0) + (totals.todayTotals.transferencia || 0);
    const pastSum = (totals.pastTotals.efectivo || 0) + (totals.pastTotals.debito || 0) + (totals.pastTotals.credito || 0) + (totals.pastTotals.seguro || 0) + (totals.pastTotals.transferencia || 0);
    const genSum = (totals.efectivo || 0) + (totals.debito || 0) + (totals.credito || 0) + (totals.seguro || 0) + (totals.transferencia || 0);
    
    // Check if there's a saved closure
    const existingClosure = await Closure.findOne({ date: start }).lean();

    const report = existingClosure ? {
      // If already saved, we might preferably return the saved data
      date,
      cashTotal: existingClosure.cashTotal || 0,
      debitTotal: existingClosure.debitTotal || 0,
      creditTotal: existingClosure.creditTotal || 0,
      insuranceTotal: existingClosure.insuranceTotal || 0,
      transferTotal: existingClosure.transferTotal || 0,
      todayTotals: {
        cash: existingClosure.todayTotals?.cash || 0,
        debit: existingClosure.todayTotals?.debit || 0,
        credit: existingClosure.todayTotals?.credit || 0,
        insurance: existingClosure.todayTotals?.insurance || 0,
        transfer: existingClosure.todayTotals?.transfer || 0,
      },
      pastTotals: {
        cash: existingClosure.pastTotals?.cash || 0,
        debit: existingClosure.pastTotals?.debit || 0,
        credit: existingClosure.pastTotals?.credit || 0,
        insurance: existingClosure.pastTotals?.insurance || 0,
        transfer: existingClosure.pastTotals?.transfer || 0,
      },
      pendingTotal: existingClosure.pendingTotal || 0,
      totalPatients: existingClosure.totalPatients || 0,
      expensesTotal: existingClosure.expensesTotal || 0,
      expensesByType: existingClosure.expensesByType || { valePersonal: 0, gastoClinica: 0, otro: 0 },
      clinicalSaleTotal: existingClosure.clinicalSaleTotal || 0,
      pastDebtCollected: existingClosure.pastDebtCollected || 0,
      paidBeforeTotal: existingClosure.paidBeforeTotal || 0,
      paidAfterTotal: existingClosure.paidAfterTotal || 0,
      totalCollectedGeneral: existingClosure.totalCollectedGeneral || 0,
      netSubtotal: existingClosure.netSubtotal || 0,
      isSaved: true,
      savedAt: existingClosure.createdAt
    } : {
      date,
      cashTotal: totals.efectivo || 0,
      debitTotal: totals.debito || 0,
      creditTotal: totals.credito || 0,
      insuranceTotal: totals.seguro || 0,
      transferTotal: totals.transferencia || 0,
      todayTotals: {
        cash: totals.todayTotals.efectivo || 0,
        debit: totals.todayTotals.debito || 0,
        credit: totals.todayTotals.credito || 0,
        insurance: totals.todayTotals.seguro || 0,
        transfer: totals.todayTotals.transferencia || 0,
      },
      pastTotals: {
        cash: totals.pastTotals.efectivo || 0,
        debit: totals.pastTotals.debito || 0,
        credit: totals.pastTotals.credito || 0,
        insurance: totals.pastTotals.seguro || 0,
        transfer: totals.pastTotals.transferencia || 0,
      },
      pendingTotal: totals.pending || 0,
      totalPatients: totals.patients.size || 0,
      expensesTotal: expensesTotal || 0,
      expensesByType,
      clinicalSaleTotal: totals.clinicalSalesSum || 0,
      pastDebtCollected: pastSum,
      paidBeforeTotal: totals.paidBeforeSum || 0,
      paidAfterTotal: totals.paidAfterSum || 0,
      totalCollectedGeneral: genSum,
      netSubtotal: (totals.efectivo || 0) + (totals.debito || 0) + (totals.credito || 0) + (totals.transferencia || 0) - (expensesTotal || 0),
      isSaved: false,
      savedAt: null
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Closure API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { createLog } from '@/lib/logger';

export async function POST(req, { params }) {
  const { date } = await params;
  await dbConnect();
  try {
    const data = await req.json();
    const parts = date.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const closureDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    
    const closure = await Closure.findOneAndUpdate(
      { date: closureDate },
      { ...data, date: closureDate },
      { upsert: true, new: true }
    );

    await createLog({
      action: 'UPDATE', // Guardar cierre acts as create/update
      entity: 'Closure',
      entityId: closure._id,
      details: `Guardó el cierre de caja para el día ${date}`
    });

    return NextResponse.json(closure);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para eliminar cierres de caja' }, { status: 401 });
  }

  const { date } = await params;
  await dbConnect();
  try {
    const parts = date.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const closureDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    
    const deletedClosure = await Closure.findOneAndDelete({ date: closureDate });
    if (deletedClosure) {
      await createLog({
        action: 'DELETE',
        entity: 'Closure',
        entityId: deletedClosure._id,
        details: `Eliminó el cierre de caja del día ${date}`
      });
    }

    return NextResponse.json({ message: 'Cierre eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
