const { PermissionsBitField } = require('discord.js');

// Required role IDs to use bot commands
const REQUIRED_ROLE_IDS = [
    '1375903718201102399',
    '1370607611598340096', 
    '1370607847896780931',
    '1370607445709160499'
];

/**
 * Check if a member has any of the required roles
 * @param {GuildMember} member - The guild member to check
 * @returns {boolean} - Whether the member has required roles
 */
function hasRequiredRoles(member) {
    // Check if member exists
    if (!member) {
        return false;
    }

    // Server owner always has access
    if (member.guild.ownerId === member.id) {
        return true;
    }

    // Check if member has administrator permission
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return true;
    }

    // Check if member has any of the required roles
    return REQUIRED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

/**
 * Check if a member has the required permissions
 * @param {GuildMember} member - The guild member to check
 * @param {BigInt} permission - The permission flag to check
 * @returns {boolean} - Whether the member has the permission
 */
function checkPermissions(member, permission) {
    // First check if member has required roles
    if (!hasRequiredRoles(member)) {
        return false;
    }

    // Check if member exists
    if (!member) {
        return false;
    }

    // Server owner always has permissions
    if (member.guild.ownerId === member.id) {
        return true;
    }

    // Check if member has administrator permission
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return true;
    }

    // Check specific permission
    return member.permissions.has(permission);
}

/**
 * Check if the bot has the required permissions in a guild
 * @param {Guild} guild - The guild to check permissions in
 * @param {BigInt} permission - The permission flag to check
 * @returns {boolean} - Whether the bot has the permission
 */
function checkBotPermissions(guild, permission) {
    const botMember = guild.members.me;
    
    if (!botMember) {
        return false;
    }

    return botMember.permissions.has(permission);
}

/**
 * Get missing permissions for a member
 * @param {GuildMember} member - The guild member to check
 * @param {Array<BigInt>} requiredPermissions - Array of required permission flags
 * @returns {Array<string>} - Array of missing permission names
 */
function getMissingPermissions(member, requiredPermissions) {
    if (!member) {
        return ['Member not found'];
    }

    // Server owner and administrators have all permissions
    if (member.guild.ownerId === member.id || 
        member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return [];
    }

    const missing = [];
    
    for (const permission of requiredPermissions) {
        if (!member.permissions.has(permission)) {
            // Convert permission flag to readable name
            const permissionName = Object.keys(PermissionsBitField.Flags)
                .find(key => PermissionsBitField.Flags[key] === permission);
            
            missing.push(permissionName || 'Unknown Permission');
        }
    }

    return missing;
}

/**
 * Check if a member can moderate another member
 * @param {GuildMember} moderator - The member performing the action
 * @param {GuildMember} target - The target member
 * @returns {boolean} - Whether the moderator can moderate the target
 */
function canModerate(moderator, target) {
    // Can't moderate yourself
    if (moderator.id === target.id) {
        return false;
    }

    // Server owner can moderate anyone except themselves
    if (moderator.guild.ownerId === moderator.id) {
        return true;
    }

    // Can't moderate the server owner
    if (target.guild.ownerId === target.id) {
        return false;
    }

    // Compare highest role positions
    const moderatorHighestRole = moderator.roles.highest;
    const targetHighestRole = target.roles.highest;

    return moderatorHighestRole.position > targetHighestRole.position;
}

/**
 * Format permissions into a readable string
 * @param {Array<string>} permissions - Array of permission names
 * @returns {string} - Formatted permission string
 */
function formatPermissions(permissions) {
    if (permissions.length === 0) {
        return 'None';
    }

    return permissions
        .map(perm => perm.replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()))
        .join(', ');
}

module.exports = {
    checkPermissions,
    checkBotPermissions,
    getMissingPermissions,
    canModerate,
    formatPermissions,
    hasRequiredRoles,
    REQUIRED_ROLE_IDS
};
