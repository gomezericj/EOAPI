import dbConnect from './lib/mongodb.js';
import User from './models/User.js';

async function testCreate() {
  await dbConnect();
  try {
    const user = await User.create({
      name: 'Test',
      surname: 'User',
      email: 'test' + Date.now() + '@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('User created:', user.email);
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    process.exit(0);
  }
}

testCreate();
