'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function TelegramScript() {
  useEffect(() => {
    // Перевіряємо чи вже завантажений WebApp
    if (window.Telegram?.WebApp) {
      console.log('Debug - Telegram WebApp already loaded, calling ready()');
      window.Telegram.WebApp.ready();
    }
  }, []);

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="beforeInteractive"
      onLoad={() => {
        console.log('Debug - Telegram WebApp script loaded');
        if (window.Telegram?.WebApp) {
          console.log('Debug - Calling WebApp.ready() after script load');
          window.Telegram.WebApp.ready();
        }
      }}
      onError={(e) => {
        console.error('Debug - Error loading Telegram WebApp script:', e);
      }}
    />
  );
}
