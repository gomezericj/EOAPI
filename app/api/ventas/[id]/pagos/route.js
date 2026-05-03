import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import { isDayClosed } from '@/lib/closureCheck';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export async function POST(req, { params }) {
  const { id } = await params;
  await dbConnect();
  try {
    const paymentData = await req.json(); // expect { amount, method, date, type: 'abono' }
    
    const payDate = paymentData.date || new Date().toISOString().split('T')[0];

    // Restrict payment date if closed
    if (await isDayClosed(payDate)) {
      return NextResponse.json({ error: 'La fecha seleccionada para el pago está en un día ya cerrado.' }, { status: 400 });
    }

    const sale = await Sale.findById(id);
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

    // Append the new payment to the sale's payment array 
    // without altering the original sale date or totalToCollect
    sale.payments.push({
      method: paymentData.method,
      amount: Number(paymentData.amount),
      date: new Date(payDate)
    });

    const totalToCollect = sale.totalToCollect;
    const totalCharged = sale.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const pendingAmount = totalToCollect - totalCharged;
    const status = pendingAmount <= 0 ? 'pagada' : 'pendiente';

    sale.totalCharged = totalCharged;
    sale.pendingAmount = pendingAmount;
    sale.status = status;

    await sale.save();

    await createLog({
      action: 'UPDATE',
      entity: 'Sale',
      entityId: sale._id,
      details: `Agregó un pago de $${paymentData.amount} mediante ${paymentData.method} a la venta ${sale._id}`
    });

    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
