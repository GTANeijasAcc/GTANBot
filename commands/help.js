const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasRequiredRoles } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed info about a specific command')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check if user has required roles
        if (!hasRequiredRoles(interaction.member)) {
            return interaction.reply({ 
                content: '❌ You do not have the required roles to use this bot!', 
                ephemeral: true 
            });
        }
        const { commands } = interaction.client;
        const commandName = interaction.options.getString('command');

        // If specific command requested
        if (commandName) {
            const command = commands.get(commandName.toLowerCase());

            if (!command) {
                return interaction.reply({ content: `❌ Command \`${commandName}\` not found!`, ephemeral: true });
            }

            const commandEmbed = new EmbedBuilder()
                .setColor('#74b9ff')
                .setTitle(`📖 Command: /${command.data.name}`)
                .setDescription(command.data.description)
                .setTimestamp()
                .setFooter({ text: 'GTA Neijas Moderator' });

            return interaction.reply({ embeds: [commandEmbed] });
        }

        // Display all commands
        const helpEmbed = new EmbedBuilder()
            .setColor('#74b9ff')
            .setTitle('🤖 GTA Neijas Moderator - Help')
            .setDescription('Here are all available slash commands:')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'GTA Neijas Moderator | Use /help [command] for detailed info' });

        // Moderation commands
        const moderationCommands = [];
        const utilityCommands = [];

        commands.forEach(command => {
            const commandInfo = `\`/${command.data.name}\` - ${command.data.description}`;
            
            if (['kick', 'ban', 'mute', 'warn'].includes(command.data.name)) {
                moderationCommands.push(commandInfo);
            } else {
                utilityCommands.push(commandInfo);
            }
        });

        if (moderationCommands.length > 0) {
            helpEmbed.addFields({
                name: '🛡️ Moderation Commands',
                value: moderationCommands.join('\n'),
                inline: false
            });
        }

        if (utilityCommands.length > 0) {
            helpEmbed.addFields({
                name: '🔧 Utility Commands',
                value: utilityCommands.join('\n'),
                inline: false
            });
        }

        // Add bot info
        helpEmbed.addFields(
            {
                name: '📊 Bot Statistics',
                value: `Servers: ${interaction.client.guilds.cache.size}\nCommands: ${commands.size}`,
                inline: true
            },
            {
                name: '🎮 Current Activity',
                value: 'Playing Grand Theft Auto: Neijas',
                inline: true
            }
        );

        await interaction.reply({ embeds: [helpEmbed] });
    }
};
