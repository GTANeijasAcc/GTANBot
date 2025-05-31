const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { checkPermissions, hasRequiredRoles } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kicking the user')
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
        
        // Check if user has permission to kick members
        if (!checkPermissions(interaction.member, PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: '❌ You do not have permission to kick members!', ephemeral: true });
        }

        // Check if bot has permission to kick members
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: '❌ I do not have permission to kick members!', ephemeral: true });
        }

        // Get target user
        const targetUser = interaction.options.getUser('user');
        const target = await interaction.guild.members.fetch(targetUser.id);
        
        if (!target) {
            return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
        }

        // Check if target is kickable
        if (!target.kickable) {
            return interaction.reply({ content: '❌ I cannot kick this member! They may have higher permissions than me.', ephemeral: true });
        }

        // Prevent self-kick
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot kick yourself!', ephemeral: true });
        }

        // Prevent kicking the bot
        if (target.id === interaction.client.user.id) {
            return interaction.reply({ content: '❌ I cannot kick myself!', ephemeral: true });
        }

        // Get reason
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Send DM to target before kicking
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('You have been kicked')
                    .setDescription(`You were kicked from **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: false }
                    )
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not send DM to kicked user');
            }

            // Kick the member
            await target.kick(reason);

            // Send confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setColor('#4ecdc4')
                .setTitle('✅ Member Kicked')
                .setDescription(`**${target.user.tag}** has been kicked from the server`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Moderator', value: message.author.tag, inline: true },
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
            console.error('Error kicking member:', error);
            await interaction.reply({ content: '❌ An error occurred while trying to kick this member!', ephemeral: true });
        }
    }
};
