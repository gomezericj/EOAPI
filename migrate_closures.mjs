import mongoose from 'mongoose';

const migrate = async () => {
  await mongoose.connect('mongodb://localhost:27017/clinic_system');
  console.log("Conectado a BD. Iniciando migración de todos los cierres históricos...");

  const ClosureSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    cashTotal: { type: Number, default: 0 },
    debitTotal: { type: Number, default: 0 },
    creditTotal: { type: Number, default: 0 },
    insuranceTotal: { type: Number, default: 0 },
    
    todayTotals: {
      cash: { type: Number, default: 0 },
      debit: { type: Number, default: 0 },
      credit: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
    },
    pastTotals: {
      cash: { type: Number, default: 0 },
      debit: { type: Number, default: 0 },
      credit: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
    },

    pendingTotal: { type: Number, default: 0 },
    totalPatients: { type: Number, default: 0 },
    expensesTotal: { type: Number, default: 0 },
    
    clinicalSaleTotal: { type: Number, default: 0 },
    pastDebtCollected: { type: Number, default: 0 },
    totalCollectedGeneral: { type: Number, default: 0 },
    netSubtotal: { type: Number, default: 0 },

    isSent: { type: Boolean, default: false },
  }, { strict: false });

  const Closure = mongoose.models.Closure || mongoose.model('Closure', ClosureSchema);

  const allClosures = await Closure.find({});
  console.log(`Encontrados ${allClosures.length} cierres por actualizar.`);

  let count = 0;
  for (const c of allClosures) {
    const todaySum = (c.todayTotals?.cash || 0) + (c.todayTotals?.debit || 0) + (c.todayTotals?.credit || 0) + (c.todayTotals?.insurance || 0);
    const pastSum = (c.pastTotals?.cash || 0) + (c.pastTotals?.debit || 0) + (c.pastTotals?.credit || 0) + (c.pastTotals?.insurance || 0);
    const genSum = (c.cashTotal || 0) + (c.debitTotal || 0) + (c.creditTotal || 0) + (c.insuranceTotal || 0);

    c.clinicalSaleTotal = todaySum + (c.pendingTotal || 0);
    c.pastDebtCollected = pastSum;
    c.totalCollectedGeneral = genSum;
    c.netSubtotal = (c.cashTotal || 0) + (c.debitTotal || 0) + (c.creditTotal || 0) - (c.expensesTotal || 0);

    await c.save();
    count++;
  }

  console.log(`✅ ¡Migración de base de datos finalizada! Se actualizaron ${count} cierres con la nueva estructura de totales contables.`);
  process.exit();
};

migrate().catch(console.error);
