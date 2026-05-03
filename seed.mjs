import mongoose from 'mongoose';

const RUN_DB = async () => {
  await mongoose.connect('mongodb://localhost:27017/clinic_system');
  console.log("Connectado a DB. Eliminando toda la data antigua para comenzar fresco...");
  await mongoose.connection.db.dropDatabase();

  const PaymentSchema = new mongoose.Schema({
    date: Date, method: String, type: String, amount: Number
  });
  const SaleSchema = new mongoose.Schema({
    date: Date, procedureId: mongoose.Schema.Types.ObjectId, procedureName: String,
    unitPrice: Number, quantity: Number, doctorId: mongoose.Schema.Types.ObjectId,
    patientId: mongoose.Schema.Types.ObjectId, discountName: String,
    discountQuantity: Number, discountPrice: Number, discountTotal: Number,
    totalToCollect: Number, totalCharged: Number, pendingAmount: Number,
    clinicTotal: Number, payments: [PaymentSchema], status: String
  }, { timestamps: true });

  const ClosureSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    cashTotal: { type: Number, default: 0 },
    debitTotal: { type: Number, default: 0 },
    creditTotal: { type: Number, default: 0 },
    insuranceTotal: { type: Number, default: 0 },
    transferTotal: { type: Number, default: 0 },
    todayTotals: { cash: { type: Number, default: 0 }, debit: { type: Number, default: 0 }, credit: { type: Number, default: 0 }, insurance: { type: Number, default: 0 }, transfer: { type: Number, default: 0 } },
    pastTotals: { cash: { type: Number, default: 0 }, debit: { type: Number, default: 0 }, credit: { type: Number, default: 0 }, insurance: { type: Number, default: 0 }, transfer: { type: Number, default: 0 } },
    pendingTotal: { type: Number, default: 0 },
    totalPatients: { type: Number, default: 0 },
    expensesTotal: { type: Number, default: 0 },
    isSent: { type: Boolean, default: false },
  }, { timestamps: true });

  const DoctorSchema = new mongoose.Schema({ name: String, surname: String, rut: String, specialties: [mongoose.Schema.Types.ObjectId], commissionPercentage: Number, hasInvoice: Boolean });
  const PatientSchema = new mongoose.Schema({ name: String, surname: String, rut: String, email: String, phone: String });
  const ProcedureSchema = new mongoose.Schema({ name: String, price: Number, type: String, requiresLab: Boolean, category: String });
  const SupplySchema = new mongoose.Schema({ name: String, unitPrice: Number, provider: String, category: String });
  const SpecialtySchema = new mongoose.Schema({ name: String });
  const TargetSchema = new mongoose.Schema({ month: Number, year: Number, amount: Number });
  const ExpenseSchema = new mongoose.Schema({ date: Date, name: String, reason: String, amount: Number });

  const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
  const Closure = mongoose.models.Closure || mongoose.model('Closure', ClosureSchema);
  const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
  const Patient = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
  const Procedure = mongoose.models.Procedure || mongoose.model('Procedure', ProcedureSchema);
  const Supply = mongoose.models.Supply || mongoose.model('Supply', SupplySchema);
  const Specialty = mongoose.models.Specialty || mongoose.model('Specialty', SpecialtySchema);
  const Target = mongoose.models.Target || mongoose.model('Target', TargetSchema);
  const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

  // 1. 10 Specialties
  console.log("Generando 10 Especialidades...");
  const specs = [];
  for (let i = 1; i <= 10; i++) {
    specs.push(await Specialty.create({ name: `Especialidad Estética ${i}` }));
  }

  // 2. 10 Doctors
  console.log("Generando 10 Doctores profesionales...");
  const docs = [];
  for (let i = 1; i <= 10; i++) {
    docs.push(await Doctor.create({
      name: `Doctor`, surname: `Prueba ${i}`, rut: `11${i}45678-K`,
      specialties: [specs[i%10]._id], commissionPercentage: 30 + (i % 20), hasInvoice: i % 2 === 0
    }));
  }

  // 3. 20 Patients
  console.log("Generando 20 Pacientes...");
  const pats = [];
  for (let i = 1; i <= 20; i++) {
    pats.push(await Patient.create({
      name: `Paciente`, surname: `Prueba ${i}`, rut: `22${i}45678-9`,
      email: `paciente${i}@correo.com`, phone: `+569876543${i % 10}${i % 10}`
    }));
  }

  // 4. 10 Procedures
  console.log("Generando 10 Procedimientos Clínicos...");
  const procs = [];
  for (let i = 1; i <= 10; i++) {
    procs.push(await Procedure.create({
      name: `Procedimiento de Estética ${i}`, price: 50000 * i, type: 'clínico', requiresLab: i % 3 === 0, category: 'General'
    }));
  }

  // 5. 10 Supplies (Discounts)
  console.log("Generando 10 Descuentos/Costos Insumos...");
  const sups = [];
  for (let i = 1; i <= 10; i++) {
    sups.push(await Supply.create({ name: `Insumo/Material Importado ${i}`, unitPrice: 15000 * i, category: 'Insumo', provider: 'Dental Chile Proveedores' }));
  }

  // 6. Targets for Jan, Feb, Mar 2026
  console.log("Estableciendo Metas Mensuales...");
  await Target.create([
    { month: 1, year: 2026, amount: 20000000 }, 
    { month: 2, year: 2026, amount: 25000000 }, 
    { month: 3, year: 2026, amount: 30000000 }
  ]);

  // 7. Sales for Jan and Feb 2026
  console.log("Agregando +300 Tratamientos/Ventas para estresar Febrero y Enero con data mixta...");
  const methods = ['efectivo', 'debito', 'credito', 'seguro', 'transferencia'];
  
  const randEl = arr => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // dates from Jan 1 2026 to Feb 28 2026
  const startDate = new Date(Date.UTC(2026, 0, 1, 10, 0, 0));
  const endDate = new Date(Date.UTC(2026, 1, 28, 18, 0, 0));

  for (let i = 0; i < 350; i++) {
    const saleDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const p = randEl(procs);
    const d = randEl(docs);
    const pat = randEl(pats);
    const sup = randEl(sups);
    
    // Add discount/insumo sometimes
    const hasDiscount = Math.random() > 0.4;
    const qty = randInt(1, 3);
    const totalToCollect = p.price * qty;
    let discountQuantity = 0;
    let discountPrice = 0;
    let discountTotal = 0;
    
    if (hasDiscount) {
      discountQuantity = randInt(1, 2);
      discountPrice = sup.unitPrice;
      discountTotal = discountQuantity * discountPrice;
      
      // RULE 3 & 4 Protection: Never allow discounts greater than totalToCollect
      if (discountTotal > totalToCollect) {
         discountQuantity = 1;
         discountPrice = Math.floor(totalToCollect / 2);
         discountTotal = discountPrice;
      }
    }
    const clinicTotal = totalToCollect - discountTotal;

    const scenario = Math.random();
    let payments = [];
    let totalCharged = 0;

    if (scenario < 0.4) { // 40% paid full same day
      totalCharged = totalToCollect;
      payments.push({ date: saleDate, method: randEl(methods), type: 'total', amount: totalCharged });
    } else if (scenario < 0.6) { // 20% pending fully
      totalCharged = 0;
    } else { // 40% partial payment same day, and maybe abono later
      totalCharged = Math.floor(totalToCollect / 2);
      payments.push({ date: saleDate, method: randEl(methods), type: 'abono', amount: totalCharged });

      // potentially adds an abono a few days later
      if (Math.random() > 0.4) {
        const abonoDate = new Date(saleDate.getTime() + (randInt(2, 25) * 86400000)); // Paid between 2 and 25 days later
        if (abonoDate < new Date(Date.UTC(2026, 2, 1))) { // make sure abono is before march
          const abonoAmt = totalToCollect - totalCharged;
          payments.push({ date: abonoDate, method: randEl(methods), type: 'abono', amount: abonoAmt });
          totalCharged += abonoAmt;
        }
      }
    }
    
    // RULE 1 Protection: Never allow charging more than total (re-checked)
    if (totalCharged > totalToCollect) {
       totalCharged = totalToCollect;
    }

    const pendingAmount = totalToCollect - totalCharged;
    
    // RULE 2 Protection: Final safety cap on pending
    const safePendingAmount = Math.max(0, Math.min(pendingAmount, totalToCollect));
    const status = safePendingAmount <= 0 ? 'pagada' : 'pendiente';

    await Sale.create({
      date: saleDate, procedureId: p._id, procedureName: p.name, unitPrice: p.price, quantity: qty,
      doctorId: d._id, patientId: pat._id, discountName: sup.name, discountQuantity, discountPrice,
      discountTotal, totalToCollect, totalCharged, pendingAmount: safePendingAmount, clinicTotal, payments, status
    });
  }

  console.log("Creando algunos Egresos esporádicos en los meses...");
  for (let i = 0; i < 60; i++) {
    const expDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    await Expense.create({ date: expDate, name: 'Proveedor Insumos Dentales', reason: 'Abastecimiento local', amount: randInt(20000, 150000) });
  }

  console.log("Calculando y creando todos Cierres de Caja por día exacto (hoy + histórico de abonos) para Enero y Febrero...");
  for (let m = 0; m <= 1; m++) {
    const totalDays = m === 0 ? 31 : 28;
    for (let day = 1; day <= totalDays; day++) {
      const start = new Date(Date.UTC(2026, m, day, 0, 0, 0, 0));
      const end = new Date(Date.UTC(2026, m, day, 23, 59, 59, 999));

      const sales = await Sale.find({
        $or: [
          { date: { $gte: start, $lte: end } },
          { 'payments.date': { $gte: start, $lte: end } }
        ]
      });

      let totals = {
        efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0,
        todayTotals: { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 },
        pastTotals: { efectivo: 0, debito: 0, credito: 0, seguro: 0, transferencia: 0 },
        pending: 0, patients: new Set()
      };

      sales.forEach(s => {
        const saleDate = new Date(s.date);
        if (saleDate >= start && saleDate <= end) {
          if (s.patientId) totals.patients.add(String(s.patientId));
          totals.pending += (Number(s.pendingAmount) || 0);
        }

        if (s.payments && Array.isArray(s.payments)) {
          s.payments.forEach(p => {
            if (!p.date || !p.amount) return;
            const pDate = new Date(p.date);
            if (pDate >= start && pDate <= end) {
              const method = p.method?.toLowerCase()?.trim();
              const amount = Number(p.amount) || 0;
              const isTodaySale = (saleDate >= start && saleDate <= end);
              const targetObj = isTodaySale ? totals.todayTotals : totals.pastTotals;

              if (method === 'efectivo' || method === 'efecitvo') { totals.efectivo += amount; targetObj.efectivo += amount; }
              else if (method === 'debito') { totals.debito += amount; targetObj.debito += amount; }
              else if (method === 'credito') { totals.credito += amount; targetObj.credito += amount; }
              else if (method === 'seguro') { totals.seguro += amount; targetObj.seguro += amount; }
              else if (method === 'transferencia') { totals.transferencia += amount; targetObj.transferencia += amount; }
            }
          });
        }
      });

      const expenses = await Expense.find({ date: { $gte: start, $lte: end } });
      const expensesTotal = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      const todaySum = totals.todayTotals.efectivo + totals.todayTotals.debito + totals.todayTotals.credito + totals.todayTotals.seguro + totals.todayTotals.transferencia;
      const pastSum = totals.pastTotals.efectivo + totals.pastTotals.debito + totals.pastTotals.credito + totals.pastTotals.seguro + totals.pastTotals.transferencia;
      const genSum = totals.efectivo + totals.debito + totals.credito + totals.seguro + totals.transferencia;

      await Closure.create({
        date: start,
        cashTotal: totals.efectivo || 0,
        debitTotal: totals.debito || 0,
        creditTotal: totals.credito || 0,
        insuranceTotal: totals.seguro || 0,
        todayTotals: { cash: totals.todayTotals.efectivo, debit: totals.todayTotals.debito, credit: totals.todayTotals.credito, insurance: totals.todayTotals.seguro },
        pastTotals: { cash: totals.pastTotals.efectivo, debit: totals.pastTotals.debito, credit: totals.pastTotals.credito, insurance: totals.pastTotals.seguro },
        pendingTotal: totals.pending || 0,
        totalPatients: totals.patients.size || 0,
        expensesTotal: expensesTotal || 0,
        clinicalSaleTotal: todaySum + (totals.pending || 0),
        pastDebtCollected: pastSum,
        totalCollectedGeneral: genSum,
        netSubtotal: (totals.efectivo || 0) + (totals.debito || 0) + (totals.credito || 0) + (totals.transferencia || 0) - (expensesTotal || 0),
        isSent: true // Lo marcamos como enviado para que este testeado todo el flujo
      });
    }
  }

  console.log("✅ ¡Simulación e inyección de datos finalizada con éxito extreme!");
  process.exit();
};

RUN_DB().catch(console.error);
