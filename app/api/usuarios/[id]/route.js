import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { createLog } from '@/lib/logger';

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  await dbConnect();
  try {
    const p = await params;
    const targetUserId = p.id;

    if (session.user.id === targetUserId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta logueada' }, { status: 400 });
    }

    const userToDelete = await User.findById(targetUserId);
    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Security rule for DELETE
    if (session.user.role === 'admin' && userToDelete.role === 'superadmin') {
      return NextResponse.json({ error: 'No tiene los permisos para eliminar a un súper administrador.' }, { status: 403 });
    }

    await User.findByIdAndDelete(targetUserId);

    await createLog({
      action: 'DELETE',
      entity: 'User',
      entityId: targetUserId,
      details: `Eliminó el usuario: ${userToDelete.name} ${userToDelete.surname} (${userToDelete.email})`
    });

    return NextResponse.json({ message: 'Usuario eliminado' }, { status: 200 });
  } catch (error) {
    console.error('DELETE User Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor al eliminar usuario' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    const p = await params;
    const targetUserId = p.id;
    const body = await request.json();

    const updatedUser = await User.findById(targetUserId);
    if (!updatedUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Hierarchy and Role Management Rules
    
    // Admin no puede editar a un super admin
    if (session.user.role === 'admin' && updatedUser.role === 'superadmin') {
       return NextResponse.json({ error: 'No tienes permisos para editar a un súper administrador' }, { status: 403 });
    }

    if (body.role) {
       // Nadie puede editar su propio rol
       if (session.user.id === targetUserId && body.role !== updatedUser.role) {
          return NextResponse.json({ error: 'No puedes editar tu propio rol' }, { status: 403 });
       }
       
       // No se puede asignar el rol superadmin a nadie
       if (body.role === 'superadmin' && updatedUser.role !== 'superadmin') {
          return NextResponse.json({ error: 'No se puede asignar el rol de súper administrador' }, { status: 403 });
       }

       if (session.user.role === 'admin' && !['user', 'admin'].includes(body.role)) {
          return NextResponse.json({ error: 'Rol no permitido' }, { status: 403 });
       }

       updatedUser.role = body.role;
    }

    if (body.name) updatedUser.name = body.name;
    if (body.surname) updatedUser.surname = body.surname;
    if (body.email) updatedUser.email = body.email;

    if (body.password && body.password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      updatedUser.password = await bcrypt.hash(body.password, salt);
    }

    await updatedUser.save();

    // Log the update
    await createLog({
        action: 'UPDATE',
        entity: 'User',
        entityId: targetUserId,
        details: `Actualizó el usuario: ${updatedUser.name} ${updatedUser.surname}. Nuevo Rol: ${updatedUser.role}`
    });

    const { password, ...userWithoutPassword } = updatedUser.toObject();
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('PUT User Error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'El correo ya está registrado por otro usuario' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar usuario', details: error.message }, { status: 500 });
  }
}
