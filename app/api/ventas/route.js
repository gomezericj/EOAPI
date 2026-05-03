import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Closure from '@/models/Closure';
import Patient from '@/models/Patient'; // Ensure models are registered
import Procedure from '@/models/Procedure';
import Doctor from '@/models/Doctor';
import Supply from '@/models/Supply';
import { isDayClosed } from '@/lib/closureCheck';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export async function GET(req) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');

    let query = {};
    if (startDate && endDate) {
      // Split and construct UTC strictly at 00:00:00.000 to 23:59:59.999
      const startParts = startDate.split('-');
      const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0));

      const endParts = endDate.split('-');
      const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999));

      // Fetch only sales created on this specific date range
      query.date = { $gte: start, $lte: end };
    }
    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;

    const sales = await Sale.find(query)
      .populate('doctorId', 'name surname isActive')
      .populate('patientId', 'name surname rut isActive')
      .populate('procedureId', 'name isActive')
      .populate('discountId', 'name isActive')
      .sort({ date: -1 });

    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const data = await req.json();

    // Check if day is already closed
    if (await isDayClosed(data.date)) {
      return NextResponse.json({ error: 'El día ya está cerrado. Elimine el cierre para hacer cambios.' }, { status: 400 });
    }

    // Check for future date
    const saleDate = new Date(data.date);
    const serverToday = new Date();
    // Use strictly UTC date comparison for data.date vs serverToday
    const todayStr = serverToday.toISOString().split('T')[0];
    const dataDateStr = new Date(data.date).toISOString().split('T')[0];
    if (dataDateStr > todayStr) {
      return NextResponse.json({ error: 'No se pueden registrar ventas en fechas futuras.' }, { status: 400 });
    }

    // Server-side calculations to be safe
    const totalToCollect = (data.unitPrice || 0) * (data.quantity || 1);
    const discountTotal = (data.discountQuantity || 0) * (data.discountPrice || 0);

    if (discountTotal > totalToCollect) {
      return NextResponse.json({ error: 'REGLA 3 y 4: Los descuentos/costos no pueden ser mayores que el total a cobrar del tratamiento, ya que daría un total clínico y comisiones negativas.' }, { status: 400 });
    }

    const clinicTotal = totalToCollect - discountTotal;

    if (clinicTotal < 0) {
      return NextResponse.json({ error: 'El total clínico de la clínica no puede resultar en valores negativos.' }, { status: 400 });
    }

    const totalCharged = (data.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);

    if (totalCharged > totalToCollect) {
      return NextResponse.json({ error: 'REGLA 1: La suma de los abonos superan el valor de venta total del tratamiento.' }, { status: 400 });
    }

    const pendingAmount = totalToCollect - totalCharged;

    if (pendingAmount > totalToCollect || pendingAmount < 0) {
      return NextResponse.json({ error: 'REGLA 2: Incongruencia matemática: El saldo pendiente es mayor a la deuda inicial e incongruente.' }, { status: 400 });
    }

    const status = pendingAmount <= 0 ? 'pagada' : 'pendiente';

    let costsSnapshot = { suppliesTotal: 0, adminCost: 0, facilityCost: 0, netProfit: 0 };
    const procedure = await Procedure.findById(data.procedureId);
    
    if (procedure && procedure.costs) {
      const suppliesTotal = (procedure.costs.suppliesAndEquipment || []).reduce((acc, s) => acc + (s.price * (s.quantity || 1)), 0);
      const adminCost = totalToCollect * ((procedure.costs.adminPercentage || 0) / 100);
      const facilityCost = totalToCollect * ((procedure.costs.facilityPercentage || 0) / 100);
      costsSnapshot = {
        suppliesTotal,
        adminCost,
        facilityCost,
        netProfit: totalToCollect - suppliesTotal - adminCost - facilityCost
      };
    }

    const sale = await Sale.create({
      ...data,
      discountId: data.discountId === '' ? null : data.discountId,
      totalToCollect,
      discountTotal,
      clinicTotal,
      totalCharged,
      pendingAmount,
      status,
      costsSnapshot
    });

    // Fetch names for logs
    const patient = await Patient.findById(sale.patientId);
    const doctor = await Doctor.findById(sale.doctorId);

    const patientName = patient ? `${patient.name} ${patient.surname || ''}`.trim() : 'Desconocido';
    const doctorName = doctor ? `${doctor.name} ${doctor.surname || ''}`.trim() : 'Desconocido';
    const procedureName = procedure ? procedure.name : 'Desconocido';

    // Add log
    await createLog({
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale._id,
      details: `Agregó venta de ${sale.totalToCollect} del procedimiento ${procedureName} para el paciente ${patientName} con el doctor ${doctorName}`
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

