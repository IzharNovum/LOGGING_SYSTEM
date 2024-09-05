import amqp from 'amqplib/callback_api.js';
import { WebSocketServer } from "ws";

function setUpWebsocket() {
  let rabbitConn;

  // Connect to RabbitMQ
  amqp.connect(process.env.RABBITMQ_URI, (err, conn) => {
    if (err) {
      console.error('Failed to connect to RabbitMQ:', err);
      return;
    }
    rabbitConn = conn;
  });

  // Create WebSocket server on port 3002
  const wss = new WebSocketServer({ port: 3002 });

  wss.on('connection', (ws) => {
    console.log('WebSocket is connected!');

    rabbitConn.createChannel((err, ch) => {
      if (err) {
        console.error('Failed to create channel:', err);
        return;
      }

      const queue = 'LOGS';
      ch.assertQueue(queue, { durable: false });
      // console.log(`Waiting for messages in ${queue}. To exit press CTRL+C`);

      ch.consume(queue, (msg) => {
        if (msg !== null) {
          console.log('Received:', msg.content.toString());
          ws.send(msg.content.toString());
          ch.ack(msg);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed!');
        ch.close((err) => {
          if (err) {
            console.error('Failed to close channel:', err);
          }
        });
      });
    });
  });
}

export default setUpWebsocket;
