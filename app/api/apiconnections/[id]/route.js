import dbConnect from '@/lib/mongodb';
import ApiConnection from '@/models/ApiConnection';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function PUT(req, { params }) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const p = await params;
    const data = await req.json();
    const conn = await ApiConnection.findByIdAndUpdate(p.id, data, { new: true, runValidators: true });
    if (!conn) {
      return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
    }
    return NextResponse.json(conn);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const p = await params;
    const conn = await ApiConnection.findByIdAndDelete(p.id);
    if (!conn) {
      return NextResponse.json({ error: 'Conexión no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Conexión eliminada correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
