import dbConnect from '@/lib/mongodb';
import Specialty from '@/models/Specialty';
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

    const existing = await Specialty.findById(id);
    if (!existing) return NextResponse.json({ error: 'Especialidad no encontrada' }, { status: 404 });

    if (existing.isActive === false) {
      return NextResponse.json({ error: 'No se puede editar una especialidad deshabilitada.' }, { status: 400 });
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

    const updatedSpecialty = await Specialty.findByIdAndUpdate(id, body, { new: true, runValidators: true });

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Specialty',
      entityId: id,
      details: `Actualizó especialidad ${updatedSpecialty.name}. ${changes.length > 0 ? 'Cambios: ' + changes.join(', ') : 'Sin cambios en los valores'}`
    });

    return NextResponse.json(updatedSpecialty, { status: 200 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'La especialidad ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error actualizando especialidad' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para modificar especialidades' }, { status: 401 });
  }

  await dbConnect();
  try {
    const { id } = await params;
    const specialty = await Specialty.findById(id).lean();
    if (!specialty) {
      return NextResponse.json({ error: 'Especialidad no encontrada' }, { status: 404 });
    }

    const newStatus = specialty.isActive === false ? true : false;

    const result = await Specialty.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } }
    );

    console.log(`[Toggle API] Specialty ${id} -> ${newStatus}. Modificados: ${result.modifiedCount}`);

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Specialty',
      entityId: id,
      details: `${newStatus ? 'Habilitó' : 'Deshabilitó'} especialidad: ${specialty.name}`
    });

    return NextResponse.json({
      message: `Especialidad ${newStatus ? 'habilitada' : 'deshabilitada'} correctamente`,
      isActive: newStatus
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE API Error for Specialty:', error);
    return NextResponse.json({ error: 'Error interno del servidor al modificar especialidad' }, { status: 500 });
  }
}
