import dbConnect from '@/lib/mongodb';
import VariableExpense from '@/models/VariableExpense';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export async function GET() {
  await dbConnect();
  try {
    const expenses = await VariableExpense.find({}).sort({ year: -1, month: -1, createdAt: -1 });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const data = await req.json();
    const expense = await VariableExpense.create(data);

    await createLog({
      action: 'CREATE',
      entity: 'VariableExpense',
      entityId: expense._id,
      details: `Agregó Gasto Variable: ${expense.name} por un monto de ${expense.amount} para ${expense.month}/${expense.year}`
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
