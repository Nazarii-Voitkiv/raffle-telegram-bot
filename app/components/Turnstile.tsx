'use client';

import { useEffect, useRef } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
}

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
    };
  }
}

// Зберігаємо стан завантаження скрипта
let isScriptLoading = false;
let scriptLoadPromise: Promise<void> | null = null;

// Функція для завантаження скрипта
const loadTurnstileScript = () => {
  if (scriptLoadPromise) return scriptLoadPromise;
  if (window.turnstile) return Promise.resolve();

  isScriptLoading = true;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      isScriptLoading = false;
      resolve();
    };
    
    script.onerror = (error) => {
      isScriptLoading = false;
      scriptLoadPromise = null;
      reject(error);
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export default function Turnstile({ onVerify }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>();

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    console.log('Current domain:', window.location.hostname);
    console.log('Turnstile site key:', siteKey);

    const renderWidget = async () => {
      try {
        await loadTurnstileScript();
        
        if (containerRef.current && window.turnstile && !widgetId.current) {
          widgetId.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              console.log('Turnstile token received:', token);
              onVerify(token);
            },
            'error-callback': (error: any) => {
              console.log('Turnstile widget error:', error);
            },
            'expired-callback': () => {
              console.log('Turnstile token expired');
            },
            theme: 'dark',
            appearance: 'always'
          });
          console.log('Widget rendered with ID:', widgetId.current);
        }
      } catch (error) {
        console.log('Error rendering widget:', error);
      }
    };

    renderWidget();

    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetId.current);
          widgetId.current = undefined;
        } catch (error) {
          console.log('Error resetting Turnstile:', error);
        }
      }
    };
  }, [onVerify]);

  return (
    <div className="flex justify-center items-center">
      <div ref={containerRef} className="mb-4" />
    </div>
  );
}
