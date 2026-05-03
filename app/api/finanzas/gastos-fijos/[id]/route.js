import dbConnect from '@/lib/mongodb';
import FixedExpense from '@/models/FixedExpense';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export async function PUT(req, { params }) {
  await dbConnect();
  try {
    const data = await req.json();
    const expense = await FixedExpense.findByIdAndUpdate(params.id, data, { new: true, runValidators: true });
    
    if (!expense) return NextResponse.json({ error: 'Gasto fijo no encontrado' }, { status: 404 });

    await createLog({
      action: 'UPDATE',
      entity: 'FixedExpense',
      entityId: expense._id,
      details: `Actualizó Gasto Fijo: ${expense.name} por un monto de ${expense.amount}`
    });

    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  try {
    const expense = await FixedExpense.findByIdAndDelete(params.id);
    
    if (!expense) return NextResponse.json({ error: 'Gasto fijo no encontrado' }, { status: 404 });

    await createLog({
      action: 'DELETE',
      entity: 'FixedExpense',
      entityId: expense._id,
      details: `Eliminó Gasto Fijo: ${expense.name}`
    });

    return NextResponse.json({ message: 'Gasto fijo eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
