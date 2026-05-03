import dbConnect from '@/lib/mongodb';
import Procedure from '@/models/Procedure';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  
  await dbConnect();
  const { id } = await params;
  try {
    const data = await req.json();
    const existing = await Procedure.findById(id);
    if (!existing) return NextResponse.json({ error: 'Procedimiento no encontrado' }, { status: 404 });

    const isAdmin = ['admin', 'superadmin'].includes(session.user.role);
    
    // Security check: user cannot edit costs or price
    if (!isAdmin) {
      if (data.price !== undefined || data.costs !== undefined) {
         return NextResponse.json({ error: 'No tiene permisos para modificar la estructura de costos o precio.' }, { status: 403 });
      }
    }

    if (existing.isActive === false && !isAdmin) {
      return NextResponse.json({ error: 'No se puede editar un procedimiento deshabilitado.' }, { status: 400 });
    }

    const changes = [];
    Object.keys(data).forEach(key => {
      if (['_id', '__v', 'updatedAt', 'createdAt'].includes(key)) return;
      const oldVal = existing[key];
      const newVal = data[key];
      const oldStr = (oldVal === null || oldVal === undefined) ? 'vacío' : String(oldVal);
      const newStr = (newVal === null || newVal === undefined) ? 'vacío' : String(newVal);
      if (oldStr !== newStr) {
        changes.push(`${key}: [${oldStr}] -> [${newStr}]`);
      }
    });

    const procedure = await Procedure.findByIdAndUpdate(id, data, { new: true });

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Procedure',
      entityId: id,
      details: `Actualizó procedimiento ${procedure.name}. ${changes.length > 0 ? 'Cambios: ' + changes.join(', ') : 'Sin cambios en los valores'}`
    });

    return NextResponse.json(procedure);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para modificar procedimientos' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  try {
    const procedure = await Procedure.findById(id).lean();
    if (!procedure) return NextResponse.json({ error: 'Procedimiento no encontrado' }, { status: 404 });

    const newStatus = procedure.isActive === false ? true : false;

    const result = await Procedure.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } }
    );

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Procedure',
      entityId: id,
      details: `${newStatus ? 'Habilitó' : 'Deshabilitó'} procedimiento: ${procedure.name}`
    });

    return NextResponse.json({
      message: `Procedimiento ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`,
      isActive: newStatus
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE API Error for Procedure:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
