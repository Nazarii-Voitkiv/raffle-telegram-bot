import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const WEBAPP_URL = process.env.WEBAPP_URL || '';
export const CHANNEL_ID = process.env.CHANNEL_ID || '';