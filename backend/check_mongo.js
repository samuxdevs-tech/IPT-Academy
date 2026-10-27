require('dotenv').config({ path: 'D:\\\\My Apps\\\\Datagan Course\\\\backend\\\\.env' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  for (let c of collections) {
    const docs = await db.collection(c.name).find().toArray();
    let str = JSON.stringify(docs);
    if (str.includes('\ufffd')) {
      console.log('FOUND IN COLLECTION:', c.name);
      let idx = str.indexOf('\ufffd');
      console.log('Context:', str.substring(idx - 30, idx + 30));
    }
  }
  process.exit(0);
}
run().catch(console.error);
