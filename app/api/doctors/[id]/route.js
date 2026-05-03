import dbConnect from '@/lib/mongodb';
import Doctor from '@/models/Doctor';
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
    const existing = await Doctor.findById(id);
    if (!existing) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });

    const isAdmin = ['admin', 'superadmin'].includes(session.user.role);

    // Security check: user cannot edit commission or invoice
    if (!isAdmin) {
      if (data.commissionPercentage !== undefined || data.hasInvoice !== undefined) {
         return NextResponse.json({ error: 'No tiene permisos para modificar la comisión o facturación del doctor.' }, { status: 403 });
      }
    }

    if (existing.isActive === false && !isAdmin) {
      return NextResponse.json({ error: 'No se puede editar un doctor deshabilitado.' }, { status: 400 });
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

    const doctor = await Doctor.findByIdAndUpdate(id, data, { new: true });

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Doctor',
      entityId: id,
      details: `Actualizó doctor ${doctor.name} ${doctor.surname}. ${changes.length > 0 ? 'Cambios: ' + changes.join(', ') : 'Sin cambios en los valores'}`
    });

    return NextResponse.json(doctor);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para modificar doctores' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  try {
    const doctor = await Doctor.findById(id).lean();
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });

    const newStatus = doctor.isActive === false ? true : false;
    const result = await Doctor.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } }
    );

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Doctor',
      entityId: id,
      details: `${newStatus ? 'Habilitó' : 'Deshabilitó'} doctor: ${doctor.name} ${doctor.surname}`
    });

    return NextResponse.json({
      message: `Doctor ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`,
      isActive: newStatus
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE API Error for Doctor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
