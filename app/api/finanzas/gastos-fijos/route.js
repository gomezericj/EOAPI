import dbConnect from '@/lib/mongodb';
import FixedExpense from '@/models/FixedExpense';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export async function GET() {
  await dbConnect();
  try {
    const expenses = await FixedExpense.find({}).sort({ createdAt: -1 });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const data = await req.json();
    const expense = await FixedExpense.create(data);

    await createLog({
      action: 'CREATE',
      entity: 'FixedExpense',
      entityId: expense._id,
      details: `Agregó Gasto Fijo: ${expense.name} por un monto de ${expense.amount}`
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
