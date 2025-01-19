import { createAdmin } from '../lib/db';
import bcrypt from 'bcrypt';

async function createDefaultAdmin() {
  const username = 'admin';
  const password = 'admin123'; // You should change this password after first login
  
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const success = createAdmin(username, passwordHash);
    
    if (success) {
      console.log('Default admin created successfully');
      console.log('Username:', username);
      console.log('Password:', password);
      console.log('Please change the password after first login');
    } else {
      console.log('Failed to create default admin');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

createDefaultAdmin();
