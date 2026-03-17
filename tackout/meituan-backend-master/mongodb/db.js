import mongoose from 'mongoose';
import config from '../config'

mongoose.set('strictQuery', false);
mongoose.connect(config.DB_URL);

const db = mongoose.connection;

db.once('open', () => {
    console.log('Connecting to the database Successfully')
})

db.on('error', function (error) {
    console.error('Error in MongoDb connection: ' + error);
});

db.on('close', function () {
    console.log('The database is disconnected and try to reconnect the database');
    mongoose.connect(config.DB_URL);
});

export default db;
