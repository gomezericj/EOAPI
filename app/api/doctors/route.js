import dbConnect from '@/lib/mongodb';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  try {
    const doctors = await Doctor.find({}).sort({ createdAt: -1 });
    return NextResponse.json(doctors);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching doctors' }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  
  await dbConnect();
  try {
    const data = await req.json();
    
    const isUser = session.user.role === 'user';
    if (isUser) {
       // Override for non-admins to ensure defaults
       data.commissionPercentage = 40;
       data.hasInvoice = false;
    }

    const doctor = await Doctor.create(data);

    // Add log
    await createLog({
      action: 'CREATE',
      entity: 'Doctor',
      entityId: doctor._id,
      details: `Agregó doctor: ${doctor.name} ${doctor.surname}`
    });

    return NextResponse.json(doctor, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'El RUT ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
