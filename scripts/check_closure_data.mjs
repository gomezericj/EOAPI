import dbConnect from '../lib/mongodb.js';
import Closure from '../models/Closure.js';
import mongoose from 'mongoose';

async function checkClosure() {
    await dbConnect();
    const dateStr = '2026-02-18';
    const parts = dateStr.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const closure = await Closure.findOne({ date: targetDate });
    if (closure) {
        console.log("Closure found for Feb 18:");
        console.log(JSON.stringify(closure, null, 2));
    } else {
        console.log("No saved closure for Feb 18.");
    }

    mongoose.connection.close();
}

checkClosure();
