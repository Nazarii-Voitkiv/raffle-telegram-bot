import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const bot = new Telegraf(BOT_TOKEN || '');

// Функція для отримання інформації про бота
async function getBotUsername(): Promise<string> {
  try {
    const botInfo = await bot.telegram.getMe();
    return botInfo.username || '';
  } catch (error) {
    console.error('Failed to get bot info:', error);
    return '';
  }
}

export async function sendTelegramMessage(text: string, inlineKeyboard?: any) {
  try {
    // Відправляємо в канал
    const message = await bot.telegram.sendMessage(CHANNEL_ID || '', text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: inlineKeyboard
    });
    return message.message_id;
  } catch (error) {
    console.error('Error sending telegram message to channel:', error);
    throw error;
  }
}

export async function editTelegramMessage(messageId: number, text: string) {
  try {
    await bot.telegram.editMessageText(CHANNEL_ID, messageId, undefined, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error editing telegram message:', error);
    throw error;
  }
}

export async function notifyWinners(raffle: any, winners: any[]) {
  try {
    // Редагуємо повідомлення в каналі, якщо є ID повідомлення
    if (raffle.announcement_message_id) {
      const channelMessage = formatWinnersMessage(raffle, winners);
      await editTelegramMessage(raffle.announcement_message_id, channelMessage);
    } else {
      // Якщо немає ID повідомлення, відправляємо нове
      const channelMessage = formatWinnersMessage(raffle, winners);
      await sendTelegramMessage(channelMessage);
    }

    // Відправляємо особисті повідомлення переможцям
    for (const winner of winners) {
      if (winner.telegram_id) {
        try {
          const personalMessage = `🎉 Поздравляем!\n\nВы стали победителем в розыгрыше "${raffle.title}"!\n\nВаш выигрыш: ${raffle.prize}`;
          
          await bot.telegram.sendMessage(winner.telegram_id, personalMessage, {
            parse_mode: 'HTML'
          });
          
          console.log(`Notification sent to winner ${winner.telegram_id}`);
        } catch (error) {
          console.error(`Failed to notify winner ${winner.telegram_id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in notifyWinners:', error);
    throw error;
  }
}

export function formatWinnersMessage(raffle: any, winners: any[]) {
  const winnersList = winners
    .map(w => w.username ? `@${w.username}` : w.first_name || 'Аноним')
    .join(', ');

  return `🎉 <b>${raffle.title}</b>\n\nРозыгрыш окончен!\n\nПобедители: ${winnersList}`; 
}

export async function formatRaffleAnnouncementMessage(raffle: any) {
  const endDate = new Date(raffle.end_date);
  const formattedDate = endDate.toLocaleString('ru-RU', { 
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const message = `${raffle.announcement_text || '🎉 Новый розыгрыш'}

${raffle.title}

${raffle.description || ''}

🎁 Приз: ${raffle.prize} (${raffle.prize_count} шт.)
👥 Количество победителей: ${raffle.prize_count}
⏰ Окончание: ${formattedDate}\n\n` +
    `Для участия нажмите на кнопку ниже 👇`;

  // Отримуємо актуальний username бота
  const username = await getBotUsername();
  
  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '🎲 Участвовать в розыгрыше',
          url: `tg://resolve?domain=${username}&start=raffle_${raffle.id}`
        }
      ]
    ]
  };

  return { message, inlineKeyboard };
}
