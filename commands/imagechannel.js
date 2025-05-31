const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ChannelSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { checkPermissions } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('imagechannel')
        .setDescription('Send an image to a channel using an interactive menu')
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
            // Create channel selection menu
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('select_channel')
                .setPlaceholder('Choose a channel to send the image to')
                .setChannelTypes([0]); // Text channels only

            const actionRow = new ActionRowBuilder()
                .addComponents(channelSelect);

            // Create preview embed
            const previewEmbed = new EmbedBuilder()
                .setColor('#74b9ff')
                .setTitle('📸 Select Channel for Image')
                .setDescription('Choose a channel from the dropdown menu below to send your image.')
                .addFields(
                    { name: 'Image Name', value: attachment.name, inline: true },
                    { name: 'File Size', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true },
                    { name: 'Sent by', value: interaction.user.tag, inline: true }
                )
                .setImage(attachment.url)
                .setTimestamp()
                .setFooter({ text: 'Select a channel within 60 seconds' });

            if (customMessage) {
                previewEmbed.addFields(
                    { name: 'Message', value: customMessage, inline: false }
                );
            }

            const response = await interaction.reply({ 
                embeds: [previewEmbed], 
                components: [actionRow] 
            });

            // Create collector for channel selection
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.ChannelSelect,
                time: 60000
            });

            collector.on('collect', async (selectInteraction) => {
                if (selectInteraction.user.id !== interaction.user.id) {
                    return selectInteraction.reply({ 
                        content: '❌ Only the command user can select a channel!', 
                        ephemeral: true 
                    });
                }

                const selectedChannel = selectInteraction.channels.first();

                // Check if bot has permissions in selected channel
                if (!selectedChannel.permissionsFor(interaction.guild.members.me).has([
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AttachFiles
                ])) {
                    return selectInteraction.reply({
                        content: `❌ I don't have permission to send messages or attach files in ${selectedChannel}!`,
                        ephemeral: true
                    });
                }

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

                    // Send image to selected channel
                    await selectedChannel.send({ 
                        embeds: [imageEmbed],
                        files: [attachment.url]
                    });

                    // Update the original message with success
                    const successEmbed = new EmbedBuilder()
                        .setColor('#4ecdc4')
                        .setTitle('✅ Image Sent Successfully')
                        .setDescription(`Image has been sent to ${selectedChannel}`)
                        .addFields(
                            { name: 'Image Name', value: attachment.name, inline: true },
                            { name: 'File Size', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'GTA Neijas Moderator' });

                    if (customMessage) {
                        successEmbed.addFields(
                            { name: 'Message', value: customMessage, inline: false }
                        );
                    }

                    await selectInteraction.update({ 
                        embeds: [successEmbed], 
                        components: [] 
                    });

                    // Log to mod channel if exists
                    const modChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
                    if (modChannel && modChannel.id !== selectedChannel.id) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#74b9ff')
                            .setTitle('📸 Image Forwarded via Menu')
                            .setDescription(`${interaction.user.tag} sent an image from ${interaction.channel} to ${selectedChannel}`)
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
                        errorMessage = `❌ I don't have permission to send messages or attach files in ${selectedChannel}!`;
                    } else if (error.code === 40005) {
                        errorMessage = '❌ The file is too large! Discord has a file size limit.';
                    } else if (error.code === 50035) {
                        errorMessage = '❌ Invalid file format or the file is corrupted!';
                    }
                    
                    await selectInteraction.reply({ content: errorMessage, ephemeral: true });
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    // Timeout - disable the select menu
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#ff6b6b')
                        .setTitle('⏰ Selection Timeout')
                        .setDescription('Channel selection timed out. Please run the command again.')
                        .setTimestamp();

                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            channelSelect.setDisabled(true).setPlaceholder('Selection timed out')
                        );

                    await response.edit({ 
                        embeds: [timeoutEmbed], 
                        components: [disabledRow] 
                    });
                }
            });

        } catch (error) {
            console.error('Error in imagechannel command:', error);
            await interaction.reply({ content: '❌ An error occurred while processing your request!', ephemeral: true });
        }
    }
};