import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Closure from '@/models/Closure';
import Patient from '@/models/Patient';
import Doctor from '@/models/Doctor';
import Procedure from '@/models/Procedure';
import Supply from '@/models/Supply';
import { isDayClosed } from '@/lib/closureCheck';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(req, { params }) {
  const { id } = await params;
  await dbConnect();
  try {
    const sale = await Sale.findById(id)
      .populate('doctorId', 'name surname')
      .populate('patientId', 'name surname rut')
      .populate('procedureId', 'name')
      .populate('discountId', 'name');
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { id } = await params;
  await dbConnect();
  try {
    const data = await req.json();
    const originalSale = await Sale.findById(id);
    if (!originalSale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    // Construct update object with recalculations
    const update = { ...data };
    delete update._id; // IMPORTANT: Prevent 'immutable field _id' error
    delete update.__v; // Prevents any Mongoose versioning conflicts

    // Normalize IDs (in case they are objects from a previous populate)
    if (update.patientId && update.patientId._id) update.patientId = update.patientId._id;
    if (update.doctorId && update.doctorId._id) update.doctorId = update.doctorId._id;
    if (update.procedureId && update.procedureId._id) update.procedureId = update.procedureId._id;
    if (update.discountId && update.discountId._id) update.discountId = update.discountId._id;

    // Security Check: FULL BLINDAJE - Always check closure if it exists
    if (await isDayClosed(originalSale.date)) {
      return NextResponse.json({ error: 'Este día está cerrado y blindado. Elimine el cierre para hacer cualquier cambio (incluyendo liberar comisiones).' }, { status: 400 });
    }

    // Ensure dates are actual Date objects (Direct driver won't auto-convert strings)
    if (update.commissionReleaseDate && typeof update.commissionReleaseDate === 'string') {
      update.commissionReleaseDate = new Date(update.commissionReleaseDate);
    }
    if (update.date && typeof update.date === 'string') {
      update.date = new Date(update.date);
    }

    // Convert string IDs to ObjectIds
    if (typeof update.doctorId === 'string') {
      update.doctorId = new mongoose.Types.ObjectId(update.doctorId);
    }
    if (typeof update.patientId === 'string') {
      update.patientId = new mongoose.Types.ObjectId(update.patientId);
    }
    if (typeof update.procedureId === 'string') {
      update.procedureId = new mongoose.Types.ObjectId(update.procedureId);
    }
    if (typeof update.discountId === 'string') {
      update.discountId = update.discountId === '' ? null : new mongoose.Types.ObjectId(update.discountId);
    }

    // Fallback release date if releasing but frontend didn't send it
    const isReleasing = !!originalSale.isTreatmentInProgress && update.isTreatmentInProgress === false;
    if (isReleasing && !update.commissionReleaseDate) {
      update.commissionReleaseDate = new Date();
    }

    // Calculations based on update data falling back to original
    const unitPrice = update.unitPrice !== undefined ? update.unitPrice : originalSale.unitPrice;
    const quantity = update.quantity !== undefined ? update.quantity : originalSale.quantity;
    update.totalToCollect = (unitPrice || 0) * (quantity || 1);

    const dQty = update.discountQuantity !== undefined ? update.discountQuantity : (originalSale.discountQuantity || 0);
    const dPrice = update.discountPrice !== undefined ? update.discountPrice : (originalSale.discountPrice || 0);
    update.discountTotal = (dQty || 0) * (dPrice || 0);
    update.clinicTotal = update.totalToCollect - update.discountTotal;

    const payments = update.payments || originalSale.payments || [];
    // Ensure payment dates are also converted if updated
    if (Array.isArray(update.payments)) {
      update.payments = update.payments.map(p => ({
        ...p,
        date: typeof p.date === 'string' ? new Date(p.date) : p.date
      }));
    }

    update.totalCharged = (update.payments || originalSale.payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    update.pendingAmount = update.totalToCollect - update.totalCharged;
    update.status = update.pendingAmount <= 0 ? 'pagada' : 'pendiente';

    // Force update at DB level to bypass Mongoose schema caching
    const directCollection = mongoose.connection.db.collection('sales');
    await directCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: update }
    );

    // Refetch the document
    const finalSale = await Sale.findById(id);

    return NextResponse.json(finalSale);
  } catch (error) {
    console.error('PUT API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para eliminar ventas' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();
  try {
    const saleToDelete = await Sale.findById(id).populate('patientId', 'name surname');
    if (!saleToDelete) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    if (await isDayClosed(saleToDelete.date)) {
      return NextResponse.json({ error: 'El día de esta venta ya está cerrado. Elimine el cierre para hacer cambios.' }, { status: 400 });
    }

    const patientName = saleToDelete.patientId ? `${saleToDelete.patientId.name} ${saleToDelete.patientId.surname}` : 'Nombre desconocido';

    await Sale.findByIdAndDelete(id);

    // Add log
    await createLog({
      action: 'DELETE',
      entity: 'Sale',
      entityId: id,
      details: `Eliminó venta de ${saleToDelete.totalToCollect} del paciente ${patientName}`
    });

    return NextResponse.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

