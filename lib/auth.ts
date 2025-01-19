import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AdminUser {
  id: number;
  username: string;
}

export async function verifyToken(token: string): Promise<AdminUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminUser;
    return decoded;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function generateToken(user: AdminUser): Promise<string> {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}
