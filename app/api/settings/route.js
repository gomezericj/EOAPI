import dbConnect from '@/lib/mongodb';
import Setting from '@/models/Setting';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ retentionPercentage: 13 });
    }
    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { createLog } from '@/lib/logger';

export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();
  try {
    const data = await req.json();
    let setting = await Setting.findOne();
    if (setting) {
      if (data.retentionPercentage !== undefined) setting.retentionPercentage = data.retentionPercentage;
      if (data.clinicName !== undefined) setting.clinicName = data.clinicName;
      if (data.logoBase64 !== undefined) setting.logoBase64 = data.logoBase64;
      if (data.primaryColor !== undefined) setting.primaryColor = data.primaryColor;
      await setting.save();
    } else {
      setting = await Setting.create(data);
    }

    await createLog({
      action: 'UPDATE',
      entity: 'Setting',
      entityId: setting._id,
      details: `Actualizó el porcentaje de retención a ${setting.retentionPercentage}%`
    });

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
