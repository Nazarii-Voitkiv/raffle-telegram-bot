import { NextApiRequest, NextApiResponse } from 'next';
import { getAdmin } from '../../../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await getAdmin(username);
    console.log('Found admin:', admin ? 'yes' : 'no');
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    
    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
