
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const logs = await mongoose.connection.db.collection('logs')
            .find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();
        logs.forEach(l => {
            console.log(`${l.createdAt} - ${l.action} ${l.entity}: ${l.details}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
