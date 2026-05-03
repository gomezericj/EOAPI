import dbConnect from '@/lib/mongodb';
import Log from '@/models/Log';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit')) || 100;
        const skip = parseInt(searchParams.get('skip')) || 0;

        const logs = await Log.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate('userId', 'name surname email');

        return NextResponse.json(logs);
    } catch (error) {
        console.error('GET Logs Error:', error);
        return NextResponse.json({ error: 'Error fetching logs' }, { status: 500 });
    }
}
