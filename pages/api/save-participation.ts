import { NextApiRequest, NextApiResponse } from 'next';
import { addParticipant, getParticipant } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, username, firstName, lastName } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // Перевіряємо, чи користувач вже брав участь
    const existingParticipant = getParticipant(userId);
    if (existingParticipant) {
      return res.status(200).json({ 
        message: 'Already participated',
        participant: existingParticipant
      });
    }

    // Зберігаємо нового учасника
    const success = addParticipant({
      telegram_id: userId,
      username,
      first_name: firstName,
      last_name: lastName,
      ip_address: Array.isArray(ip) ? ip[0] : ip
    });

    if (success) {
      return res.status(200).json({ message: 'Participation saved successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to save participation' });
    }
  } catch (error) {
    console.error('Error saving participation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
