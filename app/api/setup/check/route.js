import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Setting from '@/models/Setting';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  
  try {
    const adminCount = await User.countDocuments({ role: { $in: ['admin', 'superadmin'] } });
    const setting = await Setting.findOne();
    
    return NextResponse.json({
      setupRequired: adminCount === 0,
      setting: setting || { clinicName: 'Clínica Dental', primaryColor: '#0ea5e9' }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
