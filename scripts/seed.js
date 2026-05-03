const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Minimal model definition for script
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  name: { type: String, required: true },
  surname: { type: String, required: true },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  const MONGODB_URI = 'mongodb://localhost:27017/clinic_system';
  await mongoose.connect(MONGODB_URI);

  const adminEmail = 'admin'; // User requested "admin" as user
  const adminPassword = 'admin'; // User requested "admin" as password
  
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log('Admin user already exists');
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      name: 'Admin',
      surname: 'System'
    });
    console.log('Admin user created successfully');
  }

  await mongoose.disconnect();
}

seed().catch(err => console.error(err));
