import dbConnect from '@/lib/mongodb';
import Target from '@/models/Target';
import { NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para ver metas' }, { status: 401 });
  }

  await dbConnect();
  try {
    const targets = await Target.find({}).sort({ year: -1, month: -1 });
    return NextResponse.json(targets);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching targets' }, { status: 500 });
  }
}

import { createLog } from '@/lib/logger';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado para crear metas' }, { status: 401 });
  }

  await dbConnect();
  try {
    const body = await request.json();
    const target = await Target.create(body);

    await createLog({
      action: 'CREATE',
      entity: 'Meta',
      entityId: target._id,
      details: `Creó una nueva meta para ${target.month}/${target.year}: ${target.goalAmount}`
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating target' }, { status: 500 });
  }
}
