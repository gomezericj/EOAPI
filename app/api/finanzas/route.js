import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Setting from '@/models/Setting';
import Doctor from '@/models/Doctor';
import FixedExpense from '@/models/FixedExpense';
import VariableExpense from '@/models/VariableExpense';
import Expense from '@/models/Expense';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');

  await dbConnect();

  try {
    let query = {};
    const touchedMonths = new Set();
    
    if (startParam && endParam) {
      const s = new Date(startParam + 'T00:00:00Z');
      const e = new Date(endParam + 'T23:59:59Z');
      query.date = { 
        $gte: s, 
        $lte: e 
      };
      
      let curr = new Date(s);
      while (curr.getTime() <= e.getTime()) {
        touchedMonths.add(`${curr.getUTCFullYear()}-${curr.getUTCMonth() + 1}`);
        // Advance month by 1
        curr.setUTCMonth(curr.getUTCMonth() + 1);
        // Correct overflow issues or simply continue
      }
    } else {
      const now = new Date();
      touchedMonths.add(`${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`);
    }

    const sales = await Sale.find(query)
      .populate('procedureId', 'name specialty costs')
      .populate('doctorId', 'name surname commissionPercentage hasInvoice')
      .populate('patientId', 'name surname rut');

    let setting = await Setting.findOne();
    const globalRetention = setting ? setting.retentionPercentage : 13;

    // Fetch Expenses
    const fixedExpenses = await FixedExpense.find({});
    const totalFixedPerMonth = fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const monthsCount = touchedMonths.size || 1;
    const totalFixed = totalFixedPerMonth * monthsCount;

    let totalVariable = 0;
    for (const my of touchedMonths) {
      const [y, m] = my.split('-');
      const vars = await VariableExpense.find({ month: Number(m), year: Number(y) });
      totalVariable += vars.reduce((acc, curr) => acc + curr.amount, 0);
    }
    
    // Fetch Egresos (Caja Diaria)
    const egresos = await Expense.find(query);
    const egresosByType = { valePersonal: 0, gastoClinica: 0, otro: 0 };
    const totalEgresos = egresos.reduce((acc, curr) => {
      const amt = curr.amount || 0;
      if (curr.type === 'Vale Personal') egresosByType.valePersonal += amt;
      else if (curr.type === 'Gasto Clinica') egresosByType.gastoClinica += amt;
      else egresosByType.otro += amt;
      return acc + amt;
    }, 0);

    let totalBruto = 0;
    let totalInsumos = 0;
    let totalAdmin = 0;
    let totalInstalaciones = 0;
    let totalComisiones = 0;
    const paymentMethods = { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 };
    
    const procStats = {};
    const docStats = {};
    const patStats = {};
    const specStats = {};
    const chartData = [];
    const trendMap = {};

    for (const sale of sales) {
      const bruto = sale.totalToCollect || 0;
      totalBruto += bruto;

      if (sale.payments) {
        sale.payments.forEach(p => {
          const m = p.method?.toLowerCase()?.trim();
          const amt = Number(p.amount) || 0;
          if (m === 'efecitvo') paymentMethods.efectivo += amt;
          else if (paymentMethods.hasOwnProperty(m)) paymentMethods[m] += amt;
        });
      }

      const snap = sale.costsSnapshot || {};
      const insumos = snap.suppliesTotal || 0;
      const admin = snap.adminCost || 0;
      const instalaciones = snap.facilityCost || 0;

      totalInsumos += insumos;
      totalAdmin += admin;
      totalInstalaciones += instalaciones;

      const subtotal = bruto - (sale.discountTotal || 0);
      let doctorPct = sale.doctorId?.commissionPercentage || 0;
      let commissionAmount = subtotal * (doctorPct / 100);
      
      totalComisiones += commissionAmount;

      const neta = bruto - insumos - admin - instalaciones - commissionAmount;

      // Agrupar por procedimiento
      const procName = sale.procedureId?.name || sale.procedureName || 'Desconocido';
      if (!procStats[procName]) procStats[procName] = { name: procName, count: 0, revenue: 0, profit: 0 };
      procStats[procName].count += 1;
      procStats[procName].revenue += bruto;
      procStats[procName].profit += neta;

      // Agrupar por doctor
      const docName = sale.doctorId ? `${sale.doctorId.name} ${sale.doctorId.surname}` : sale.doctorName || 'Desconocido';
      if (!docStats[docName]) docStats[docName] = { name: docName, count: 0, revenue: 0, profit: 0 };
      docStats[docName].count += 1;
      docStats[docName].revenue += bruto;
      docStats[docName].profit += neta;

      // Agrupar por paciente
      const patName = sale.patientId ? `${sale.patientId.name} ${sale.patientId.surname}` : sale.patientName || 'Desconocido';
      if (!patStats[patName]) patStats[patName] = { name: patName, count: 0, revenue: 0, profit: 0 };
      patStats[patName].count += 1;
      patStats[patName].revenue += bruto;
      patStats[patName].profit += neta;

      // Agrupar por especialidad
      const specName = sale.procedureId?.specialty || 'General / Desconocida';
      if (!specStats[specName]) specStats[specName] = { name: specName, count: 0, revenue: 0, profit: 0 };
      specStats[specName].count += 1;
      specStats[specName].revenue += bruto;
      specStats[specName].profit += neta;

      // Tendencia
      const dateStr = new Date(sale.date).toISOString().split('T')[0];
      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { date: dateStr, Costos: 0, Ingresos: 0, desglose: { Insumos: 0, Admin: 0, Instalaciones: 0, Comisiones: 0, Egresos: 0 } };
      }
      const costoDiario = insumos + admin + instalaciones + commissionAmount;
      trendMap[dateStr].Costos += costoDiario;
      trendMap[dateStr].Ingresos += bruto;
      trendMap[dateStr].desglose.Insumos += insumos;
      trendMap[dateStr].desglose.Admin += admin;
      trendMap[dateStr].desglose.Instalaciones += instalaciones;
      trendMap[dateStr].desglose.Comisiones += commissionAmount;
    }

    // Agregar Egresos Diarios a los Costos en el Gráfico de Tendencia
    for (const egreso of egresos) {
      if (egreso.date) {
        const dateStr = new Date(egreso.date).toISOString().split('T')[0];
        if (!trendMap[dateStr]) {
          trendMap[dateStr] = { date: dateStr, Costos: 0, Ingresos: 0, desglose: { Insumos: 0, Admin: 0, Instalaciones: 0, Comisiones: 0, Egresos: 0 } };
        }
        const amt = egreso.amount || 0;
        trendMap[dateStr].Costos += amt;
        trendMap[dateStr].desglose.Egresos += amt;
      }
    }

    // netProfit reflects total income minus all expenses (including fixed and variable)
    const netProfit = totalBruto - totalInsumos - totalAdmin - totalInstalaciones - totalComisiones - totalFixed - totalVariable - totalEgresos;
    
    for (let date in trendMap) {
      chartData.push(trendMap[date]);
    }
    chartData.sort((a,b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      summary: {
        totalBruto,
        totalInsumos,
        totalAdmin,
        totalInstalaciones,
        totalComisiones,
        totalFixed,
        totalVariable,
        totalEgresos,
        egresosByType,
        paymentMethods,
        netProfit
      },
      chartData,
      procedures: Object.values(procStats).sort((a,b) => b.profit - a.profit),
      doctors: Object.values(docStats).sort((a,b) => b.profit - a.profit),
      patients: Object.values(patStats).sort((a,b) => b.profit - a.profit),
      specialties: Object.values(specStats).sort((a,b) => b.profit - a.profit)
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
