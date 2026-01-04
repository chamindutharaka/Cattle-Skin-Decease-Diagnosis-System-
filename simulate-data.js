// backend/simulate-data.js
const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3002/api/data';
const JWT_AUTH_URL = 'http://localhost:3002/api/auth/login';

// Use the correct user from the seed script
const USERNAME = 'testuser'; 
const PASSWORD = 'password';

// Device IDs from the seed script
const DEVICE_IDS = ['esp32-001', 'esp32-002', 'esp32-003', 'esp32-004']; // Added esp32-004 for new cow testing

let token = null;

const anomalyCounters = {};
DEVICE_IDS.forEach(id => anomalyCounters[id] = 0);

const login = async () => {
  try {
    const response = await axios.post(JWT_AUTH_URL, {
      username: USERNAME,
      password: PASSWORD,
    });
    token = response.data.token;
    console.log('Logged in successfully. Token obtained.');
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    token = null;
  }
};

const sendSensorData = async (deviceId, isAnomaly = false) => {
  if (!token) {
    // Attempt to re-login if token is null
    await login();
    if (!token) {
      console.error('Could not obtain token after re-login attempt. Exiting data send.');
      return;
    }
  }

  let temperature;
  let humidity;

  if (isAnomaly) {
    // Alternate between high temp and low humidity anomalies
    if (anomalyCounters[deviceId] % 2 === 0) { // Even count, high temp anomaly
      temperature = (45.0 + Math.random() * 5.0).toFixed(2); // e.g., 45-50 C
      humidity = (60 + Math.random() * 10).toFixed(2); // normal humidity
    } else { // Odd count, low humidity anomaly
      temperature = (37.0 + Math.random() * 2.0).toFixed(2); // normal temp
      humidity = (10 + Math.random() * 10).toFixed(2); // e.g., 10-20% humidity
    }
    // Only increment anomaly counter if an anomaly was actually generated
    anomalyCounters[deviceId]++; 
  } else {
    // Normal data
    temperature = (37.0 + Math.random() * 5.0).toFixed(2); // 37-42 C
    humidity = (60 + Math.random() * 20).toFixed(2);    // 60-80%
  }

  try {
    const response = await axios.post(API_URL, {
      deviceId: deviceId,
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(`Data sent for ${deviceId}: Temp=${temperature}°C, Hum=${humidity}%. Anomaly: ${isAnomaly}. Status: ${response.status}`);
  } catch (error) {
    if (error.response && error.response.status === 401) {
        console.warn('Token expired or invalid during simulation. Attempting to re-login...');
        token = null; // Clear token to trigger re-login on next attempt
    } else {
        console.error(`Failed to send data for ${deviceId}:`, error.response ? error.response.data : error.message);
    }
  }
};

const runSimulation = async () => {
  await login();
  if (!token) {
    return;
  }

  console.log('Starting continuous data simulation for all devices. Anomalies will be injected periodically.');

  let readingCounter = 0; // Global counter for triggering anomalies across all devices

  setInterval(async () => {
    for (const deviceId of DEVICE_IDS) {
      const isAnomalyRound = readingCounter % 5 === 0; // Every 5th *global* interval, one device gets an anomaly
      await sendSensorData(deviceId, isAnomalyRound);
    }
    readingCounter++;
  }, 3000); // Send data for all devices every 3 seconds
};

runSimulation();