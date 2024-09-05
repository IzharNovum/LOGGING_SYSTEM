import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { dbConnection } from "./Database/dbConnection.js";
import { Log } from "./Controller/logSchema.js";
import queReceiver from "./rabbitMQ/queReceiver.js";
import { errMiddleware } from "./error/error.js";
import setupWebSocket from "./Websck.js";
import rateLimit from "express-rate-limit";

//ENVIRON CONFIG...
dotenv.config({ path: "../config/config.env" });

const app = express();
app.use(bodyParser.json());

const logRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 MINUTES...
  max: 100, // LIMIT PER EACH IP WITHIN 2 MINUTES...
  message: "Too many requests from this IP, please try again later",
});

//RECEIVING THE LOG DATA FROM SERVICES....
app.post("/log", logRateLimiter, async (req, res) => {
  const {
    ExchangeService,
    timestamp,
    Category,
    level,
    userName,
    endPoint,
    message,
  } = req.body;

  if (
    !ExchangeService ||
    !timestamp ||
    !Category ||
    !level ||
    !userName ||
    !endPoint ||
    !message
  ) {
    console.error("Invalid log data:", req.body);
    return res.status(400).send("Invalid log data");
  }

  const logMessage = {
    ExchangeService,
    timestamp,
    Category,
    level,
    userName,
    endPoint,
    message,
  };

  console.log("Just checking the response:", logMessage);

  // LOGS SENDING TO RABBITMQ...
  queReceiver(logMessage);

  // LOGS STORING IN MONGO-DB...
  try {
    await dbConnection();
    await Log.create(logMessage);
    console.log("Log successfully inserted to database");
    res.status(200).send("Log received and processed");
  } catch (err) {
    console.error("Failed to save log to database:", err);
    res.status(500).send("Failed to process log for database");
  }
});

//WEBSOCKET CONNECTION....
setupWebSocket();

//ERROR HANDLER....
app.use(errMiddleware);

export default app;
