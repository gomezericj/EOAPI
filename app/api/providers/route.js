import dbConnect from '@/lib/mongodb';
import Provider from '@/models/Provider';
import { NextResponse } from 'next/server';
import { createLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  try {
    const providers = await Provider.find({}).sort({ createdAt: -1 });
    return NextResponse.json(providers);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching providers' }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const data = await req.json();
    const provider = await Provider.create(data);

    // Add log
    await createLog({
      action: 'CREATE',
      entity: 'Provider',
      entityId: provider._id,
      details: `Creó proveedor: ${provider.name} (RUT: ${provider.rut})`
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'El RUT ya existe' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
