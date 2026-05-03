import dbConnect from '@/lib/mongodb';
import ApiConnection from '@/models/ApiConnection';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
// Triggering rebuild to fix Next.js cache issue

// Get all API connections. Auto-creates Dentalink if it doesn't exist
export async function GET(req) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  
  try {
    let connections = await ApiConnection.find({});
    
    // Migration complete.

    // Auto-create Dentalink connection with existing default credentials
    const dentalinkExists = connections.some(c => c.systemKey === 'DENTALINK_PACIENTES');
    if (!dentalinkExists) {
      const newDentalink = await ApiConnection.create({
        provider: 'Dentalink Oficial',
        systemKey: 'DENTALINK_PACIENTES',
        isActive: true, // Default to active since it was active before
        environment: 'PROD',
        baseUrl: 'https://api.dentalink.healthatom.com/api/v1',
        apiKey: 'qXRo8ISMi4YZHCP1IWMgHgTwLtQXL5tPxlHTPAj3.zzImXg8g3L1gW53s0WovQnfXFjqomnNPHibhW6d0',
        clientId: 'qXRo8ISMi4YZHCP1IWMgHgTwLtQXL5tPxlHTPAj3'
      });
      connections.push(newDentalink);
    }

    // Security: Only superadmins can see tokens
    const isSuperadmin = session?.user?.role === 'superadmin';
    const securedConnections = connections.map(c => {
      const connObj = c.toObject ? c.toObject() : c;
      if (!isSuperadmin) {
        delete connObj.apiKey;
        delete connObj.clientSecret;
      }
      return connObj;
    });

    return NextResponse.json(securedConnections);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const data = await req.json();
    const conn = await ApiConnection.create(data);
    return NextResponse.json(conn, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
