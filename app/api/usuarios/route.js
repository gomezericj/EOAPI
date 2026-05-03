import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { createLog } from '@/lib/logger';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();
  try {
    const users = await User.find({}).select('-password').sort({ name: 1 });
    return NextResponse.json(users);
  } catch (error) {
    console.error('GET Users Error:', error);
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();
  try {
    const body = await request.json();
    
    // Nadie puede crear un superadmin
    if (body.role === 'superadmin') {
      return NextResponse.json({ error: 'No se puede crear un usuario con el rol de super administrador' }, { status: 403 });
    }

    // Un admin solo puede crear usuarios y administradores
    if (session.user.role === 'admin' && !['user', 'admin'].includes(body.role)) {
        return NextResponse.json({ error: 'Rol no permitido' }, { status: 403 });
    }

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
    }
    const user = await User.create(body);

    // Add log
    await createLog({
      action: 'CREATE',
      entity: 'User',
      entityId: user._id,
      details: `Creó un nuevo usuario: ${user.name} ${user.surname} (${user.email}) con rol ${user.role}`
    });

    const { password, ...userWithoutPassword } = user.toObject();
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('POST User Error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'El correo ya está registrado' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Error creating user' }, { status: 500 });
  }
}

