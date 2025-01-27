# Telegram Raffle Bot

A Next.js-based Telegram bot for managing raffles and giveaways in your Telegram channel. The bot features a web interface for raffle management and uses Cloudflare Turnstile for protection against automated entries.

## Features

- Telegram bot integration for raffle management
- Web interface for raffle administration
- Cloudflare Turnstile protection
- Automated participant management
- Scheduled tasks using CRON jobs

## Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- A Telegram Channel where the bot will operate
- Cloudflare Turnstile account for anti-bot protection
- ngrok or similar for development webhook URL

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Telegram Configuration
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=your_webhook_url
CHANNEL_ID=your_telegram_channel_id

# Cloudflare Turnstile Configuration
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key

# Security
JWT_SECRET=your_jwt_secret
CRON_SECRET=your_cron_secret
```

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

The project is built with Next.js and includes:
- Next.js App Router
- TypeScript support
- Integration with Telegram Bot API
- Cloudflare Turnstile integration
- CRON job functionality

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
