
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

async function testFirst() {
    try {
        await mongoose.connect(MONGODB_URI);
        const collection = mongoose.connection.db.collection('doctors');
        const doc = await collection.findOne({});
        if (!doc) return console.log("No doctors");

        console.log('Testing toggle for:', doc.name, 'ID:', doc._id, 'Current isActive:', doc.isActive);

        const newVal = doc.isActive === false ? true : false;
        await collection.updateOne({ _id: doc._id }, { $set: { isActive: newVal } });

        const doc2 = await collection.findOne({ _id: doc._id });
        console.log('After toggle, isActive:', doc2.isActive);

        // Toggle back
        await collection.updateOne({ _id: doc._id }, { $set: { isActive: doc.isActive ?? true } });
        console.log('Successfully toggled and restored.');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

testFirst();
