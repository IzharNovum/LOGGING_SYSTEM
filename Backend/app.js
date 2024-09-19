import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { dbConnection } from './Database/dbConnection.js';
import { Log } from './Controller/logSchema.js';
import queReceiver from './rabbitMQ/queReceiver.js';
import { errMiddleware } from './error/error.js';
import setupWebSocket from './Websck.js';
import rateLimit from 'express-rate-limit';

//ENVIRON CONFIG...
dotenv.config({ path: "../config/config.env" });

const app = express();
app.use(bodyParser.json());

const logRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 MINUTES...
  max: 100, // LIMIT PER EACH IP WITHIN 2 MINUTES...
  message: 'Too many requests from this IP, please try again later'
});

//RECEIVING THE LOG DATA FROM SERVICES....
app.post('/log', logRateLimiter, async (req, res) => {
  const { timestamp, category, level, userName, endPoint, message } = req.body;
  
  const logMessage = {
    timestamp,
    category,
    level,
    userName,
    endPoint,
    message
  };

  console.log("Just checking the response:", logMessage);

  // LOGS SENDING TO RABBITMQ...
  queReceiver(logMessage);

  // LOGS STORING IN MONGO-DB...
  try {
    await dbConnection();
    await Log.create(logMessage);
    console.log('Log successfully inserted to database');
    res.status(200).send('Log received and processed');
  } catch (err) {
    console.log('Failed to save log to database:', err);
    const errorLogMessage = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Error Occurred While Connecting To Database: ${err.message}`,
      details: err.stack
    };
    await queReceiver(errorLogMessage);
    res.status(500).send('Failed to process log for database');
  }
});

//WEBSOCKET CONNECTION....
setupWebSocket();


//ERROR HANDLER....
app.use(errMiddleware);

export default app;
