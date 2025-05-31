const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { getCurrentPresenceInfo, setPresenceState } = require('./utils/presence');

class BotDashboard {
    constructor(client) {
        this.app = express();
        this.client = client;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Basic middleware
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(cors());
        
        // Session middleware
        this.app.use(session({
            secret: 'gta-neijas-dashboard-secret',
            resave: false,
            saveUninitialized: true,
            cookie: { secure: false }
        }));

        // Set view engine
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));
        
        // Static files
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Dashboard home
        this.app.get('/', (req, res) => {
            const botStats = this.getBotStats();
            const presenceInfo = getCurrentPresenceInfo();
            
            res.render('dashboard', {
                botStats,
                presenceInfo,
                guilds: Array.from(this.client.guilds.cache.values())
            });
        });

        // Bot statistics API
        this.app.get('/api/stats', (req, res) => {
            res.json(this.getBotStats());
        });

        // Presence control API
        this.app.post('/api/presence/state', (req, res) => {
            const { stateIndex } = req.body;
            
            try {
                setPresenceState(this.client, parseInt(stateIndex));
                res.json({ success: true, message: 'Presence state updated' });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Guild information API
        this.app.get('/api/guilds', (req, res) => {
            const guilds = Array.from(this.client.guilds.cache.values()).map(guild => ({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                ownerId: guild.ownerId,
                iconURL: guild.iconURL(),
                createdAt: guild.createdAt
            }));
            
            res.json(guilds);
        });

        // Commands list API
        this.app.get('/api/commands', (req, res) => {
            const commands = Array.from(this.client.commands.values()).map(command => ({
                name: command.data.name,
                description: command.data.description,
                usage: command.data.usage
            }));
            
            res.json(commands);
        });

        // Bot logs (simple endpoint)
        this.app.get('/api/logs', (req, res) => {
            // In a real application, you'd want to implement proper logging
            res.json([
                { timestamp: new Date(), level: 'info', message: 'Bot started successfully' },
                { timestamp: new Date(), level: 'info', message: 'Rich presence setup complete' }
            ]);
        });

        // Create new command endpoint
        this.app.post('/api/commands/create', (req, res) => {
            const { name, description, usage, response } = req.body;
            
            // Validate input
            if (!name || !description || !response) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Name, description, and response are required' 
                });
            }

            // Check if command already exists
            if (this.client.commands.has(name.toLowerCase())) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Command already exists' 
                });
            }

            try {
                // Create command object
                const commandData = {
                    data: {
                        name: name.toLowerCase(),
                        description: description,
                        usage: usage || `!${name.toLowerCase()}`
                    },
                    async execute(message, args, client) {
                        await message.reply(response);
                    }
                };

                // Add to client commands
                this.client.commands.set(name.toLowerCase(), commandData);

                // Save to file
                this.saveCommandToFile(name.toLowerCase(), commandData, response);

                res.json({ 
                    success: true, 
                    message: 'Command created successfully',
                    command: commandData.data
                });

            } catch (error) {
                console.error('Error creating command:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to create command' 
                });
            }
        });

        // Delete command endpoint
        this.app.delete('/api/commands/:name', (req, res) => {
            const { name } = req.params;
            
            // Prevent deletion of core moderation commands
            const protectedCommands = ['kick', 'ban', 'mute', 'warn', 'help'];
            if (protectedCommands.includes(name.toLowerCase())) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cannot delete core moderation commands' 
                });
            }

            try {
                if (this.client.commands.has(name.toLowerCase())) {
                    this.client.commands.delete(name.toLowerCase());
                    this.deleteCommandFile(name.toLowerCase());
                    
                    res.json({ 
                        success: true, 
                        message: 'Command deleted successfully' 
                    });
                } else {
                    res.status(404).json({ 
                        success: false, 
                        error: 'Command not found' 
                    });
                }
            } catch (error) {
                console.error('Error deleting command:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to delete command' 
                });
            }
        });
    }

    saveCommandToFile(name, commandData, response) {
        const fs = require('fs');
        const path = require('path');
        
        const commandContent = `module.exports = {
    data: {
        name: '${commandData.data.name}',
        description: '${commandData.data.description}',
        usage: '${commandData.data.usage}'
    },
    
    async execute(message, args, client) {
        await message.reply('${response.replace(/'/g, "\\'")}');
    }
};`;
        
        const filePath = path.join(__dirname, 'commands', `${name}.js`);
        fs.writeFileSync(filePath, commandContent);
    }

    deleteCommandFile(name) {
        const fs = require('fs');
        const path = require('path');
        
        const filePath = path.join(__dirname, 'commands', `${name}.js`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    getBotStats() {
        return {
            botName: this.client.user?.tag || 'Bot Offline',
            botId: this.client.user?.id || 'N/A',
            uptime: this.client.uptime || 0,
            guilds: this.client.guilds.cache.size,
            users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            channels: this.client.channels.cache.size,
            commands: this.client.commands.size,
            status: this.client.user ? 'Online' : 'Offline',
            ping: this.client.ws.ping
        };
    }

    start(port = 5000) {
        this.app.listen(port, '0.0.0.0', () => {
            console.log(`🌐 Dashboard server running on http://0.0.0.0:${port}`);
        });
    }
}

module.exports = BotDashboard;