import WebSocket from 'ws';


//WEBSOCKET CONNECTION TO RECEIVE THE DATA...
describe('WebSocket Integration Tests', () => {
  let wsServer;
  let wsClient;


  //DATA FOR TESTING...
  const logEntry = JSON.stringify({
    category: "AUTH",
    endPoint: "/api/v5/test",
    level: "INFO",
    message: "User login successful",
    timestamp: new Date().toISOString(),
    userName: "Izhar"
  });

  beforeAll((done) => {
    // Start WebSocket server
    wsServer = new WebSocket.Server({ port: 3000 });

    wsServer.on('connection', (socket) => {
      // Send a log entry when a client connects
      socket.send(logEntry);
    });

    // Wait for the server to start
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

  test('should receive the log entry sent to WebSocket server', (done) => {
    wsClient.on('open', () => {
    });

    wsClient.on('message', (message) => {
      try {
        const receivedMessage = message instanceof Buffer ? message.toString() : message;
        // Parsing the received message as JSON
        const parsedMessage = JSON.parse(receivedMessage);

        // Assert that the received message matches the log entry
        expect(parsedMessage).toEqual(JSON.parse(logEntry));
        done();
      } catch (error) {
        done(error);
      }
    });
  }, 10000);
});



//UNIT TEST OF FILTERING AGGREGATED LOGS....
const parseDate = (dateString) => {
  return new Date(dateString.replace(' ', 'T') + 'Z');
};

const filterMessages = (messages, searchQuery, sortLevel, sortCategory, startTime, endTime) => {
  return messages.filter((msg) => {
    // Normalize formattedLog for searchQuery...
    const matchesSearchQuery = msg.formattedLog.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Compare log level...
    const logLevelMatch = msg.formattedLog.match(/\[([A-Z]+)\]/); // Extracting log level from the format...
    const logLevel = logLevelMatch ? logLevelMatch[1].toLowerCase() : '';
    const matchesSortLevel = sortLevel ? logLevel === sortLevel.toLowerCase() : true;
    
    // Compare category
    const matchesSortCategory = sortCategory ? (msg.category || "").toLowerCase() === sortCategory.toLowerCase() : true;
    
    // Convert timestamps to Date objects for comparison....
    const msgTimestamp = parseDate(msg.timestamp);
    const startIso = startTime ? parseDate(startTime) : null;
    const endIso = endTime ? parseDate(endTime) : null;
    const matchesTimeRange = (!startIso && !endIso) || (msgTimestamp >= startIso && msgTimestamp <= endIso);
    
    return matchesSearchQuery && matchesSortLevel && matchesSortCategory && matchesTimeRange;
  });
};

// Test cases
describe('filterMessages', () => {
  const messages = [
    { formattedLog: '[2024-09-12 10:22:00] -- [ERROR] -- PAYMENT -- Izhar-Pasha -- /v1/order/history ==> Operation Failed!', level: 'error', category: 'PAYMENT', timestamp: '2024-09-12 10:22:00' },
    { formattedLog: '[2024-09-13 10:11:00] -- [INFO] -- EXCHANGE -- Izhar-Pasha -- /v1/order/history ==> Operation Successful!', level: 'info', category: 'EXCHANGE', timestamp: '2024-09-13 10:11:00' },
    { formattedLog: '[2024-09-14 10:03:00] -- [WARNING] -- AUTH -- Izhar-Pasha -- /v1/order/history ==> Network Issue!', level: 'warning', category: 'AUTH', timestamp: '2024-09-14 10:03:00' },
  ];

  //test for search-bar
  test('should filter by search query', () => {
    const result = filterMessages(messages, 'successful', '', '', '', '');
    expect(result).toEqual([messages[1]]);
    console.log("output of the test for search bar:", result);
  });

  //test for filtering log level...
  test('should filter by log level', () => {
    const result = filterMessages(messages, '', 'error', '', '', '');
    console.log("Category...:", result) //used connsole.log to check and monitor the test result....
    expect(result).toEqual([messages[0]]);
    console.log("output of the test for log level:", result);
  });

  //test for filterinng for category....
  test('should filter by category', () => {
    const result = filterMessages(messages, '', '', 'EXCHANGE', '', '');
    expect(result).toEqual([messages[1]]);
    console.log("output of the test for log Cat:", result);
  });

  //test for filtering for time-range....
  test('should filter by time range', () => {
    const result = filterMessages(messages, '', '', '', '2024-09-12 00:00:00', '2024-09-13 23:59:59');
    expect(result).toEqual([messages[0], messages[1]]);
    console.log("output of the test for timestamp:", result);

  });
});


