module.exports = {
    // Bot configuration
    prefix: '!',
    botName: 'GTA Neijas Moderator',
    
    // Rich Presence Configuration
    presence: {
        gameName: 'Grand Theft Auto: Neijas',
        details: 'Grand Theft Auto: Neijas V1.0 Singleplayer',
        states: [
            'Walking in Downtown Crockton',
            'Driving an Infernus through Bottomtown San Concepcion',
            'Walking in Bartine University'
        ],
        bigImageKey: 'gta_neijas_logo',
        bigImageText: 'Armor: 0/100 Health: 100/100',
        smallImageKey: 'weapon_fist',
        smallImageText: 'Fist',
        rotationInterval: 180000 // 3 minutes in milliseconds
    },
    
    // Moderation settings
    moderation: {
        logChannelName: 'mod-logs',
        muteRoleName: 'Muted',
        maxWarnings: 3
    },
    
    // Permission levels
    permissions: {
        KICK_MEMBERS: 'KICK_MEMBERS',
        BAN_MEMBERS: 'BAN_MEMBERS',
        MANAGE_ROLES: 'MANAGE_ROLES',
        MANAGE_MESSAGES: 'MANAGE_MESSAGES'
    }
};
