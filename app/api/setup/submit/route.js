import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Setting from '@/models/Setting';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await dbConnect();
  
  try {
    // Check if we already have an admin
    const adminCount = await User.countDocuments({ role: { $in: ['admin', 'superadmin'] } });
    if (adminCount > 0) {
      return NextResponse.json({ error: 'El sistema ya ha sido inicializado. No se puede ejecutar el setup nuevamente.' }, { status: 403 });
    }

    const { clinicName, logoBase64, primaryColor, adminName, adminSurname, adminEmail, adminPassword } = await req.json();

    if (!clinicName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create superadmin
    await User.create({
      name: adminName,
      surname: adminSurname,
      email: adminEmail,
      password: hashedPassword,
      role: 'superadmin',
      isActive: true
    });

    // Update or create Setting
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }
    
    setting.clinicName = clinicName;
    setting.logoBase64 = logoBase64 || '';
    setting.primaryColor = primaryColor || '#0ea5e9';
    await setting.save();

    return NextResponse.json({ success: true, message: 'Sistema inicializado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
