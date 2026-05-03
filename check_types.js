
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const doctors = await mongoose.connection.db.collection('doctors').find({}).toArray();
        doctors.forEach(d => {
            console.log(`Name: ${d.name}, isActive: ${d.isActive}, type: ${typeof d.isActive}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
