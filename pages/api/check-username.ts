import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, userId } = req.body;
  console.log('Checking username:', username);
  console.log('Checking userId:', userId);

  if (!username && !userId) {
    return res.status(400).json({ message: 'Username or userId is required' });
  }

  try {
    let participant;
    if (userId) {
      participant = db.prepare('SELECT * FROM participants WHERE telegram_id = ?').get(userId);
    } else {
      participant = db.prepare('SELECT * FROM participants WHERE username = ?').get(username);
    }
    console.log('Found participant:', participant);
    
    return res.status(200).json({ 
      hasParticipated: !!participant,
      participant
    });
  } catch (error) {
    console.error('Error checking participation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
