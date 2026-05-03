import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import { isDayClosed } from '@/lib/closureCheck';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  try {
    const { amount, date } = await req.json();
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'El monto a liberar debe ser mayor a 0' }, { status: 400 });
    }

    const releaseDate = new Date(date || new Date());
    
    if (await isDayClosed(releaseDate)) {
      return NextResponse.json({ error: 'El día seleccionado para la liberación ya está cerrado.' }, { status: 400 });
    }

    const sale = await Sale.findById(id);
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

    if (!sale.isTreatmentInProgress && sale.commissionReleasedTotal >= sale.clinicTotal) {
      return NextResponse.json({ error: 'Este tratamiento ya está completamente liberado.' }, { status: 400 });
    }

    const maxRelease = (sale.clinicTotal || 0) - (sale.commissionReleasedTotal || 0);
    
    if (amount > maxRelease) {
      return NextResponse.json({ error: `El monto no puede superar el saldo pendiente de liberación ($${maxRelease})` }, { status: 400 });
    }

    sale.commissionReleases.push({
      date: releaseDate,
      amount: amount
    });
    
    sale.commissionReleasedTotal = (sale.commissionReleasedTotal || 0) + amount;
    
    // Si se liberó todo, marcamos como finalizado
    if (sale.commissionReleasedTotal >= sale.clinicTotal) {
      sale.isTreatmentInProgress = false;
      // Also set the legacy commissionReleaseDate to the final date for backward compatibility
      sale.commissionReleaseDate = releaseDate;
    }

    await sale.save();

    return NextResponse.json({ message: 'Comisión liberada con éxito', sale });
  } catch (error) {
    console.error('Release error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
