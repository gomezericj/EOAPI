const mongoose = require('mongoose');

async function check() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_system';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const users = db.collection('users');
    const eric = await users.findOne({ email: 'gomez.ericj@gmail.com' });
    console.log('User Eric Data:', JSON.stringify(eric, null, 2));
    await mongoose.disconnect();
}

check().catch(err => {
    console.error('Check failed:', err);
    process.exit(1);
});
