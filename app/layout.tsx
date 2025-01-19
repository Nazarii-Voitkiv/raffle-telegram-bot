import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TelegramScript from './components/TelegramScript';

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Task Board",
  description: "Task Board Telegram App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <TelegramScript />
        {children}
      </body>
    </html>
  );
}
