import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Supply from '@/models/Supply';
import Provider from '@/models/Provider';

export async function GET(req) {
  try {
    await dbConnect();
    
    // Start models
    await Provider.findOne({});
    
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const providerId = url.searchParams.get('providerId');

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = end;
      }
    }

    // Only fetch sales where a discount (Insumo) was applied
    const sales = await Sale.find({ 
      ...dateFilter,
      discountId: { $ne: null },
      discountTotal: { $gt: 0 }
    })
    .populate({
      path: 'discountId',
      model: Supply,
      populate: {
        path: 'providerId',
        model: Provider
      }
    })
    .populate('patientId', 'name surname rut')
    .sort({ date: 1 })
    .lean();

    const providersMap = {};

    sales.forEach(sale => {
      const supply = sale.discountId;
      if (!supply) return;

      const provider = supply.providerId;
      const pid = provider ? provider._id.toString() : 'unassigned';
      
      if (providerId && providerId !== 'all' && pid !== providerId) {
        return;
      }

      const pName = provider ? provider.name : 'Sin Proveedor Asignado';

      if (!providersMap[pid]) {
        providersMap[pid] = {
          providerId: pid,
          providerName: pName,
          totalOwed: 0,
          details: []
        };
      }

      providersMap[pid].totalOwed += sale.discountTotal;
      providersMap[pid].details.push({
        saleId: sale._id,
        date: sale.date,
        patientName: sale.patientId ? `${sale.patientId.name} ${sale.patientId.surname}` : sale.patientName,
        procedureName: sale.procedureName,
        supplyName: supply.name,
        quantity: sale.discountQuantity,
        unitPrice: sale.discountPrice,
        totalCost: sale.discountTotal
      });
    });

    const report = Object.values(providersMap).sort((a, b) => b.totalOwed - a.totalOwed);

    return NextResponse.json(report);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
