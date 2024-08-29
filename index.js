const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Replace with your Telegram bot token
const token = '7508390970:AAGn_bBXiEcdN66GFVD_OydzTOVTY7ElHM8';
const bot = new TelegramBot(token, { polling: true });

// Function to validate the URL
const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

// Function to process the video download and sending
const processVideo = async (chatId, url, emojiMessageId) => {
    const apiUrl = `http://ap.sg.3.xeh.sh:25164/nayan/terabox?url=${encodeURIComponent(url)}`;

    try {
        // Notify the user that the download is starting and save the message ID
        const waitMessage = await bot.sendMessage(chatId, 'Download your videos pls w8...');

        // Fetch video URL from API
        const response = await axios.get(apiUrl);
        const videoUrl = response.data.data.video;
        const fileName = response.data.data.file_name || 'video.mp4'; // Default filename

        // Download the video to a local file
        const videoPath = path.join(__dirname, fileName);
        const videoWriter = fs.createWriteStream(videoPath);
        const videoResponse = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
        });

        videoResponse.data.pipe(videoWriter);

        videoWriter.on('finish', async () => {
            try {
                // Remove the "pls w8" message before sending the video
                await bot.deleteMessage(chatId, waitMessage.message_id);

                // Define caption with clickable link
                const caption = `𝐁𝐨𝐭 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐫: [Alif Hosson](https://www.facebook.com/profile.php?id=100075421394195)`;

                // Send the downloaded video file to Telegram with a caption
                await bot.sendVideo(chatId, videoPath, { caption, parse_mode: 'MarkdownV2' });

                // Remove the emoji message after sending the video
                await bot.deleteMessage(chatId, emojiMessageId);

                // Remove the file after sending
                fs.unlink(videoPath, (err) => {
                    if (err) {
                        console.error('Error removing file:', err);
                    }
                });
            } catch (error) {
                await bot.sendMessage(chatId, `Error sending video: ${error.message}`);
                await bot.deleteMessage(chatId, emojiMessageId);
            }
        });

        videoWriter.on('error', async (error) => {
            await bot.sendMessage(chatId, `Error downloading video: ${error.message}`);
            await bot.deleteMessage(chatId, waitMessage.message_id);
            await bot.deleteMessage(chatId, emojiMessageId);
        });

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            await bot.sendMessage(chatId, `Error: Unable to connect to the server. Please try again later.`);
        } else {
            const errorMessage = error.response ? error.response.data : error.message;
            await bot.sendMessage(chatId, `Error making the request: ${errorMessage}`);
        }
        await bot.deleteMessage(chatId, emojiMessageId);
    }
};

// Handle the /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const startMessage = `Hello ${msg.from.first_name}! Welcome to the TeraBox Video Downloader bot. Send me a Terabox URL to fetch and send videos. Use /info to get information about this bot or /admin to see the admin details.`;
    bot.sendMessage(chatId, startMessage);
});

// Handle the /info command
bot.onText(/\/info/, (msg) => {
    const chatId = msg.chat.id;
    const infoMessage = 'This bot allows you to fetch and download videos from Terabox links. For any issues or feedback, please contact the bot developer.';
    bot.sendMessage(chatId, infoMessage);
});

// Handle the /admin command
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;

    // Send an image with admin information
    const adminMessage = `Bot Admin: [Alif Hosson](https://www.facebook.com/profile.php?id=100075421394195)\nTelegram ID: @alifhosson`;
    const adminImagePath = path.join(__dirname, 'https://ibb.co/f4yF2ks'); // Path to your admin image file

    try {
        await bot.sendPhoto(chatId, adminImagePath, { caption: adminMessage, parse_mode: 'MarkdownV2' });
    } catch (error) {
        await bot.sendMessage(chatId, `Error sending admin details: ${error.message}`);
    }
});

// Listen for any text messages and check if they contain a URL
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const url = msg.text.trim();

    // If the message is not a URL and not one of the commands, ignore
    if (msg.text.startsWith('/start') || msg.text.startsWith('/info') || msg.text.startsWith('/admin')) {
        return;
    }

    // Validate URL
    if (isValidURL(url)) {
        const emojiMessage = await bot.sendMessage(chatId, '✅');
        processVideo(chatId, url, emojiMessage.message_id);
    } else {
        const emojiMessage = await bot.sendMessage(chatId, '❌ Invalid URL. Please provide a correct link.');
        // Optionally, you can delete the ❌ message after a few seconds if you want
        setTimeout(() => {
            bot.deleteMessage(chatId, emojiMessage.message_id);
        }, 5000);  // Delete after 5 seconds
    }
});