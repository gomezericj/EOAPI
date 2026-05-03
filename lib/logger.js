import dbConnect from './mongodb';
import Log from '@/models/Log';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function createLog({ action, entity, entityId, details }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            console.warn('Logging attempt without session');
            return;
        }

        await dbConnect();

        await Log.create({
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            action,
            entity,
            entityId,
            details
        });
    } catch (error) {
        console.error('Failed to create log:', error);
    }
}
