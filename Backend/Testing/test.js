import  request  from 'supertest';
import queReceiver from '../rabbitMQ/queReceiver.js';
import { Log } from '../Controller/logSchema.js';
import { dbConnection } from '../Database/dbConnection.js';
import app from "../app.js";


jest.mock('../Database/dbConnection.js');
jest.mock('../Controller/logSchema.js');
jest.mock('../rabbitMQ/queReceiver.js');

describe('POST /log', () => {
  test('should successfully process the log and store it in the database', async () => {
    const logMessage = {
      timestamp: new Date().toISOString(),
      category: 'test',
      level: 'info',
      userName: 'testUser',
      endPoint: '/test-endpoint',
      message: 'Test message'
    };

    // Mock success for dbConnection, Log.create, and queReceiver
    dbConnection.mockResolvedValueOnce();
    Log.create.mockResolvedValueOnce();
    queReceiver.mockResolvedValueOnce();

    const response = await request(app)
      .post('/log')
      .send(logMessage)
      .expect(200);

    expect(response.text).toBe('Log received and processed');

    // Validate that the correct methods were called
    expect(dbConnection).toHaveBeenCalled();
    expect(Log.create).toHaveBeenCalledWith(logMessage);
    expect(queReceiver).toHaveBeenCalledWith(logMessage);
  });


  
  test('should handle database errors and send an error log to RabbitMQ', async () => {
    const logMessage = {
      timestamp: new Date().toISOString(),
      category: 'test',
      level: 'info',
      userName: 'testUser',
      endPoint: '/test-endpoint',
      message: 'Test message'
    };

    const error = new Error('Database connection failed');
    dbConnection.mockRejectedValueOnce(error);
    queReceiver.mockResolvedValueOnce();

    const response = await request(app)
      .post('/log')
      .send(logMessage)
      .expect(500);

    expect(response.text).toBe('Failed to process log for database');

    // Validate that the error was logged and sent to RabbitMQ
    expect(queReceiver).toHaveBeenCalledWith(expect.objectContaining({
      level: 'error',
      message: expect.stringContaining('Error Occurred While Connecting To Database')
    }));
  });

  afterAll(() => {
    jest.clearAllMocks(); // Clear any mocks created during testing
  });
});
