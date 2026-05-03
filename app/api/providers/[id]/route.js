import dbConnect from '@/lib/mongodb';
import Provider from '@/models/Provider';
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

    const existing = await Provider.findById(id);
    if (!existing) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });

    if (existing.isActive === false) {
      return NextResponse.json({ error: 'No se puede editar un proveedor deshabilitado. Debe habilitarlo primero.' }, { status: 400 });
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

    const provider = await Provider.findByIdAndUpdate(id, data, { new: true });

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Provider',
      entityId: id,
      details: `Actualizó proveedor ${provider.name}. ${changes.length > 0 ? 'Cambios: ' + changes.join(', ') : 'Sin cambios en los valores'}`
    });

    return NextResponse.json(provider);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  // Allow superadmin for now as well
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';
  if (!session || !isAdmin) {
    return NextResponse.json({ error: 'No autorizado para modificar proveedores' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  try {
    const provider = await Provider.findById(id).lean();
    if (!provider) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });

    const newStatus = provider.isActive === false ? true : false;

    await Provider.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { isActive: newStatus, updatedAt: new Date() } }
    );

    // Add log
    await createLog({
      action: 'UPDATE',
      entity: 'Provider',
      entityId: id,
      details: `${newStatus ? 'Habilitó' : 'Deshabilitó'} proveedor: ${provider.name}`
    });

    return NextResponse.json({
      message: `Proveedor ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`,
      isActive: newStatus
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
