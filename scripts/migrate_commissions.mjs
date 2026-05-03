import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_system';


async function migrateSales() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const salesCol = db.collection('sales');

  const sales = await salesCol.find({}).toArray();
  console.log(`Encontradas ${sales.length} ventas para revisar.`);

  let migratedCount = 0;

  for (const sale of sales) {
    let needsUpdate = false;
    let updateDoc = { $set: {} };

    // Si le faltan los campos base, los agregamos
    if (!sale.commissionReleases) {
      updateDoc.$set.commissionReleases = [];
      needsUpdate = true;
    }
    if (sale.commissionReleasedTotal === undefined) {
      updateDoc.$set.commissionReleasedTotal = 0;
      needsUpdate = true;
    }

    // Si ya está finalizado y no tiene releases, creamos un release histórico
    if (sale.isTreatmentInProgress === false && sale.commissionReleaseDate && (!sale.commissionReleases || sale.commissionReleases.length === 0)) {
      const clinicTotal = (sale.totalToCollect || 0) - (sale.discountTotal || 0);
      
      updateDoc.$set.commissionReleases = [{
        date: sale.commissionReleaseDate,
        amount: clinicTotal
      }];
      updateDoc.$set.commissionReleasedTotal = clinicTotal;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await salesCol.updateOne({ _id: sale._id }, updateDoc);
      migratedCount++;
    }
  }

  console.log(`Migración completada: ${migratedCount} ventas actualizadas con el nuevo esquema de liberaciones.`);
  await mongoose.disconnect();
}

migrateSales().catch(console.error);
