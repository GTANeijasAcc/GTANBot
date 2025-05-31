const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { checkPermissions, hasRequiredRoles } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for banning the user')
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
        
        // Check if user has permission to ban members
        if (!checkPermissions(interaction.member, PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ You do not have permission to ban members!', ephemeral: true });
        }

        // Check if bot has permission to ban members
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ I do not have permission to ban members!', ephemeral: true });
        }

        // Get target user
        const targetUser = interaction.options.getUser('user');
        const target = await interaction.guild.members.fetch(targetUser.id);
        
        if (!target) {
            return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
        }

        // Check if target is bannable
        if (!target.bannable) {
            return interaction.reply({ content: '❌ I cannot ban this member! They may have higher permissions than me.', ephemeral: true });
        }

        // Prevent self-ban
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot ban yourself!', ephemeral: true });
        }

        // Prevent banning the bot
        if (target.id === interaction.client.user.id) {
            return interaction.reply({ content: '❌ I cannot ban myself!', ephemeral: true });
        }

        // Get reason
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Send DM to target before banning
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ff4757')
                    .setTitle('You have been banned')
                    .setDescription(`You were banned from **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: false }
                    )
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to banned user');
            }

            // Ban the member
            await target.ban({ reason: reason, deleteMessageDays: 7 });

            // Send confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setColor('#ff4757')
                .setTitle('🔨 Member Banned')
                .setDescription(`**${target.user.tag}** has been banned from the server`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Member ID', value: target.id, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'GTA Neijas Moderator' });

            await interaction.reply({ embeds: [confirmEmbed] });

            // Log to mod channel if exists
            const modChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (modChannel) {
                await modChannel.send({ embeds: [confirmEmbed] });
            }

        } catch (error) {
            console.error('Error banning member:', error);
            await interaction.reply({ content: '❌ An error occurred while trying to ban this member!', ephemeral: true });
        }
    }
};
