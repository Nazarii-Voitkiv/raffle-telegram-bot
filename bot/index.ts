import { Telegraf, Markup } from 'telegraf';
import { createRaffle, getRaffles, getRaffle, getParticipantCount, isParticipating, addParticipant } from '../lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const WEBAPP_URL = process.env.WEBAPP_URL;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Перевірка необхідних змінних середовища
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be provided!');
}

if (!WEBAPP_URL) {
  throw new Error('WEBAPP_URL must be provided!');
}

if (!WEBAPP_URL.startsWith('https://')) {
  throw new Error('WEBAPP_URL must start with https://');
}

const bot = new Telegraf(BOT_TOKEN);

// Middleware для перевірки чи повідомлення від адміністратора
const adminOnly = async (ctx: any, next: () => Promise<void>) => {
  if (ctx.chat?.id.toString() === ADMIN_CHAT_ID) {
    return next();
  }
  await ctx.reply('У вас нет доступа к этой команде.');
};

// Команда для створення нового розіграшу (тільки для адміна)
bot.command('create_raffle', adminOnly, async (ctx) => {
  const message = ctx.message.text.split('\n');
  if (message.length < 7) {
    return ctx.reply(
      'Используйте формат:\n/create_raffle\nНазвание\nОписание\nПриз\nКоличество призов\nМаксимум пользователей\nОкончание розыгрыша (YYYY-MM-DD)'
    );
  }

  try {
    const [
      ,
      title,
      description,
      prize,
      prizeCount,
      maxParticipants,
      endDate
    ] = message;

    await ctx.reply('Создание розыгрыша...');
    
    const raffleId = await createRaffle({
      title,
      description,
      prize,
      prize_count: parseInt(prizeCount),
      max_participants: parseInt(maxParticipants),
      end_date: new Date(endDate).toISOString()
    });

    if (raffleId) {
      await ctx.reply('Розыграш успешно создан!');
    } else {
      await ctx.reply('Ошибка при создании розыгрыша.');
    }
  } catch (error) {
    console.error('Error creating raffle:', error);
    await ctx.reply('Ошибка при создании розыгрыша. Проверьте формат данных.');
  }
});

// Функція для форматування повідомлення про розіграш
async function formatRaffleMessage(raffle: any) {
  const participantCount = await getParticipantCount(raffle.id);
  const maxParticipantsText = raffle.max_participants > 0 
    ? `/${raffle.max_participants}` 
    : '';

  const message = `
🎉 ${raffle.title}

${raffle.description || ''}

🎁 Приз: ${raffle.prize} (${raffle.prize_count} шт.)
👥 Участников: ${participantCount}${maxParticipantsText}
⏰ До: ${new Date(raffle.end_date).toLocaleString()}
`;

  const webAppUrl = `${WEBAPP_URL}/raffle/${raffle.id}`;
  const keyboard = {
    inline_keyboard: [[
      Markup.button.webApp('🎲 Участвовать', webAppUrl)
    ]]
  };

  return { message, keyboard };
}

// Команда для показу активних розіграшів
bot.command('raffles', async (ctx) => {
  try {
    const raffles = await getRaffles();
    const activeRaffles = raffles.filter(raffle => new Date(raffle.end_date) > new Date());

    if (activeRaffles.length === 0) {
      return ctx.reply('Нет активных розыгрышей.');
    }

    for (const raffle of activeRaffles) {
      try {
        const { message, keyboard } = await formatRaffleMessage(raffle);
        await ctx.reply(message, { reply_markup: keyboard });
      } catch (error) {
        console.error('Error sending raffle message:', error);
      }
    }
  } catch (error) {
    console.error('Error getting raffles:', error);
    await ctx.reply('Произошла ошибка при получении списка розыгрышей.');
  }
});

// Обробка натискання кнопки "Участвовать"
bot.on('callback_query', async (ctx: any) => {
  try {
    if (!ctx.callbackQuery?.data?.startsWith('join_')) {
      return;
    }

    const raffleId = parseInt(ctx.callbackQuery.data.split('_')[1]);
    const userId = ctx.from.id;

    const raffle = await getRaffle(raffleId);
    if (!raffle) {
      await ctx.answerCbQuery('Розыгрыш не найден.');
      return;
    }

    if (new Date(raffle.end_date) < new Date()) {
      await ctx.answerCbQuery('Этот розыгрыш уже завершен.');
      return;
    }

    const isUserParticipating = await isParticipating(raffleId, userId);
    if (isUserParticipating) {
      await ctx.answerCbQuery('Вы уже приняли участие в этом розыгрыше.');
      return;
    }

    if (raffle.max_participants > 0) {
      const currentCount = await getParticipantCount(raffleId);
      if (currentCount >= raffle.max_participants) {
        await ctx.answerCbQuery('Слишком много участников.');
        return;
      }
    }

    const webAppUrl = `${WEBAPP_URL}/raffle/${raffle.id}`;
    await ctx.reply(
      'Вы приняли участие в розыгрыше:',
      {
        reply_markup: {
          inline_keyboard: [[
            Markup.button.webApp(
              'Принять участие',
              webAppUrl
            )
          ]]
        }
      }
    );

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error processing callback:', error);
    await ctx.answerCbQuery('Ошибка при обработке колбека.');
  }
});

// Команда для отримання допомоги
bot.command('help', async (ctx) => {
  const helpText = `
Доступные команды:
/raffles - Показать активные розыгрыши
/admin - Открыть панель администратора
/help - Показать это сообщение

${ctx.chat?.id.toString() === ADMIN_CHAT_ID ? `
Команды администратора:
/create_raffle - Создать новый розыгрыш
Формат:
/create_raffle
Название
Описание
Приз
Количество призов
Максимум участников
Дата окончания (YYYY-MM-DD)` : ''}
`;

  await ctx.reply(helpText);
});

// Команда для початку роботи з ботом
bot.command('start', async (ctx) => {
  const startPayload = ctx.message.text.split(' ')[1];
  
  if (startPayload && startPayload.startsWith('raffle_')) {
    const raffleId = parseInt(startPayload.replace('raffle_', ''), 10);
    try {
      const raffle = await getRaffle(raffleId);
      
      if (!raffle) {
        return ctx.reply('Розыгрыш не найден.');
      }

      if (new Date(raffle.end_date) < new Date()) {
        return ctx.reply('Этот розыгрыш уже завершен.');
      }

      const { message, keyboard } = await formatRaffleMessage(raffle);
      await ctx.reply(message, { reply_markup: keyboard });
    } catch (error) {
      console.error('Error handling raffle start:', error);
      await ctx.reply('Произошла ошибка при загрузке розыгрыша.');
    }
  } else {
    await ctx.reply('Привет! Я бот для участия в розыгрышах. Используйте /help чтобы получить список команд');
  }
});

// Обробка натискання кнопки "Участвовать"
bot.action(/^join_(\d+)$/, async (ctx) => {
  const raffleId = parseInt(ctx.match[1], 10);
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name;

  if (!userId) {
    return ctx.answerCbQuery('Ошибка: не удалось определить пользователя');
  }

  try {
    const raffle = await getRaffle(raffleId);
    if (!raffle) {
      return ctx.answerCbQuery('Розыгрыш не найден');
    }

    if (new Date(raffle.end_date) < new Date()) {
      return ctx.answerCbQuery('Этот розыгрыш уже завершен');
    }

    const participantCount = await getParticipantCount(raffle.id);
    if (raffle.max_participants > 0 && participantCount >= raffle.max_participants) {
      return ctx.answerCbQuery('Достигнуто максимальное количество участников');
    }

    const isUserParticipating = await isParticipating(raffle.id, userId);
    if (isUserParticipating) {
      return ctx.answerCbQuery('Вы уже участвуете в этом розыгрыше');
    }

    // Get IP address (using a default value since it's required)
    const ipAddress = ctx.from?.username || 'unknown';

    await addParticipant({
      raffle_id: raffle.id,
      telegram_id: userId,
      username: username || '',
      first_name: firstName || '',
      ip_address: ipAddress
    });
    
    await ctx.answerCbQuery('Вы успешно присоединились к розыгрышу!');
    
    // Оновлюємо повідомлення з новою кнопкою
    const message = ctx.callbackQuery.message;
    if (message) {
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [{ text: '✅ Вы участвуете', callback_data: 'already_joined' }]
        ]
      });
    }
  } catch (error) {
    console.error('Error joining raffle:', error);
    await ctx.answerCbQuery('Произошла ошибка при присоединении к розыгрышу');
  }
});

// Обробка натискання кнопки "Вы участвуете"
bot.action('already_joined', async (ctx) => {
  await ctx.answerCbQuery('Вы уже участвуете в этом розыгрыше');
});

// Команда для доступу до адмін-панелі
bot.command('admin', async (ctx) => {
  const webAppUrl = `${WEBAPP_URL}/admin`;
  await ctx.reply(
    'Панель администратора доступна по ссылке:',
    {
      reply_markup: {
        inline_keyboard: [[
          Markup.button.webApp(
            'Открыть панель администратора',
            webAppUrl
          )
        ]]
      }
    }
  );
});

// Запуск бота
bot.launch().then(() => {
  console.log('Bot is running...');
  console.log('WebApp URL:', WEBAPP_URL); // Для дебагу
}).catch((error) => {
  console.error('Error starting bot:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
