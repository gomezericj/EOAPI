import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const uri = 'mongodb://127.0.0.1:27017/dental_clinic';

const init = async () => {
    try {
        await mongoose.connect(uri);
        const UserSchema = new mongoose.Schema({
            email: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            name: { type: String, required: true },
            role: { type: String, enum: ['admin', 'user'], default: 'user' },
        }, { timestamps: true });
        
        const User = mongoose.model('User', UserSchema);

        const password = await bcrypt.hash('password123', 10);
        await User.create({
            email: 'user@test.com',
            password,
            name: 'Test User',
            role: 'user'
        });
        console.log('User created');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
init();
