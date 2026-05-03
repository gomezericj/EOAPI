import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_system';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  name: { type: String, required: true },
  surname: { type: String, required: true },
}, { timestamps: true });

UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  console.log('Connecting to:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  
  const email = 'gomez.ericj@gmail.com';
  const password = '140313se';
  
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('User exists, updating...');
      existing.password = password;
      existing.role = 'admin';
      existing.name = 'Eric';
      existing.surname = 'Gomez';
      await existing.save();
    } else {
      console.log('Creating new user...');
      await User.create({
        email,
        password,
        role: 'admin',
        name: 'Eric',
        surname: 'Gomez'
      });
    }
    console.log('Success!');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
