import dbConnect from '../lib/mongodb.js';
import Sale from '../models/Sale.js';
import mongoose from 'mongoose';

async function migrate() {
    try {
        console.log("Connecting to DB...");
        // Use the connection string from process.env or hardcoded if necessary for local run
        // In this environment, we usually use the configured mongodb.js
        await dbConnect();
        
        console.log("Searching for sales with 'debito' method to convert some to 'transferencia'...");
        const sales = await Sale.find({ 'payments.method': 'debito' }).limit(10);
        
        if (sales.length === 0) {
            console.log("No sales found with 'debito' method.");
        } else {
            for (const sale of sales) {
                let changed = false;
                sale.payments.forEach(p => {
                    if (p.method === 'debito' && Math.random() > 0.5) {
                        p.method = 'transferencia';
                        changed = true;
                    }
                });
                if (changed) {
                    await sale.save();
                    console.log(`Updated sale ${sale._id}`);
                }
            }
        }
        
        console.log("Migration finished.");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        mongoose.connection.close();
    }
}

migrate();
