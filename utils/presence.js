const { ActivityType } = require('discord.js');
const config = require('../config');

let currentStateIndex = 0;
let presenceInterval;

/**
 * Setup the custom rich presence for the bot
 * @param {Client} client - Discord client instance
 */
function setupPresence(client) {
    console.log('🎮 Setting up Grand Theft Auto: Neijas rich presence...');
    
    // Set initial presence
    updatePresence(client);
    
    // Start presence rotation
    presenceInterval = setInterval(() => {
        updatePresence(client);
    }, config.presence.rotationInterval);
    
    console.log(`✅ Rich presence setup complete! Rotating every ${config.presence.rotationInterval / 1000} seconds`);
}

/**
 * Update the bot's presence with rotating state
 * @param {Client} client - Discord client instance
 */
function updatePresence(client) {
    const { presence } = config;
    const currentState = presence.states[currentStateIndex];
    
    try {
        client.user.setPresence({
            activities: [{
                name: presence.gameName,
                type: ActivityType.Playing,
                details: presence.details,
                state: currentState,
                assets: {
                    large_image: presence.bigImageKey,
                    large_text: presence.bigImageText,
                    small_image: presence.smallImageKey,
                    small_text: presence.smallImageText
                },
                timestamps: {
                    start: Date.now()
                }
            }],
            status: 'online'
        });
        
        console.log(`🔄 Updated presence state: "${currentState}"`);
        
        // Move to next state
        currentStateIndex = (currentStateIndex + 1) % presence.states.length;
        
    } catch (error) {
        console.error('❌ Error updating presence:', error);
    }
}

/**
 * Stop presence rotation
 */
function stopPresenceRotation() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
        console.log('⏹️ Stopped presence rotation');
    }
}

/**
 * Manually set a specific presence state
 * @param {Client} client - Discord client instance
 * @param {number} stateIndex - Index of the state to set
 */
function setPresenceState(client, stateIndex) {
    const { presence } = config;
    
    if (stateIndex < 0 || stateIndex >= presence.states.length) {
        console.error('❌ Invalid state index');
        return;
    }
    
    currentStateIndex = stateIndex;
    updatePresence(client);
}

/**
 * Get current presence information
 * @returns {Object} - Current presence info
 */
function getCurrentPresenceInfo() {
    const { presence } = config;
    
    return {
        gameName: presence.gameName,
        details: presence.details,
        currentState: presence.states[currentStateIndex],
        stateIndex: currentStateIndex,
        totalStates: presence.states.length,
        rotationInterval: presence.rotationInterval
    };
}

module.exports = {
    setupPresence,
    updatePresence,
    stopPresenceRotation,
    setPresenceState,
    getCurrentPresenceInfo
};
