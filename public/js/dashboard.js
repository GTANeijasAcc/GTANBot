// Dashboard JavaScript functionality

// Update stats periodically
function updateStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            // Update stat values
            document.querySelector('.stat-item:nth-child(1) .stat-value').textContent = data.guilds;
            document.querySelector('.stat-item:nth-child(2) .stat-value').textContent = data.users;
            document.querySelector('.stat-item:nth-child(3) .stat-value').textContent = data.channels;
            document.querySelector('.stat-item:nth-child(4) .stat-value').textContent = data.commands;
            document.querySelector('.stat-item:nth-child(5) .stat-value').textContent = data.ping + 'ms';
            document.querySelector('.stat-item:nth-child(6) .stat-value').textContent = Math.floor(data.uptime / 1000 / 60) + 'm';
            
            // Update status indicator
            const statusIndicator = document.querySelector('.status-indicator');
            const statusText = document.querySelector('.bot-status');
            if (data.status === 'Online') {
                statusIndicator.className = 'status-indicator online';
                statusText.childNodes[2].textContent = 'Online';
            } else {
                statusIndicator.className = 'status-indicator offline';
                statusText.childNodes[2].textContent = 'Offline';
            }
        })
        .catch(error => {
            console.error('Error updating stats:', error);
        });
}

// Set presence state
function setPresenceState(stateIndex) {
    // Add loading state
    const buttons = document.querySelectorAll('.state-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    fetch('/api/presence/state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stateIndex })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update active button
            buttons.forEach((btn, index) => {
                btn.classList.toggle('active', index === stateIndex);
                btn.disabled = false;
            });
            
            // Show success message
            showNotification('Presence state updated successfully!', 'success');
            
            // Reload page after short delay to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showNotification('Failed to update presence state: ' + data.error, 'error');
            buttons.forEach(btn => btn.disabled = false);
        }
    })
    .catch(error => {
        console.error('Error setting presence state:', error);
        showNotification('Network error occurred', 'error');
        buttons.forEach(btn => btn.disabled = false);
    });
}

// Show notification
function showNotification(message, type) {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background-color: #4CAF50;' : 'background-color: #f44336;'}
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Auto-refresh stats every 30 seconds
setInterval(updateStats, 30000);

// Show create command modal
function showCreateCommandModal() {
    document.getElementById('createCommandModal').style.display = 'block';
}

// Hide create command modal
function hideCreateCommandModal() {
    document.getElementById('createCommandModal').style.display = 'none';
    document.getElementById('createCommandForm').reset();
}

// Create new command
function createCommand(formData) {
    fetch('/api/commands/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Command created successfully!', 'success');
            hideCreateCommandModal();
            loadCommands(); // Refresh commands list
        } else {
            showNotification('Failed to create command: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error creating command:', error);
        showNotification('Network error occurred', 'error');
    });
}

// Delete command
function deleteCommand(commandName) {
    if (!confirm(`Are you sure you want to delete the command "${commandName}"?`)) {
        return;
    }

    fetch(`/api/commands/${commandName}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Command deleted successfully!', 'success');
            loadCommands(); // Refresh commands list
        } else {
            showNotification('Failed to delete command: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting command:', error);
        showNotification('Network error occurred', 'error');
    });
}

// Load commands list
function loadCommands() {
    fetch('/api/commands')
        .then(response => response.json())
        .then(commands => {
            const commandsList = document.getElementById('commandsList');
            
            // Clear existing commands except core ones
            const coreCommands = commandsList.querySelectorAll('.core-command');
            commandsList.innerHTML = '';
            coreCommands.forEach(cmd => commandsList.appendChild(cmd));
            
            // Add custom commands
            commands.forEach(command => {
                if (!['help', 'kick', 'ban', 'mute', 'warn'].includes(command.name)) {
                    const commandElement = document.createElement('div');
                    commandElement.className = 'command-item custom-command';
                    commandElement.innerHTML = `
                        <div class="command-info">
                            <strong>!${command.name}</strong> - ${command.description}
                        </div>
                        <div class="command-actions">
                            <span class="command-type">Custom</span>
                            <button onclick="deleteCommand('${command.name}')" class="delete-btn" title="Delete Command">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    commandsList.appendChild(commandElement);
                }
            });
        })
        .catch(error => {
            console.error('Error loading commands:', error);
        });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('GTA Neijas Bot Dashboard loaded');
    
    // Load commands on startup
    loadCommands();
    
    // Add click animations to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Handle create command form submission
    document.getElementById('createCommandForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('commandName').value.trim(),
            description: document.getElementById('commandDescription').value.trim(),
            usage: document.getElementById('commandUsage').value.trim(),
            response: document.getElementById('commandResponse').value.trim()
        };
        
        createCommand(formData);
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('createCommandModal');
        if (event.target === modal) {
            hideCreateCommandModal();
        }
    });
});