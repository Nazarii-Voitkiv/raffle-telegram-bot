import { NextApiRequest, NextApiResponse } from 'next';
import { getParticipant } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const participant = getParticipant(userId);
    return res.status(200).json({ 
      hasParticipated: !!participant
    });
  } catch (error) {
    console.error('Error checking participation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
