import { NextRequest, NextResponse } from 'next/server';
import { getRaffle, getParticipantCount, isParticipating } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Debug - Request params:', params);
  console.log('Debug - URL:', request.url);
  
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  
  console.log('Debug - Query params:', { id: params.id, userId });

  if (!params.id) {
    return NextResponse.json(
      { 
        message: 'Invalid raffle ID',
        debug: { id: params.id, type: typeof params.id }
      },
      { status: 400 }
    );
  }

  const raffleId = parseInt(params.id);
  console.log('Debug - Parsed raffle ID:', { raffleId, type: typeof raffleId });

  const raffle = await getRaffle(raffleId);
  console.log('Debug - Found raffle:', raffle);

  if (!raffle) {
    return NextResponse.json(
      { 
        message: 'Raffle not found',
        debug: { 
          requestedId: params.id,
          parsedId: raffleId,
          type: typeof raffleId
        }
      },
      { status: 404 }
    );
  }

  const participantCount = await getParticipantCount(raffleId);
  const userParticipating = userId ? await isParticipating(raffleId, parseInt(userId)) : false;

  return NextResponse.json({
    raffle,
    participantCount,
    isParticipating: userParticipating
  });
}
