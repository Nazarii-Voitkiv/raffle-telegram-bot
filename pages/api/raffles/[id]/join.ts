import { NextApiRequest, NextApiResponse } from 'next';
import { addParticipant, getRaffle, getParticipantCount, isParticipating, isIPParticipating } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const raffleId = parseInt(req.query.id as string);
    const { telegram_id, username, first_name, last_name, turnstileToken } = req.body;
    
    console.log('Request body:', { telegram_id, username, first_name, last_name });
    console.log('Turnstile token:', turnstileToken ? 'present' : 'missing');

    if (!telegram_id || !turnstileToken) {
      console.log('Missing fields:', { telegram_id: !telegram_id, turnstileToken: !turnstileToken });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get user's IP address
    const ip_address = Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for'] || 
        req.socket.remoteAddress || 
        'unknown';

    // Check if IP is already participating
    const ipParticipating = await isIPParticipating(raffleId, ip_address);
    if (ipParticipating) {
      return res.status(400).json({ 
        message: 'С этого IP адреса уже есть участник в розыгрыше' 
      });
    }

    // Verify Turnstile token
    console.log('Verifying Turnstile token...');
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }),
    });

    const turnstileData = await turnstileResponse.json();
    console.log('Turnstile response:', turnstileData);
    
    if (!turnstileData.success) {
      return res.status(400).json({ message: 'Invalid captcha' });
    }

    // Get raffle details
    console.log('Getting raffle details for ID:', raffleId);
    const raffle = await getRaffle(raffleId);
    console.log('Raffle details:', raffle);
    
    if (!raffle) {
      return res.status(404).json({ message: 'Raffle not found' });
    }

    // Check if raffle has ended
    const now = new Date();
    const endDate = new Date(raffle.end_date);
    console.log('Checking dates:', { now, endDate });
    
    if (endDate < now) {
      return res.status(400).json({ message: 'Raffle has ended' });
    }

    // Check if user is already participating
    console.log('Checking if user is participating:', { raffleId, telegram_id });
    const participating = await isParticipating(raffleId, telegram_id);
    console.log('User participating status:', participating);
    
    if (participating) {
      return res.status(400).json({ message: 'Already participating' });
    }

    // Check if raffle is full
    if (raffle.max_participants > 0) {
      const participantCount = await getParticipantCount(raffleId);
      console.log('Participant count:', { current: participantCount, max: raffle.max_participants });
      
      if (participantCount >= raffle.max_participants) {
        return res.status(400).json({ message: 'Raffle is full' });
      }
    }

    // Add participant
    console.log('Adding participant...');
    await addParticipant({
      raffle_id: raffleId,
      telegram_id,
      username,
      first_name,
      last_name,
      ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address
    });

    console.log('Successfully added participant');
    res.status(200).json({ message: 'Successfully joined raffle' });
  } catch (error) {
    console.error('Error joining raffle:', error);
    res.status(500).json({ message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
