import { NextApiRequest, NextApiResponse } from 'next';
import { checkAndSelectWinners } from '../../../lib/db';
import { notifyWinners } from '../../../lib/telegram';

// Секретний ключ для захисту cron endpoint
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Перевіряємо метод
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Перевіряємо секретний ключ
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader);
  console.log('Expected:', `Bearer ${CRON_SECRET}`);
  
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ 
      message: 'Unauthorized',
      error: 'Invalid or missing authorization header'
    });
  }

  try {
    console.log('Starting automatic raffle check...');
    
    // Перевіряємо завершені розіграші і вибираємо переможців
    const result = await checkAndSelectWinners();
    
    if (!result) {
      console.log('No raffles to process');
      return res.status(200).json({ message: 'No raffles to process' });
    }

    const { raffle, winners } = result;
    
    // Відправляємо повідомлення переможцям
    try {
      await notifyWinners(raffle, winners);
      console.log('Winners notified successfully');
    } catch (error) {
      console.error('Error notifying winners:', error);
    }

    res.status(200).json({ 
      message: 'Winners selected and notified',
      raffle: raffle.id,
      winnersCount: winners.length
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
