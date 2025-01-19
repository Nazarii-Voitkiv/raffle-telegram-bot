import { NextApiRequest, NextApiResponse } from 'next';
import { getAllParticipants } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const participants = getAllParticipants();
    return res.status(200).json(participants);
  } catch (error) {
    console.error('Error getting participants:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
