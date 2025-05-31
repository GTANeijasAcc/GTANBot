const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { checkPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sendimage')
        .setDescription('Send an image to a specified channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the image to')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('The image file to send')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Optional message to include with the image')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        // Check if user has permission to manage messages
        if (!checkPermissions(interaction.member, PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command!', ephemeral: true });
        }

        // Get target channel
        const targetChannel = interaction.options.getChannel('channel');
        if (!targetChannel || !targetChannel.isTextBased()) {
            return interaction.reply({ content: '❌ Please select a valid text channel!', ephemeral: true });
        }

        // Check if bot has permission to send messages in target channel
        if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
            return interaction.reply({ content: `❌ I do not have permission to send messages in ${targetChannel}!`, ephemeral: true });
        }

        // Check if bot has permission to attach files in target channel
        if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.AttachFiles)) {
            return interaction.reply({ content: `❌ I do not have permission to attach files in ${targetChannel}!`, ephemeral: true });
        }

        // Get attachment
        const attachment = interaction.options.getAttachment('image');
        if (!attachment) {
            return interaction.reply({ content: '❌ Please attach an image file!', ephemeral: true });
        }

        // Check if attachment is an image
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const isImage = imageExtensions.some(ext => 
            attachment.name.toLowerCase().endsWith(ext)
        );

        if (!isImage) {
            return interaction.reply({ content: '❌ Please attach a valid image file (jpg, jpeg, png, gif, webp, bmp)!', ephemeral: true });
        }

        // Get optional message
        const customMessage = interaction.options.getString('message') || '';

        try {
            // Create embed for the image post
            const imageEmbed = new EmbedBuilder()
                .setColor('#4ecdc4')
                .setTitle('📸 Image Shared')
                .setImage(attachment.url)
                .addFields(
                    { name: 'Shared by', value: interaction.user.tag, inline: true },
                    { name: 'From channel', value: interaction.channel.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'GTA Neijas Moderator' });

            if (customMessage) {
                imageEmbed.setDescription(customMessage);
            }

            // Send image to target channel
            await targetChannel.send({ 
                embeds: [imageEmbed],
                files: [attachment.url]
            });

            // Confirm to user
            const confirmEmbed = new EmbedBuilder()
                .setColor('#4ecdc4')
                .setTitle('✅ Image Sent Successfully')
                .setDescription(`Image has been sent to ${targetChannel}`)
                .addFields(
                    { name: 'Image Name', value: attachment.name, inline: true },
                    { name: 'File Size', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'GTA Neijas Moderator' });

            if (customMessage) {
                confirmEmbed.addFields(
                    { name: 'Message', value: customMessage, inline: false }
                );
            }

            await interaction.reply({ embeds: [confirmEmbed] });

            // Log to mod channel if exists
            const modChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (modChannel && modChannel.id !== targetChannel.id) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#74b9ff')
                    .setTitle('📸 Image Forwarded')
                    .setDescription(`${interaction.user.tag} sent an image from ${interaction.channel} to ${targetChannel}`)
                    .addFields(
                        { name: 'Image Name', value: attachment.name, inline: true },
                        { name: 'File Size', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true }
                    )
                    .setTimestamp();

                if (customMessage) {
                    logEmbed.addFields(
                        { name: 'Message', value: customMessage, inline: false }
                    );
                }

                await modChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Error sending image:', error);
            
            let errorMessage = '❌ An error occurred while sending the image!';
            
            if (error.code === 50013) {
                errorMessage = `❌ I don't have permission to send messages or attach files in ${targetChannel}!`;
            } else if (error.code === 40005) {
                errorMessage = '❌ The file is too large! Discord has a file size limit.';
            } else if (error.code === 50035) {
                errorMessage = '❌ Invalid file format or the file is corrupted!';
            }
            
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
};