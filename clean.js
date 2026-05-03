const dbConnect = require('./lib/mongodb').default;
const ApiConnection = require('./models/ApiConnection').default;

async function check() {
  await dbConnect();
  const res = await ApiConnection.deleteMany({ systemKey: { $regex: '^CUSTOM_' } });
  console.log('Deleted:', res.deletedCount);
}
check().catch(console.error).finally(()=>process.exit());
