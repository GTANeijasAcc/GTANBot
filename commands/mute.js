const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { checkPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a member in the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 5m, 2h, 1d)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for muting the user')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check if user has permission to manage roles
        if (!checkPermissions(interaction.member, PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ You do not have permission to mute members!', ephemeral: true });
        }

        // Check if bot has permission to manage roles
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ I do not have permission to manage roles!', ephemeral: true });
        }

        // Get target user
        const targetUser = interaction.options.getUser('user');
        const target = await interaction.guild.members.fetch(targetUser.id);
        
        if (!target) {
            return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
        }

        // Prevent self-mute
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot mute yourself!', ephemeral: true });
        }

        // Prevent muting the bot
        if (target.id === interaction.client.user.id) {
            return interaction.reply({ content: '❌ I cannot mute myself!', ephemeral: true });
        }

        // Find or create mute role
        let muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
        
        if (!muteRole) {
            try {
                muteRole = await interaction.guild.roles.create({
                    name: 'Muted',
                    color: '#818181',
                    permissions: [],
                    reason: 'Mute role for moderation'
                });

                // Set permissions for mute role in all channels
                interaction.guild.channels.cache.forEach(async (channel) => {
                    await channel.permissionOverwrites.create(muteRole, {
                        SendMessages: false,
                        Speak: false,
                        AddReactions: false
                    });
                });

            } catch (error) {
                console.error('Error creating mute role:', error);
                return interaction.reply({ content: '❌ Could not create mute role!', ephemeral: true });
            }
        }

        // Check if user is already muted
        if (target.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ This member is already muted!', ephemeral: true });
        }

        // Parse duration and reason
        let duration = null;
        let reason = interaction.options.getString('reason') || 'No reason provided';
        const durationString = interaction.options.getString('duration');
        
        if (durationString) {
            const durationMatch = durationString.match(/^(\d+)([mhd])$/);
            if (durationMatch) {
                const amount = parseInt(durationMatch[1]);
                const unit = durationMatch[2];
                
                switch (unit) {
                    case 'm':
                        duration = amount * 60 * 1000; // minutes to milliseconds
                        break;
                    case 'h':
                        duration = amount * 60 * 60 * 1000; // hours to milliseconds
                        break;
                    case 'd':
                        duration = amount * 24 * 60 * 60 * 1000; // days to milliseconds
                        break;
                }
            } else {
                return interaction.reply({ content: '❌ Invalid duration format! Use format like: 5m, 2h, 1d', ephemeral: true });
            }
        }

        try {
            // Add mute role
            await target.roles.add(muteRole, reason);

            // Send confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setColor('#ffa502')
                .setTitle('🔇 Member Muted')
                .setDescription(`**${target.user.tag}** has been muted`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Duration', value: duration ? durationString : 'Permanent', inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'GTA Neijas Moderator' });

            await interaction.reply({ embeds: [confirmEmbed] });

            // Set auto-unmute if duration is specified
            if (duration) {
                setTimeout(async () => {
                    try {
                        const member = await interaction.guild.members.fetch(target.id);
                        if (member && member.roles.cache.has(muteRole.id)) {
                            await member.roles.remove(muteRole, 'Mute duration expired');
                            
                            const unmuteEmbed = new EmbedBuilder()
                                .setColor('#4ecdc4')
                                .setTitle('🔊 Member Automatically Unmuted')
                                .setDescription(`**${target.user.tag}**'s mute has expired`)
                                .setTimestamp();

                            const modChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
                            if (modChannel) {
                                await modChannel.send({ embeds: [unmuteEmbed] });
                            }
                        }
                    } catch (error) {
                        console.error('Error auto-unmuting user:', error);
                    }
                }, duration);
            }

            // Log to mod channel if exists
            const modChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (modChannel) {
                await modChannel.send({ embeds: [confirmEmbed] });
            }

        } catch (error) {
            console.error('Error muting member:', error);
            await interaction.reply({ content: '❌ An error occurred while trying to mute this member!', ephemeral: true });
        }
    }
};
