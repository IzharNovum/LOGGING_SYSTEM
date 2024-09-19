import mongoose from 'mongoose';


export const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'NovumLogs',
    });
    console.log('Database Connected Successfully!');
  } catch (err) {
    console.error(`Error Occurred While Connecting To Database: ${err}`);
    throw err;
  }
};
