import amqp from 'amqplib/callback_api.js';



var queReceiver = (logMessage) => {
  //CONNECTION...
    amqp.connect(process.env.RABBITMQ_URI, (err, conn) => {
        if (err) {
          console.error('Failed to connect to RabbitMQ:', err);
          return res.status(500).send('Failed to process log for RabbitMQ');
        }
    
        //CHANNEL CREATION...
        conn.createChannel((err, ch) => {
          if (err) {
            console.error('Failed to create RabbitMQ channel:', err);
            return res.status(500).send('Failed to process log for RabbitMQ');
          }
    
          const queue = "LOGS";
          ch.assertQueue(queue, { durable: false }); //CHECKS THE QUEUE EXISTENCE AND WON'T SURVIVE BROKER RESTART...
          ch.sendToQueue(queue, Buffer.from(JSON.stringify(logMessage))); //INSERTS THE LOGS IN QUEUE...
          console.log("Log sent successfully to RabbitMQ:", logMessage);
    
          // CLOSE THE RABBITMQ CONNECTION AFTER SENDIG THE LOGS...
          setTimeout(() => {
            conn.close();
          }, 10000);
        });
      });
}

export default queReceiver;
