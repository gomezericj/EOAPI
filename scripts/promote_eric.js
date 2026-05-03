const mongoose = require('mongoose');

async function promote() {
    // Correct URI using underscore as per mongodb.js
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_system';
    console.log('Connecting to:', uri);
    
    await mongoose.connect(uri);
    
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    const result = await users.updateOne(
        { email: 'gomez.ericj@gmail.com' },
        { $set: { role: 'superadmin' } }
    );
    
    if (result.matchedCount > 0) {
        console.log('User gomez.ericj@gmail.com found and promoted to superadmin.');
    } else {
        console.log('User gomez.ericj@gmail.com not found.');
    }
    
    await mongoose.disconnect();
}

promote().catch(err => {
    console.error('Promotion failed:', err);
    process.exit(1);
});
