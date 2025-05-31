const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { checkPermissions } = require('../utils/permissions');

// Simple in-memory storage for warnings (in production, use a database)
const warnings = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for warning the user')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check if user has permission to manage messages
        if (!checkPermissions(interaction.member, PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ You do not have permission to warn members!', ephemeral: true });
        }

        // Get target user
        const targetUser = interaction.options.getUser('user');
        const target = await interaction.guild.members.fetch(targetUser.id);
        
        if (!target) {
            return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
        }

        // Prevent self-warn
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot warn yourself!', ephemeral: true });
        }

        // Prevent warning the bot
        if (target.id === interaction.client.user.id) {
            return interaction.reply({ content: '❌ You cannot warn me!', ephemeral: true });
        }

        // Get reason
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Initialize user warnings if they don't exist
            const userId = target.id;
            const guildId = interaction.guild.id;
            const warningKey = `${guildId}-${userId}`;

            if (!warnings.has(warningKey)) {
                warnings.set(warningKey, []);
            }

            // Add warning
            const userWarnings = warnings.get(warningKey);
            const warningData = {
                id: userWarnings.length + 1,
                reason: reason,
                moderator: interaction.user.tag,
                timestamp: new Date().toISOString(),
                guildId: guildId
            };

            userWarnings.push(warningData);
            warnings.set(warningKey, userWarnings);

            // Send DM to warned user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ffa502')
                    .setTitle('You have received a warning')
                    .setDescription(`You were warned in **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Warning Count', value: `${userWarnings.length}/3`, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: false }
                    )
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to warned user');
            }

            // Send confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setColor('#ffa502')
                .setTitle('⚠️ Member Warned')
                .setDescription(`**${target.user.tag}** has been warned`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Warning Count', value: `${userWarnings.length}/3`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Warning ID', value: `#${warningData.id}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'GTA Neijas Moderator' });

            await interaction.reply({ embeds: [confirmEmbed] });

            // Check if user should be auto-punished for multiple warnings
            if (userWarnings.length >= 3) {
                const punishEmbed = new EmbedBuilder()
                    .setColor('#ff4757')
                    .setTitle('🔨 Automatic Action Triggered')
                    .setDescription(`**${target.user.tag}** has reached 3 warnings and has been kicked`)
                    .setTimestamp();

                try {
                    await target.kick('Reached maximum warnings (3/3)');
                    await interaction.followUp({ embeds: [punishEmbed] });
                    
                    // Clear warnings after kick
                    warnings.delete(warningKey);
                } catch (error) {
                    console.error('Error auto-kicking user with 3 warnings:', error);
                    await interaction.followUp({ content: '⚠️ User reached 3 warnings but could not be auto-kicked!', ephemeral: true });
                }
            }

            // Log to mod channel if exists
            const modChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (modChannel) {
                await modChannel.send({ embeds: [confirmEmbed] });
            }

        } catch (error) {
            console.error('Error warning member:', error);
            await interaction.reply({ content: '❌ An error occurred while trying to warn this member!', ephemeral: true });
        }
    }
};
