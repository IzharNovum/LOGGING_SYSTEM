import express from 'express';
import bodyParser from 'body-parser';
import dotenv from "dotenv";

dotenv.config({path: "./config/config.env"});

const app = express();
app.use(bodyParser.json());

app.post('/log', (req, res) => {
    const logData = req.body;
  console.log('Log received:', logData);
  
  res.status(200).json({ message: 'Log Received Successfully!' });

});

export default app;
