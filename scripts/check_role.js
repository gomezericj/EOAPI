const mongoose = require('mongoose');

async function check() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_system';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const eric = await db.collection('users').findOne({ email: 'gomez.ericj@gmail.com' });
    console.log('ERIC ROLE:', eric ? eric.role : 'NOT FOUND');
    await mongoose.disconnect();
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
