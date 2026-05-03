import dbConnect from '@/lib/mongodb';
import Expense from '@/models/Expense';
import Closure from '@/models/Closure';
import { isDayClosed } from '@/lib/closureCheck';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  const { id } = await params;
  await dbConnect();
  try {
    const data = await req.json();
    const original = await Expense.findById(id);
    if (!original) return NextResponse.json({ error: 'Egreso no encontrado' }, { status: 404 });

    if (await isDayClosed(original.date)) {
      return NextResponse.json({ error: 'El día original de este egreso ya está cerrado.' }, { status: 400 });
    }

    if (data.date && data.date !== original.date?.toISOString().split('T')[0]) {
      if (await isDayClosed(data.date)) {
        return NextResponse.json({ error: 'El nuevo día seleccionado ya está cerrado.' }, { status: 400 });
      }
    }

    const expense = await Expense.findByIdAndUpdate(id, data, { new: true });

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Expense',
      entityId: id,
      details: `Actualizó egreso: ${expense.reason} (${expense.name}) por un monto de ${expense.amount}`
    });

    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para eliminar egresos' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();
  try {
    const original = await Expense.findById(id);
    if (!original) return NextResponse.json({ error: 'Egreso no encontrado' }, { status: 404 });

    if (await isDayClosed(original.date)) {
      return NextResponse.json({ error: 'El día de este egreso ya está cerrado.' }, { status: 400 });
    }

    await Expense.findByIdAndDelete(id);

    // Add log
    await createLog({
      action: 'DELETE',
      entity: 'Expense',
      entityId: id,
      details: `Eliminó egreso: ${original.reason} (${original.name}) por un monto de ${original.amount}`
    });

    return NextResponse.json({ message: 'Egreso eliminado' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

