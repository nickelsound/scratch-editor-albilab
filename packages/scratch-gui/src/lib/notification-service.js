// Globální notification služba - nezávislá na React contextu
class NotificationService {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        // Vytvoř container pro notifikace
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    showNotification({ type = 'info', title, message, autoClose = true, duration = 5000 }) {
        const id = Date.now() + Math.random();
        const notification = document.createElement('div');
        notification.id = `notification-${id}`;
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            max-width: 400px;
            min-width: 300px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-left: 4px solid;
            margin-bottom: 10px;
            pointer-events: auto;
            animation: slideIn 0.3s ease-out;
            font-family: 'Helvetica Neue', Arial, sans-serif;
        `;

        // Nastav barvu podle typu
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        notification.style.borderLeftColor = colors[type] || colors.info;

        const icon = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; padding: 16px; gap: 12px;">
                <div style="
                    flex-shrink: 0;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                    color: white;
                    background-color: ${colors[type] || colors.info};
                ">
                    ${icon[type] || icon.info}
                </div>
                <div style="flex: 1; min-width: 0;">
                    ${title ? `<div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #333;">${title}</div>` : ''}
                    <div style="font-size: 13px; line-height: 1.4; color: #666; word-wrap: break-word;">${message}</div>
                </div>
                <button style="
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #999;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background-color 0.2s;
                " onclick="window.notificationService.hideNotification('${id}')" title="Zavřít">
                    ×
                </button>
            </div>
        `;

        this.container.appendChild(notification);

        // Auto-close
        if (autoClose) {
            setTimeout(() => {
                this.hideNotification(id);
            }, duration);
        }

        return id;
    }

    hideNotification(id) {
        const notification = document.getElementById(`notification-${id}`);
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    showSuccess(message, title = 'Úspěch') {
        return this.showNotification({ type: 'success', title, message });
    }

    showError(message, title = 'Chyba') {
        return this.showNotification({ type: 'error', title, message, autoClose: false });
    }

    showWarning(message, title = 'Upozornění') {
        return this.showNotification({ type: 'warning', title, message });
    }

    showInfo(message, title = 'Informace') {
        return this.showNotification({ type: 'info', title, message });
    }
}

// Přidej CSS animace
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Vytvoř globální instanci
window.notificationService = new NotificationService();

export default window.notificationService;
