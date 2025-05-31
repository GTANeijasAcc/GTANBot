module.exports = {
    data: {
        name: 'ping',
        description: 'Check bot response time',
        usage: '!ping'
    },
    
    async execute(message, args, client) {
        await message.reply('Pong! Bot is working perfectly.');
    }
};