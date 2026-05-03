import dbConnect from '@/lib/mongodb';
import Procedure from '@/models/Procedure';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  try {
    const procedures = await Procedure.find({}).sort({ name: 1 });
    return NextResponse.json(procedures);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching procedures' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para crear procedimientos' }, { status: 401 });
  }
  
  await dbConnect();
  try {
    const body = await request.json();
    const procedure = await Procedure.create(body);

    // Add log
    await createLog({
      action: 'CREATE',
      entity: 'Procedure',
      entityId: procedure._id,
      details: `Agregó procedimiento: ${procedure.name}`
    });

    return NextResponse.json(procedure, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating procedure' }, { status: 500 });
  }
}
