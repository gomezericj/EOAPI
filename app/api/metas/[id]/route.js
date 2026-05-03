import dbConnect from '@/lib/mongodb';
import Target from '@/models/Target';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { createLog } from '@/lib/logger';

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  try {
    const body = await request.json();
    const updatedTarget = await Target.findByIdAndUpdate(id, body, { new: true });
    if (!updatedTarget) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
    }

    await createLog({
      action: 'UPDATE',
      entity: 'Meta',
      entityId: updatedTarget._id,
      details: `Actualizó la meta para ${updatedTarget.month}/${updatedTarget.year}: ${updatedTarget.goalAmount}`
    });

    return NextResponse.json(updatedTarget);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar meta' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  try {
    const deletedTarget = await Target.findByIdAndDelete(id);
    if (!deletedTarget) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
    }

    await createLog({
      action: 'DELETE',
      entity: 'Meta',
      entityId: deletedTarget._id,
      details: `Eliminó la meta para ${deletedTarget.month}/${deletedTarget.year}`
    });

    return NextResponse.json({ message: 'Meta eliminada con éxito' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 });
  }
}
