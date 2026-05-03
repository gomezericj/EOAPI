import dbConnect from '@/lib/mongodb';
import VariableExpense from '@/models/VariableExpense';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export async function PUT(req, { params }) {
  await dbConnect();
  try {
    const data = await req.json();
    const expense = await VariableExpense.findByIdAndUpdate(params.id, data, { new: true, runValidators: true });
    
    if (!expense) return NextResponse.json({ error: 'Gasto variable no encontrado' }, { status: 404 });

    await createLog({
      action: 'UPDATE',
      entity: 'VariableExpense',
      entityId: expense._id,
      details: `Actualizó Gasto Variable: ${expense.name} por un monto de ${expense.amount} para ${expense.month}/${expense.year}`
    });

    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  try {
    const expense = await VariableExpense.findByIdAndDelete(params.id);
    
    if (!expense) return NextResponse.json({ error: 'Gasto variable no encontrado' }, { status: 404 });

    await createLog({
      action: 'DELETE',
      entity: 'VariableExpense',
      entityId: expense._id,
      details: `Eliminó Gasto Variable: ${expense.name}`
    });

    return NextResponse.json({ message: 'Gasto variable eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
