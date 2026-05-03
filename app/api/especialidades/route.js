import dbConnect from '@/lib/mongodb';
import Specialty from '@/models/Specialty';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  try {
    const specialties = await Specialty.find({}).sort({ name: 1 });
    return NextResponse.json(specialties);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching specialties' }, { status: 500 });
  }
}

import { createLog } from '@/lib/logger';

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const specialty = await Specialty.create(body);

    await createLog({
      action: 'CREATE',
      entity: 'Specialty',
      entityId: specialty._id,
      details: `Creó una nueva especialidad: ${specialty.name}`
    });

    return NextResponse.json(specialty, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'La especialidad ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error creating specialty' }, { status: 500 });
  }
}
