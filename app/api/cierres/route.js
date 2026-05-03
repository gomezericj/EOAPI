import dbConnect from '@/lib/mongodb';
import Closure from '@/models/Closure';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  try {
    const closures = await Closure.find({}, { date: 1 });
    // Return an array of date strings in YYYY-MM-DD format
    const closedDates = closures.map(c => new Date(c.date).toISOString().split('T')[0]);
    return NextResponse.json(closedDates);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
