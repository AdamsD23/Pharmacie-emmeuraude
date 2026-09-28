/**
 * Middleware de gestion centralisée des erreurs
 */

const Logger = require('../utils/logger');
const logger = new Logger({ level: (process.env.LOG_LEVEL || 'info').toUpperCase() });

/**
 * Erreur métier avec un code HTTP et un message affichable
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

/**
 * Middleware de gestion des erreurs (DOIT être en dernier)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    // JSON mal formé envoyé par le client
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Requête invalide (JSON mal formé)', code: 'INVALID_JSON' });
    }

    if (err instanceof AppError) {
        if (err.statusCode >= 500) logger.error('Erreur application', err, { method: req.method, path: req.path });
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            ...(err.details && { details: err.details })
        });
    }

    // Contraintes MySQL (doublon, clé étrangère…)
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Cet élément existe déjà', code: 'DUPLICATE' });
    }
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(409).json({ error: 'Impossible : cet élément est utilisé ailleurs', code: 'IN_USE' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: 'Élément lié introuvable', code: 'INVALID_REFERENCE' });
    }

    // Erreur inattendue : on la journalise mais on n'expose jamais le détail technique
    logger.error('Erreur serveur', err, { method: req.method, path: req.path });
    res.status(500).json({ error: 'Erreur serveur interne', code: 'INTERNAL_ERROR' });
}

/**
 * Wrapper async pour les routes
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    errorHandler,
    asyncHandler
};
