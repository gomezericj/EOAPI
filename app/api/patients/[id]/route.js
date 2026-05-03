import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export async function PUT(req, { params }) {
  await dbConnect();
  const { id } = await params;
  try {
    const data = await req.json();

    const existing = await Patient.findById(id);
    if (!existing) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });

    if (existing.isActive === false) {
      return NextResponse.json({ error: 'No se puede editar un paciente deshabilitado. Debe habilitarlo primero.' }, { status: 400 });
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

    const patient = await Patient.findByIdAndUpdate(id, data, { new: true });

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Patient',
      entityId: id,
      details: `Actualizó paciente ${patient.name} ${patient.surname}. ${changes.length > 0 ? 'Cambios: ' + changes.join(', ') : 'Sin cambios en los valores'}`
    });

    return NextResponse.json(patient);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para modificar pacientes' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  try {
    const patient = await Patient.findById(id).lean();
    if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });

    const newStatus = patient.isActive === false ? true : false;

    const result = await Patient.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } }
    );

    console.log(`[Toggle API] Patient ${id} -> ${newStatus}. Modificados: ${result.modifiedCount}`);

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Patient',
      entityId: id,
      details: `${newStatus ? 'Habilitó' : 'Deshabilitó'} paciente: ${patient.name} ${patient.surname}`
    });

    return NextResponse.json({
      message: `Paciente ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`,
      isActive: newStatus
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE API Error for Patient:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
