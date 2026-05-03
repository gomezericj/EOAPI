import dbConnect from '@/lib/mongodb';
import Supply from '@/models/Supply';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export async function PUT(request, { params }) {
  await dbConnect();
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await Supply.findById(id);
    if (!existing) return NextResponse.json({ error: 'Insumo/Descuento no encontrado' }, { status: 404 });

    if (existing.isActive === false) {
      return NextResponse.json({ error: 'No se puede editar un elemento deshabilitado.' }, { status: 400 });
    }

    const changes = [];
    Object.keys(body).forEach(key => {
      if (['_id', '__v', 'updatedAt', 'createdAt'].includes(key)) return;
      const oldVal = existing[key];
      const newVal = body[key];
      const oldStr = (oldVal === null || oldVal === undefined) ? 'vacío' : String(oldVal);
      const newStr = (newVal === null || newVal === undefined) ? 'vacío' : String(newVal);
      if (oldStr !== newStr) {
        changes.push(`${key}: [${oldStr}] -> [${newStr}]`);
      }
    });

    const updatedSupply = await Supply.findByIdAndUpdate(id, body, { new: true, runValidators: true });

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Supply',
      entityId: id,
      details: `Actualizó insumo/descuento ${updatedSupply.name}. ${changes.length > 0 ? 'Cambios: ' + changes.join(', ') : 'Sin cambios en los valores'}`
    });

    return NextResponse.json(updatedSupply, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Error actualizando insumo' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para modificar insumos' }, { status: 401 });
  }

  await dbConnect();
  try {
    const { id } = await params;
    const supply = await Supply.findById(id).lean();
    if (!supply) {
      return NextResponse.json({ error: 'Insumo/Descuento no encontrado' }, { status: 404 });
    }

    const newStatus = supply.isActive === false ? true : false;

    const result = await Supply.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } }
    );

    console.log(`[Toggle API] Supply ${id} -> ${newStatus}. Modificados: ${result.modifiedCount}`);

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Supply',
      entityId: id,
      details: `${newStatus ? 'Habilitó' : 'Deshabilitó'} insumo/descuento: ${supply.name}`
    });

    return NextResponse.json({
      message: `Insumo/Descuento ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`,
      isActive: newStatus
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE API Error for Supply:', error);
    return NextResponse.json({ error: 'Error interno al modificar insumo' }, { status: 500 });
  }
}
