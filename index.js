// const TelegramBot = require('node-telegram-bot-api');
import TelegramBot from 'node-telegram-bot-api'
import fetch from 'node-fetch';
import express from 'express';
const token = '5824420414:AAHzTt0wiXmgWDZi4bptsHgievekC0eLjXw';
const bot = new TelegramBot(token, { polling: true });

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json())

const PORT = 4000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Обработка команды /start
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const message = msg.text;

    if (message === '/start') {
        bot.sendMessage(chatId, 'Привет! Я ваш Telegram бот.');
    }
});

const messageCount = new Map(); // Для отслеживания количества сообщений пользователя
const messageTimestamps = new Map(); // Для отслеживания времени отправки последнего сообщения пользователя

// Обработка сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const interval = 24 * 60 * 60 * 1000; // 1 день в миллисекундах

    if (!messageCount.has(chatId)) {
        messageCount.set(chatId, {});
    }
    if (!messageTimestamps.has(chatId)) {
        messageTimestamps.set(chatId, {});
    }

    const userCount = messageCount.get(chatId);
    const userTimestamps = messageTimestamps.get(chatId);

    if (!userCount[userId]) {
        userCount[userId] = { count: 1, time: Date.now() };
        userTimestamps[userId] = Date.now();
    } else {
        userCount[userId].count++;
        if (userCount[userId].count >= 5) {
            // Ограничение: если пользователь отправил более 5 сообщений в течение дня
            bot.sendMessage(chatId, 'Вы отправили слишком много сообщений сегодня. Подождите до завтра.');
            // Удаляем последнее сообщение пользователя
            const messages = await bot.getChatHistory(chatId, { limit: 1 });
            if (messages.length > 0) {
                deleteMessages(chatId, userId, messages[0].message_id);
            }
            return;
        }
        // Проверяем, прошел ли день с момента последнего сообщения пользователя
        if (Date.now() - userTimestamps[userId] > interval) {
            userCount[userId] = { count: 1, time: Date.now() };
            userTimestamps[userId] = Date.now();
        }
    }

    // Ваш код для обработки сообщения и отправки ответа

    // Проверяем и удаляем устаревшие сообщения пользователя через 3 дня
    const userMessages = await bot.getChatHistory(chatId, { limit: 100 });
    checkAndDeleteExpiredMessages(chatId, userId, userMessages);
});


// Функция для удаления сообщений
async function deleteMessages(chatId, userId, messageIdToDelete) {
    token = '5824420414:AAHzTt0wiXmgWDZi4bptsHgievekC0eLjXw';
    const apiUrl = `https://api.telegram.org/bot${token}/deleteMessage`;

    const params = {
        chat_id: chatId,
        message_id: messageIdToDelete,
    };

    try {
        await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify(params),
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Ошибка при удалении сообщения:', error);
    }
}

function checkAndDeleteExpiredMessages(chatId, userId, userMessages) {
    const now = Date.now();
    const interval = 3 * 24 * 60 * 60 * 1000; // 3 дня в миллисекундах

    // Проверяем каждое сообщение и удаляем те, которые старше 3 дней
    for (const message of userMessages) {
        if (now - message.date * 1000 > interval) {
            deleteMessages(chatId, userId, message.message_id);
        }
    }
}
