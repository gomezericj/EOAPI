const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = 'mongodb://127.0.0.1:27017/clinic_system';

const init = async () => {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection;
        const User = db.collection('users');
        
        const users = await User.find({}).toArray();
        let updatedCount = 0;
        
        for (const user of users) {
            // Check if password seems NOT hashed (bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars long)
            if (user.password && !user.password.startsWith('$2')) {
                console.log(`Fixing password for user: ${user.email}`);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(user.password, salt);
                await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
                updatedCount++;
            }
        }
        
        console.log(`Fixed ${updatedCount} users.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
init();
