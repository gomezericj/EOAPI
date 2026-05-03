
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';

async function test(id) {
    try {
        await mongoose.connect(MONGODB_URI);
        const collection = mongoose.connection.db.collection('doctors');
        const oid = new mongoose.Types.ObjectId(id);

        let doc = await collection.findOne({ _id: oid });
        console.log('Current state:', doc.name, 'isActive:', doc.isActive);

        const newVal = doc.isActive === false ? true : false;
        const res = await collection.updateOne({ _id: oid }, { $set: { isActive: newVal } });
        console.log('Update result:', res);

        doc = await collection.findOne({ _id: oid });
        console.log('New state:', doc.name, 'isActive:', doc.isActive);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

// Get ID from args
const id = process.argv[2];
if (!id) {
    console.log("Usage: node verify_toggle.js <ID>");
    process.exit(1);
}
test(id);
