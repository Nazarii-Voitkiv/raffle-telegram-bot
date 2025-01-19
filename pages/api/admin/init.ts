import { NextApiRequest, NextApiResponse } from 'next';
import { initializeAdmin } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { ADMIN_INIT_SECRET } = process.env;
  const { secret, username, password } = req.body;

  if (!ADMIN_INIT_SECRET || secret !== ADMIN_INIT_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const success = await initializeAdmin(username, password);
    if (success) {
      res.status(200).json({ message: 'Admin account created successfully' });
    } else {
      res.status(400).json({ message: 'Admin account already exists' });
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
