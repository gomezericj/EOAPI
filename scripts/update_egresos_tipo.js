import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Expense from '../models/Expense.js';

dotenv.config({ path: '../.env.local' });

const MONGO_URI = process.env.MONGODB_URI;

const updateEgresos = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const expenses = await Expense.find({});
    console.log(`Found ${expenses.length} expenses to update.`);

    const types = ['Vale Personal', 'Gasto Clinica', 'Otro'];

    for (const expense of expenses) {
      if (!expense.type || expense.type === 'Otro') {
        const randomType = types[Math.floor(Math.random() * types.length)];
        expense.type = randomType;
        await expense.save();
        console.log(`Updated expense ${expense._id} to type: ${randomType}`);
      }
    }

    console.log('Update complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating expenses:', error);
    process.exit(1);
  }
};

updateEgresos();
