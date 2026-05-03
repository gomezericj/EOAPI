import dbConnect from '@/lib/mongodb';
import Expense from '@/models/Expense';
import Closure from '@/models/Closure';
import { isDayClosed } from '@/lib/closureCheck';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export async function GET(req) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = {};
    if (startDate && endDate) {
      const startParts = startDate.split('-');
      const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0));

      const endParts = endDate.split('-');
      const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999));

      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const data = await req.json();

    if (await isDayClosed(data.date)) {
      return NextResponse.json({ error: 'El día ya está cerrado. Elimine el cierre para hacer cambios.' }, { status: 400 });
    }

    const serverToday = new Date();
    const todayStr = serverToday.toISOString().split('T')[0];
    const dataDateStr = new Date(data.date).toISOString().split('T')[0];
    if (dataDateStr > todayStr) {
      return NextResponse.json({ error: 'No se pueden registrar egresos en fechas futuras.' }, { status: 400 });
    }

    const expense = await Expense.create(data);

    // Add log
    await createLog({
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense._id,
      details: `Agregó egreso: ${expense.reason} (${expense.name}) por un monto de ${expense.amount}`
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

