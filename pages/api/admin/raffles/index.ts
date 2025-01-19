import { NextApiRequest, NextApiResponse } from 'next';
import { createRaffle, getRaffles, getDb } from '../../../../lib/db';
import { sendTelegramMessage, formatRaffleAnnouncementMessage } from '../../../../lib/telegram';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для перевірки JWT токена
const verifyToken = async (req: NextApiRequest): Promise<boolean> => {
  try {
    const token = req.cookies.admin_token;
    if (!token) return false;
    await jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Перевірка автентифікації
  if (!(await verifyToken(req))) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const raffles = await getRaffles();
      res.status(200).json(raffles);
    } catch (error) {
      console.error('Error getting raffles:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('Creating raffle with data:', req.body);
      
      // Validate required fields
      const requiredFields = ['title', 'prize', 'prize_count', 'end_date'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }

      const raffleId = await createRaffle(req.body);
      console.log('Raffle created successfully with ID:', raffleId);
      
      // Verify the raffle was created
      const db = await getDb();
      const createdRaffle = await db.get('SELECT * FROM raffles WHERE id = ?', raffleId);
      console.log('Created raffle data:', createdRaffle);
      
      // Send notification to Telegram channel
      try {
        const { message, inlineKeyboard } = await formatRaffleAnnouncementMessage(createdRaffle);
        const messageId = await sendTelegramMessage(message, inlineKeyboard);
        
        // Update raffle with message ID
        await db.run(
          'UPDATE raffles SET announcement_message_id = ? WHERE id = ?',
          [messageId, raffleId]
        );
        
        console.log('Telegram notification sent successfully');
      } catch (error) {
        console.error('Failed to send Telegram notification:', error);
        // Don't throw error here to not affect the API response
      }
      
      res.status(201).json({ id: raffleId });
    } catch (error) {
      console.error('Error creating raffle:', error);
      res.status(500).json({ 
        message: 'Failed to create raffle', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
