import { NextApiRequest, NextApiResponse } from 'next';
import { updateRaffle, deleteRaffle } from '../../../../lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для перевірки JWT токена
const verifyToken = (req: NextApiRequest): boolean => {
  try {
    const token = req.cookies.admin_token;
    if (!token) return false;
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Перевірка автентифікації
  if (!verifyToken(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;
  const raffleId = parseInt(id as string);

  if (isNaN(raffleId)) {
    return res.status(400).json({ message: 'Invalid raffle ID' });
  }

  if (req.method === 'PUT') {
    try {
      await updateRaffle(raffleId, req.body);
      res.status(200).json({ message: 'Raffle updated successfully' });
    } catch (error) {
      console.error('Error updating raffle:', error);
      res.status(500).json({ message: 'Failed to update raffle' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteRaffle(raffleId);
      res.status(200).json({ message: 'Raffle deleted successfully' });
    } catch (error) {
      console.error('Error deleting raffle:', error);
      res.status(500).json({ message: 'Failed to delete raffle' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
