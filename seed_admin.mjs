import dbConnect from './lib/mongodb.js';
import User from './models/User.js';
import mongoose from 'mongoose';

async function seedAdmin() {
  await dbConnect();
  
  const adminEmail = 'gomez.ericj@gmail.com';
  
  const existingUser = await User.findOne({ email: adminEmail });
  if (existingUser) {
    console.log('Admin user already exists. Updating password and role...');
    existingUser.password = '140313se';
    existingUser.role = 'admin';
    existingUser.name = 'Eric';
    existingUser.surname = 'Gomez';
    await existingUser.save();
  } else {
    console.log('Creating admin user...');
    await User.create({
      email: adminEmail,
      password: '140313se',
      role: 'admin',
      name: 'Eric',
      surname: 'Gomez'
    });
  }
  
  console.log('Admin user seeded successfully!');
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
