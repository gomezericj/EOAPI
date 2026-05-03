const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/clinic_system';

const init = async () => {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection;
        const User = db.collection('users');
        const user = await User.findOne({ email: 'rocio@test.cl' });
        console.log(`Password for rocio: ${user.password}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
init();
