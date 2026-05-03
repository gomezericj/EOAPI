import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Doctor from '@/models/Doctor';
import Setting from '@/models/Setting';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para ver comisiones globales' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get('month'));
  const year = parseInt(searchParams.get('year'));

  if (!month || !year) {
    return NextResponse.json({ error: 'Faltan mes o año' }, { status: 400 });
  }

  await dbConnect();

  try {
    const doctors = await Doctor.find({});
    
    let setting = await Setting.findOne();
    const retentionPercentage = setting ? setting.retentionPercentage : 13;
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, 1, 23, 59, 59, 999));
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    end.setUTCHours(23, 59, 59, 999);

    const reports = [];
    let globalFacturado = 0;
    let globalDescuentos = 0;
    let globalSubtotal = 0;
    let globalComisiones = 0;
    let globalRetenciones = 0;
    let globalLiquido = 0;

    for (const doctor of doctors) {
      const sales = await Sale.find({
        doctorId: doctor._id,
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
      });

      let totalFacturado = 0;
      let totalDescuentos = 0;
      let subtotal = 0;

      for (let s of sales) {
        if (s.commissionReleases && s.commissionReleases.length > 0) {
          const releasesThisMonth = s.commissionReleases.filter(r => r.date >= start && r.date <= end);
          for (let r of releasesThisMonth) {
             const proportion = (s.clinicTotal && s.clinicTotal > 0) ? (r.amount / s.clinicTotal) : 0;
             totalFacturado += (s.totalToCollect || 0) * proportion;
             totalDescuentos += (s.discountTotal || 0) * proportion;
             subtotal += r.amount;
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
          }
        }
      }

      const commissionAmount = subtotal * (doctor.commissionPercentage / 100);
      const retention = !doctor.hasInvoice ? (commissionAmount * (retentionPercentage / 100)) : 0;
      const totalLiquid = commissionAmount - retention;

      reports.push({
        doctor,
        salesCount: sales.length,
        totals: {
          totalFacturado,
          totalDescuentos,
          subtotal,
          commissionAmount,
          retention,
          totalLiquid
        }
      });

      globalFacturado += totalFacturado;
      globalDescuentos += totalDescuentos;
      globalSubtotal += subtotal;
      globalComisiones += commissionAmount;
      globalRetenciones += retention;
      globalLiquido += totalLiquid;
    }

    return NextResponse.json({
      retentionPercentage,
      reports,
      globalTotals: {
        totalFacturado: globalFacturado,
        totalDescuentos: globalDescuentos,
        subtotal: globalSubtotal,
        commissionAmount: globalComisiones,
        retention: globalRetenciones,
        totalLiquid: globalLiquido
      }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
