'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Turnstile from '../../components/Turnstile';
import FormattedDate from '../../components/FormattedDate';

interface Raffle {
  id: number;
  title: string;
  description: string;
  prize: string;
  prize_count: number;
  max_participants: number;
  end_date: string;
}

interface TelegramWebApp {
  ready: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    setParams: (params: { text: string; color: string; is_active: boolean }) => void;
  };
  close: () => void;
  initDataUnsafe: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

export default function RafflePage() {
  const params = useParams();
  const raffleId = typeof params?.id === 'string' ? params.id : '';
  
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isParticipating, setIsParticipating] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadRaffleData = async (user: { id: number }) => {
      if (!mounted) return;
      
      try {
        const response = await fetch(`/api/raffles/${raffleId}?user_id=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to load raffle');
        }
        const data = await response.json();
        
        if (mounted) {
          setRaffle(data.raffle);
          setParticipantCount(data.participantCount);
          setIsParticipating(data.isParticipating);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading raffle:', err);
          setLoading(false);
        }
      }
    };

    const waitForWebApp = () => {
      const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (user?.id) {
        loadRaffleData(user);
      } else {
        timeoutId = setTimeout(waitForWebApp, 50);
      }
    };

    if (raffleId) {
      waitForWebApp();
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [raffleId]);

  useEffect(() => {
    if (!loading && !error && raffle) {
      if (isParticipating) {
        window.Telegram?.WebApp?.MainButton?.setParams({
          text: 'Ты уже участвуешь в этом розыгрыше',
          color: '#4CAF50',
          is_active: false
        });
        window.Telegram?.WebApp?.MainButton?.show();
      } else {
        window.Telegram?.WebApp?.MainButton?.setParams({
          text: isVerified ? 'Подтвердить участие' : 'Участвовать',
          color: '#2481cc',
          is_active: true
        });
        window.Telegram?.WebApp?.MainButton?.show();
        window.Telegram?.WebApp?.MainButton?.onClick(handleParticipate);
      }
    } else {
      window.Telegram?.WebApp?.MainButton?.hide();
    }

    return () => {
      window.Telegram?.WebApp?.MainButton?.hide();
    };
  }, [raffle, loading, error, isParticipating, isVerified]);

  const handleParticipate = async () => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    console.log('User data:', user);
    
    if (!user?.id || !raffle) {
      console.error('Missing user data or raffle:', { userId: user?.id, raffleId: raffle?.id });
      return;
    }

    if (isVerified && captchaToken) {
      try {
        console.log('Sending join request...', {
          raffleId: raffle.id,
          userId: user.id,
          captchaToken
        });
        
        const response = await fetch(`/api/raffles/${raffle.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            telegram_id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            turnstileToken: captchaToken
          })
        });

        const data = await response.json();
        console.log('Join response:', data);

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to join raffle');
        }

        setIsParticipating(true);
        setParticipantCount(prev => prev + 1);
        window.Telegram?.WebApp?.MainButton?.setParams({
          text: 'Ты уже участвуешь в этом розыгрыше',
          color: '#4CAF50',
          is_active: false
        });
      } catch (err) {
        console.error('Error joining raffle:', err);
        const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при регистрации участия';
        alert(errorMessage + '. Пожалуйста, попробуйте еще раз.');
      }
      return;
    }

    try {
      console.log('Checking subscription...');
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();
      console.log('Subscription check response:', data);
      
      setIsSubscribed(data.isSubscribed);

      if (!data.isSubscribed) {
        setShowCaptcha(false);
      } else if (!showCaptcha && !isVerified) {
        setShowCaptcha(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      alert('Произошла ошибка при проверке подписки. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    setIsVerified(true);
    setCaptchaToken(token);
    setShowCaptcha(false);
    window.Telegram?.WebApp?.MainButton?.setText('Подтвердить участие');
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: 'rgb(25, 33, 42)' }}>
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !raffle) {
    return null;
  }

  const isEnded = new Date(raffle.end_date) < new Date();
  const isFull = raffle.max_participants > 0 && participantCount >= raffle.max_participants;

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'rgb(25, 33, 42)' }}>
      <div className="max-w-md mx-auto rounded-xl shadow-md overflow-hidden md:max-w-2xl" style={{ backgroundColor: 'rgb(39, 46, 58)' }}>
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-300 font-semibold">
            Розыгрыш
          </div>
          <h1 className="block mt-1 text-lg leading-tight font-medium text-white">
            {raffle.title}
          </h1>
          <p className="mt-2 text-gray-300 whitespace-pre-line">
            {raffle.description}
          </p>
          
          <div className="mt-4">
            <p className="text-sm text-gray-300">
              🎁 Приз: {raffle.prize} ({raffle.prize_count} шт.)
            </p>
            <p className="text-sm text-gray-300">
              👥 Участников: {participantCount}
              {raffle.max_participants > 0 ? ` / ${raffle.max_participants}` : ''}
            </p>
            <p className="text-sm text-gray-300">
              ⏰ До: <FormattedDate date={raffle.end_date} />
            </p>
          </div>

          {showCaptcha && !isVerified && isSubscribed && (
            <div className="mt-4">
              <Turnstile onVerify={handleCaptchaVerify} />
            </div>
          )}

          {!isSubscribed && (
            <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
              Для участия необходимо подписаться на канал
            </div>
          )}

          {!isParticipating && isEnded && (
            <div className="mt-4 p-4 bg-gray-700 text-gray-200 rounded">
              Этот розыгрыш уже завершен
            </div>
          )}

          {!isParticipating && isFull && (
            <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
              Достигнуто максимальное количество участников
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
