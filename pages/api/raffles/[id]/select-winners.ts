import { NextApiRequest, NextApiResponse } from 'next';
import { selectWinners, getRaffleWinners, getRaffle } from '@/lib/db';
import { verifyToken } from '../../../../lib/auth';
import { notifyWinners } from '../../../../lib/telegram';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Перевіряємо авторизацію адміна через cookie
    const token = req.cookies.admin_token;
    if (!token) {
      console.log('No token in cookies');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded) {
        console.log('Invalid token');
        return res.status(401).json({ message: 'Unauthorized' });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const raffleId = parseInt(req.query.id as string);
    console.log('Selecting winners for raffle:', raffleId);
    
    try {
      // Отримуємо інформацію про розіграш
      const raffle = await getRaffle(raffleId);
      if (!raffle) {
        throw new Error('Raffle not found');
      }

      // Вибираємо переможців (це також збереже їх у базу)
      await selectWinners(raffleId);
      console.log('Winners selected and saved to database');
      
      // Отримуємо інформацію про переможців
      const winners = await getRaffleWinners(raffleId);
      console.log('Retrieved winners from database:', winners);
      
      if (!winners || winners.length === 0) {
        throw new Error('No winners were selected');
      }

      // Відправляємо повідомлення в Telegram (канал і переможцям)
      try {
        await notifyWinners(raffle, winners);
        console.log('All notifications sent successfully');
      } catch (error) {
        console.error('Failed to send notifications:', error);
        // Не викидаємо помилку, щоб не переривати процес
      }
      
      res.status(200).json({ winners });
    } catch (error) {
      console.error('Error in winner selection process:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to select winners' 
      });
    }
  } catch (error) {
    console.error('Error in request handler:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
