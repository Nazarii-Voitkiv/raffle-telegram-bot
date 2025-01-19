import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initDataUnsafe: {
          user?: {
            id: number;
          };
        };
      };
    };
  }
}

export function useChannelMembership() {
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMembership = async () => {
      try {
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        
        if (!userId) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/check-membership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        const data = await response.json();
        setIsMember(data.isMember);
      } catch (error) {
        console.error('Error:', error);
        setIsMember(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMembership();
  }, []);

  return { isMember, isLoading };
}
