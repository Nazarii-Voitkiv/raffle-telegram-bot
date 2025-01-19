'use client';

import { useState, useEffect } from 'react';
import Turnstile from './components/Turnstile';

const checkParticipation = async (userId: number) => {
  try {
    const response = await fetch('/api/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();
    return data.hasParticipated;
  } catch (error) {
    console.error('Error checking participation:', error);
    return false;
  }
};

export default function Home() {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [participationSaved, setParticipationSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Перевіряємо участь при завантаженні
  useEffect(() => {
    const init = async () => {
      try {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        const hasParticipated = await checkParticipation(user.id);
        if (hasParticipated) {
          setParticipationSaved(true);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleButtonClick = async () => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user?.id || !user?.username) return;

    // Спочатку перевіряємо чи користувач вже брав участь
    const hasParticipated = await checkParticipation(user.id);
    if (hasParticipated) {
      setParticipationSaved(true);
      return;
    }

    // Якщо капча пройдена і є токен, зберігаємо участь
    if (isVerified && captchaToken) {
      try {
        const participationResponse = await fetch('/api/save-participation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name
          })
        });

        if (participationResponse.ok) {
          setParticipationSaved(true);
        }
      } catch (error) {
        console.error('Error:', error);
      }
      return;
    }

    // Якщо капча ще не пройдена, перевіряємо підписку
    try {
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();
      setIsSubscribed(data.isSubscribed);

      if (!data.isSubscribed) {
        setShowCaptcha(false);
      } else if (!showCaptcha && !isVerified) {
        setShowCaptcha(true);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user?.id) return;

    try {
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, turnstileToken: token })
      });

      if (response.ok) {
        setIsVerified(true);
        setCaptchaToken(token);
        setShowCaptcha(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow" />
        <div className="p-4">
          <button 
            className="w-full px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed"
            disabled={true}
          >
            Загрузка...
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow" />
      <div className="p-4 space-y-4">
        {showCaptcha && !isVerified && isSubscribed && (
          <div className="flex justify-center">
            <Turnstile onVerify={handleCaptchaVerify} />
          </div>
        )}
        <button 
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleButtonClick}
          disabled={participationSaved || isLoading}
        >
          {participationSaved ? 'Вы уже участвуете' : isVerified ? 'Подтвердить участие' : 'Принять участие'}
        </button>
      </div>
    </div>
  );
}
