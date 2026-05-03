import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
    const db = mongoose.connection;
    const User = db.collection('users');
    const user = await User.findOne({ email: 'rocio@test.cl' });
    console.log("USER:", user);
    process.exit(0);
}).catch(console.error);
