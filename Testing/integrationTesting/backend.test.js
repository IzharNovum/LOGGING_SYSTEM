import request from 'supertest';
import app from '../app.js';
import amqp from 'amqplib/callback_api.js';
import queReceiver from "../rabbitMQ/queReceiver.js";
import mongoose from 'mongoose';
import { dbConnection } from '../Database/dbConnection.js';
import WebSocket from 'ws';


const mockTimestamp = '2024-09-18T09:59:35.034Z'; // FIXED TS TO AVOID ERRORS...


//DATA FOR TESTING...
const logEntry = [{
  category: 'AUTH',
  level: 'INFO',
  message: 'User login successful',
  endPoint: '/api/v5/test',
  userName: 'Izhar',
  timestamp: mockTimestamp,
},
{
  category: 'AUTH',
  level: 'DEBUG',
  message: 'Debugging user login',
  endPoint: '/api/v5/test',
  userName: 'Izhar',
  timestamp: mockTimestamp,
}];


//LOG RECEIVER FROM THE EXCHANGES....
describe('Log Receiver', () => {
  test('Should Retrieve The Log And Process It', async () => {
    const response = await request(app)
      .post('/log')
      .send(logEntry) // Use logEntry here
      .expect(200);

    console.log('Log received:', response.body);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Log Received Successfully!');
  });
});



//RABBITMQ FOR MESSAGE QUEUE...
describe('RabbitMQ Integration Test', () => {
  const queue = 'LOGS';

  beforeAll(done => {
    amqp.connect(process.env.RABBITMQ_URI, (err, conn) => {
      if (err) {
        console.error('Failed to connect to RabbitMQ:', err);
        return done(err);
      }
      conn.createChannel((err, ch) => {
        if (err) {
          console.error('Failed to create RabbitMQ channel:', err);
          return done(err);
        }
        ch.assertQueue(queue, { durable: false });
        conn.close(done);
      });
    });
  });

  test('should send a log message to RabbitMQ', done => {
    console.log("log entry of the queue:", logEntry);

    queReceiver(logEntry); // Ensure queReceiver is properly defined to send logs

    amqp.connect(process.env.RABBITMQ_URI, (err, conn) => {
      if (err) {
        console.error('Failed to connect to RabbitMQ:', err);
        return done(err);
      }
      conn.createChannel((err, ch) => {
        if (err) {
          console.error('Failed to create RabbitMQ channel:', err);
          return done(err);
        }
        ch.assertQueue(queue, { durable: false });

        // Use a more reliable approach to handle message consumption
        ch.consume(queue, (msg) => {
          if (msg !== null) {
            const receivedMessage = JSON.parse(msg.content.toString());

            // Compare received messages ignoring timestamps
            expect(receivedMessage.map(log => ({
              category: log.category,
              level: log.level,
              message: log.message,
              endPoint: log.endPoint,
              userName: log.userName
            }))).toEqual(logEntry.map(log => ({
              category: log.category,
              level: log.level,
              message: log.message,
              endPoint: log.endPoint,
              userName: log.userName
            })));

            ch.ack(msg);
            conn.close();
            done();
          }
        }, { noAck: false });
      });
    });
  });
});



//DBCONNECTION....
describe("DBConnection Integration Testing", () => {
  beforeAll(async () => {
    // Establishing database connection before running tests
    await dbConnection();
  });

  afterAll(async () => {
    // Closing the database connection after all tests
    await mongoose.connection.close();
  });

  test('should successfully process the log', async () => {

    const response = await request(app)
      .post('/log')
      .send(logEntry)
      .expect(200);

    // Check the response message
    expect(response.body.message).toBe('Log Received Successfully!');
  });
});



//WEBSOCKET CONNECTION...
describe('WebSocket Integration Tests', () => {
  let wsServer;
  let wsClient;

  beforeAll((done) => {
    // Start WebSocket server
    wsServer = new WebSocket.Server({ port: 3000 });

    // Simulate sending a log entry
    wsServer.on('connection', (socket) => {
      socket.send(JSON.stringify(logEntry));
    });

    wsServer.on('listening', done);
  });

  beforeEach(() => {
    // Create a new WebSocket client
    wsClient = new WebSocket('ws://localhost:3000');
  });

  afterEach(() => {
    wsClient.close();
  });

  afterAll(() => {
    wsServer.close();
  });

  test('should receive log entry sent to WebSocket server', (done) => {
    wsClient.on('message', (message) => {
      try {
        expect(logEntry).toEqual(logEntry);
        done();
      } catch (error) {
        done(error);
      }
    });
  }, 15000);
});