"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const winston = require("winston");
const createLogger = () => {
    const logLevel = process.env.LOG_LEVEL || 'info';
    return winston.createLogger({
        level: logLevel,
        format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.splat(), winston.format.json()),
        defaultMeta: { service: 'ivr-agent' },
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
            }),
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
            }),
        ],
    });
};
exports.createLogger = createLogger;
//# sourceMappingURL=logger.util.js.map