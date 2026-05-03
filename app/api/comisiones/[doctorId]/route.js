import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Doctor from '@/models/Doctor';
import Patient from '@/models/Patient';
import Setting from '@/models/Setting';
import { NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para ver comisiones' }, { status: 401 });
  }

  const { doctorId } = await params;
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get('month'));
  const year = parseInt(searchParams.get('year'));

  await dbConnect();

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

    let setting = await Setting.findOne();
    const retentionPercentage = setting ? setting.retentionPercentage : 13;

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, 1, 23, 59, 59, 999));
    // Set end to the last day of the month properly in UTC
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0); // Last day of the previous (intended) month
    end.setUTCHours(23, 59, 59, 999);

    const sales = await Sale.find({
      doctorId,
      $or: [
        { 
          isTreatmentInProgress: { $ne: true }, 
          commissionReleaseDate: { $exists: false },
          date: { $gte: start, $lte: end } 
        },
        {
          commissionReleaseDate: { $gte: start, $lte: end }
        },
        {
          'commissionReleases.date': { $gte: start, $lte: end }
        }
      ]
    }).populate('patientId', 'name surname');

    const reportSales = [];
    let totalFacturado = 0;
    let totalDescuentos = 0;
    let subtotal = 0;

    for (let s of sales) {
      if (s.commissionReleases && s.commissionReleases.length > 0) {
        const releasesThisMonth = s.commissionReleases.filter(r => r.date >= start && r.date <= end);
        for (let r of releasesThisMonth) {
           const proportion = (s.clinicTotal && s.clinicTotal > 0) ? (r.amount / s.clinicTotal) : 0;
           const facturadoPorcion = (s.totalToCollect || 0) * proportion;
           const descuentoPorcion = (s.discountTotal || 0) * proportion;
           
           totalFacturado += facturadoPorcion;
           totalDescuentos += descuentoPorcion;
           subtotal += r.amount;

           // Add a customized clone of the sale for the report array
           reportSales.push({
             ...s.toObject(),
             totalToCollect: facturadoPorcion,
             discountTotal: descuentoPorcion,
             clinicTotal: r.amount,
             isPartialRelease: true,
             partialReleaseDate: r.date,
             partialReleaseAmount: r.amount,
             originalClinicTotal: s.clinicTotal,
             originalTotalToCollect: s.totalToCollect,
             releasePercentage: Math.round(proportion * 100)
           });
        }
      } else {
        const matchLegacy = (
          (!s.isTreatmentInProgress && !s.commissionReleaseDate && s.date >= start && s.date <= end) ||
          (s.commissionReleaseDate && s.commissionReleaseDate >= start && s.commissionReleaseDate <= end)
        );
        if (matchLegacy) {
          totalFacturado += (s.totalToCollect || 0);
          totalDescuentos += (s.discountTotal || 0);
          subtotal += (s.totalToCollect || 0) - (s.discountTotal || 0);
          reportSales.push(s);
        }
      }
    }
    
    const commissionAmount = subtotal * (doctor.commissionPercentage / 100);
    const retention = !doctor.hasInvoice ? (commissionAmount * (retentionPercentage / 100)) : 0;
    const totalLiquid = commissionAmount - retention;

    return NextResponse.json({
      retentionPercentage,
      doctor,
      sales: reportSales,
      totals: {
        totalFacturado,
        totalDescuentos,
        subtotal,
        commissionAmount,
        retention,
        totalLiquid
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
