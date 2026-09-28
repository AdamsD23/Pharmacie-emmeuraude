/**
 * Middleware d'authentification JWT et contrôle des rôles
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db/mysql');

/**
 * Vérifie le token JWT et que le compte est toujours actif
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7);

    if (!token) {
        return res.status(401).json({ error: 'Connexion requise', code: 'NO_TOKEN' });
    }

    let payload;
    try {
        payload = jwt.verify(token, config.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Session expirée, reconnectez-vous', code: 'INVALID_TOKEN' });
    }

    try {
        // Le rôle et l'état actif sont relus en base : un compte désactivé perd l'accès immédiatement
        const users = await query('SELECT id, username, role, actif FROM users WHERE id = ?', [payload.id]);
        const user = users[0];
        if (!user || !user.actif) {
            return res.status(401).json({ error: 'Compte désactivé ou supprimé', code: 'ACCOUNT_DISABLED' });
        }
        req.user = { id: user.id, username: user.username, role: user.role };
        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Autorise uniquement certains rôles (l'admin a toujours accès)
 */
function authorizeRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Connexion requise', code: 'NOT_AUTHENTICATED' });
        }
        if (req.user.role !== 'admin' && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Action non autorisée pour votre rôle', code: 'FORBIDDEN' });
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRole
};
