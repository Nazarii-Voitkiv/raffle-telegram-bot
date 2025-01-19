import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { getDb } from '../../../lib/db';
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
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const db = await getDb();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.run(
      'UPDATE admins SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
