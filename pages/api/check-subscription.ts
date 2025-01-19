import { NextApiRequest, NextApiResponse } from 'next';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API request received:', {
    method: req.method,
    body: req.body,
    token: BOT_TOKEN ? 'Present' : 'Missing',
    channelId: CHANNEL_ID
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, turnstileToken } = req.body;

  if (!userId) {
    console.log('No user ID provided');
    return res.status(400).json({ message: 'User ID is required' });
  }

  // Перевіряємо Turnstile токен, якщо він є
  if (turnstileToken) {
    console.log('Verifying Turnstile token...');
    try {
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      });

      const turnstileData = await turnstileResponse.json();
      console.log('Turnstile verification response:', turnstileData);

      if (!turnstileData.success) {
        return res.status(400).json({ message: 'Invalid captcha' });
      }
    } catch (error) {
      console.error('Turnstile verification error:', error);
      return res.status(500).json({ message: 'Captcha verification failed' });
    }
  }

  try {
    console.log('Checking Telegram subscription...');
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`
    );

    const data = await response.json();
    console.log('Telegram API response:', data);

    const isSubscribed = data.ok && ['creator', 'administrator', 'member'].includes(data.result.status);
    console.log('Is user subscribed:', isSubscribed);

    return res.status(200).json({ isSubscribed });
  } catch (error) {
    console.error('Telegram API error:', error);
    return res.status(500).json({ message: 'Failed to check subscription' });
  }
}
