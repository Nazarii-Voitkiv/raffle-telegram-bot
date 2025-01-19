import cron from 'node-cron';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Завантажуємо змінні середовища
dotenv.config({ path: '.env.local' });

const WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('CRON_SECRET is not set in environment variables');
  process.exit(1);
}

console.log('Starting raffle check cron job...');
console.log('WEBAPP_URL:', WEBAPP_URL);
console.log('Authorization header will be:', `Bearer ${CRON_SECRET}`);

// Перевіряємо кожну хвилину
cron.schedule('* * * * *', async () => {
  try {
    console.log('Running raffle check at:', new Date().toISOString());
    
    const response = await axios.post(
      `${WEBAPP_URL}/api/cron/check-raffles`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Raffle check result:', response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Error in cron job:', error);
    }
  }
});

// Запобігаємо завершенню процесу
process.on('SIGINT', () => {
  console.log('Stopping cron job...');
  process.exit();
});
