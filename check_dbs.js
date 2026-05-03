const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

async function run() {
    const uri = 'mongodb://127.0.0.1:27017/dental_clinic'; // wait, MONGODB_URI=mongodb://127.0.0.1:27017/dentalclinic check .env
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('test'); // Check what db it actually connects to
    
    const dbs = await client.db().admin().listDatabases();
    console.log("Databases:", dbs.databases.map(db => db.name));
    
    // The actual db name is dentalclinic?
    const myDb = client.db('test'); 
    
    process.exit(0);
}
run();
