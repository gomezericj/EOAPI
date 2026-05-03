import dbConnect from '@/lib/mongodb';
import Supply from '@/models/Supply';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  try {
    const supplies = await Supply.find({}).sort({ name: 1 });
    return NextResponse.json(supplies);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching supplies' }, { status: 500 });
  }
}

import { createLog } from '@/lib/logger';

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const supply = await Supply.create(body);

    await createLog({
      action: 'CREATE',
      entity: 'Supply',
      entityId: supply._id,
      details: `Creó un nuevo insumo: ${supply.name}`
    });

    return NextResponse.json(supply, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating supply' }, { status: 500 });
  }
}
