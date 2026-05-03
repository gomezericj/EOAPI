const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/clinic_system';

const removePaymentType = async () => {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection;
        const Sale = db.collection('sales');
        
        // Remove `type` from all elements in the `payments` array
        const result = await Sale.updateMany(
            {}, 
            { $unset: { "payments.$[].type": "" } }
        );
        
        console.log(`Updated ${result.modifiedCount} sales properties.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
removePaymentType();
