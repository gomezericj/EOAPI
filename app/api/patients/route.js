import dbConnect from '@/lib/mongodb';
import Patient from '@/models/Patient';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  try {
    const patients = await Patient.find({}).sort({ createdAt: -1 });
    return NextResponse.json(patients);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching patients' }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const data = await req.json();
    const patient = await Patient.create(data);

    // Add log
    await createLog({
      action: 'CREATE',
      entity: 'Patient',
      entityId: patient._id,
      details: `Agregó paciente: ${patient.name} ${patient.surname} (RUT: ${patient.rut})`
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'El RUT ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

