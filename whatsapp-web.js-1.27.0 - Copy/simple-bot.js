const { Client, LocalAuth } = require('whatsapp-web.js');

// Create a new client instance
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: false, // Set to true if you don't want to see the browser
    }
});

// Initialize the client
client.initialize();

// Event: Loading screen
client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

// Event: QR Code received
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    console.log('Please scan this QR code with your WhatsApp mobile app to authenticate.');
});

// Event: Authentication successful
client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

// Event: Authentication failed
client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

// Event: Client is ready
client.on('ready', () => {
    console.log('Client is ready!');
    console.log('You can now send messages to this bot.');
});

// Event: Message received
client.on('message', async msg => {
    console.log('MESSAGE RECEIVED:', msg.body);

    // Simple echo bot - replies with the same message
    if (msg.body === '!ping') {
        await msg.reply('pong');
    } else if (msg.body === '!hello') {
        await msg.reply('Hello! How can I help you?');
    } else if (msg.body === '!info') {
        const info = client.info;
        await msg.reply(`
*Bot Information*
User: ${info.pushname}
Number: ${info.wid.user}
Platform: ${info.platform}
        `);
    } else if (msg.body === '!help') {
        await msg.reply(`
*Available Commands:*
!ping - Test if bot is working
!hello - Get a greeting
!info - Get bot information
!help - Show this help message
        `);
    }
});

// Event: Client disconnected
client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.destroy();
    process.exit(0);
});
