const dbConnect = require('./lib/mongodb').default;
const ApiConnection = require('./models/ApiConnection').default;

async function check() {
  await dbConnect();
  const conns = await ApiConnection.find({});
  console.log(conns.map(c => ({ _id: c._id, provider: c.provider, systemKey: c.systemKey })));
}
check().catch(console.error);
