/**
 * Middleware de validation des données
 */

const Validators = require('../utils/validators');
const { AppError } = require('./errorHandler');

/**
 * Valide les champs requis
 */
function validateRequired(...fields) {
    return (req, res, next) => {
        const missing = [];

        fields.forEach(field => {
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                missing.push(field);
            }
        });

        if (missing.length > 0) {
            return res.status(400).json({
                error: `Champs requis manquants: ${missing.join(', ')}`,
                code: 'MISSING_FIELDS',
                fields: missing
            });
        }

        next();
    };
}

/**
 * Sanitize les données du body
 */
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = Validators.sanitizeString(req.body[key]);
            }
        });
    }
    next();
}

module.exports = {
    validateRequired,
    sanitizeBody
};
