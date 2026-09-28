/**
 * Système de logging structuré pour Pharmacie Émeraude
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

const LEVEL_PRIORITY = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor(config = {}) {
        this.level = config.level || 'INFO';
        this.logsDir = config.logsDir || path.join(__dirname, '../logs');
        this.ensureLogsDir();
    }

    ensureLogsDir() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    shouldLog(level) {
        return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.level];
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, data = {}) {
        return JSON.stringify({
            timestamp: this.formatTimestamp(),
            level,
            message,
            ...data
        });
    }

    writeToFile(level, message, data) {
        const filename = path.join(this.logsDir, `${level.toLowerCase()}.log`);
        const logEntry = this.formatMessage(level, message, data) + '\n';
        fs.appendFileSync(filename, logEntry);
    }

    log(level, message, data = {}) {
        if (!this.shouldLog(level)) return;

        const formattedMsg = this.formatMessage(level, message, data);
        console.log(formattedMsg);
        this.writeToFile(level, message, data);
    }

    error(message, error = null, data = {}) {
        this.log(LOG_LEVELS.ERROR, message, {
            ...data,
            ...(error && { error: error.message, stack: error.stack })
        });
    }

    warn(message, data = {}) {
        this.log(LOG_LEVELS.WARN, message, data);
    }

    info(message, data = {}) {
        this.log(LOG_LEVELS.INFO, message, data);
    }

    debug(message, data = {}) {
        this.log(LOG_LEVELS.DEBUG, message, data);
    }
}

module.exports = Logger;
